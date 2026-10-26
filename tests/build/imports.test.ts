// Независимость продуктов на уровне исходников (docs/ARCHITECTURE.md §8): граф статических импортов.
// Дополняет аудит готовых сборок (tools/bundle-audit.mjs): тот ловит лишние модули в бандле,
// этот — лишние зависимости ещё до сборки, в том числе импорты только типов.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '../..');
const SRC = join(ROOT, 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|mjs|json)$/.test(f) ? [p] : [];
  });

const rel = (p: string) => relative(ROOT, p).split('\\').join('/');

/** Статические импорты и реэкспорты файла (включая `import type`); динамический `import()` не считается. */
export function staticImports(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/(?:^|[\s;])(?:import|export)\s[^'"`;]*?from\s*'([^']+)'/g)) out.push(m[1]!);
  for (const m of code.matchAll(/(?:^|[\s;])import\s*'([^']+)'/g)) out.push(m[1]!);
  return out;
}

function resolve(from: string, spec: string, aliases: Readonly<Record<string, string>>): string | null {
  if (aliases[spec]) return aliases[spec]!;
  if (!spec.startsWith('.')) return null; // пакеты (pixi.js, vitest) и виртуальные модули
  const base = join(dirname(from), spec);
  for (const p of [base, `${base}.ts`, `${base}.mjs`, join(base, 'index.ts')]) if (existsSync(p) && statSync(p).isFile()) return p;
  throw new Error(`${rel(from)}: не найден импорт '${spec}'`);
}

const FILES = walk(SRC);
const CODE = new Map(FILES.map((f) => [f, readFileSync(f, 'utf8')]));

/** Прямые зависимости файла внутри src (с псевдонимами продукта). */
function deps(file: string, aliases: Readonly<Record<string, string>> = {}): string[] {
  if (file.endsWith('.json')) return [];
  return staticImports(CODE.get(file) ?? readFileSync(file, 'utf8'))
    .map((s) => resolve(file, s, aliases))
    .filter((p): p is string => p !== null);
}

/** Все файлы, достижимые статическими импортами из entry. */
export function closure(entry: string, edges: (f: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    stack.push(...edges(f));
  }
  return seen;
}

/** Модули игр и персонажей, которых нет в составе продукта. */
export function foreignModules(files: Iterable<string>, games: readonly string[], characters: readonly string[]): string[] {
  const bad: string[] = [];
  for (const f of files) {
    const g = /^src\/games\/([^/]+)\//.exec(f)?.[1];
    const c = /^src\/characters\/([^/]+)\//.exec(f)?.[1];
    if ((g && !games.includes(g)) || (c && !characters.includes(c)) || f.startsWith('src/dev/')) bad.push(f);
  }
  return bad.sort();
}

const GAME_DIRS = readdirSync(join(SRC, 'games'));
const CHARACTER_DIRS = readdirSync(join(SRC, 'characters')).filter((d) => statSync(join(SRC, 'characters', d)).isDirectory());
const PRODUCTS = readdirSync(join(SRC, 'products'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ id: f.slice(0, -5), ...(JSON.parse(readFileSync(join(SRC, 'products', f), 'utf8')) as { games: string[]; characters: string[] }) }));

describe('продукты: статический граф импортов от src/main.ts', () => {
  for (const p of PRODUCTS) {
    it(`${p.id}: только свои игры и персонажи (${p.games.join(', ')}; ${p.characters.join(', ')})`, () => {
      const aliases = { '@product': join(SRC, `products/${p.id}.json`), '@product-games': join(SRC, `products/${p.id}.games.ts`) };
      const files = [...closure(join(SRC, 'main.ts'), (f) => deps(f, aliases))].map(rel);
      expect(foreignModules(files, p.games, p.characters)).toEqual([]);
      // Каждая игра продукта действительно доходит до сборки.
      for (const g of p.games) expect(files.some((f) => f.startsWith(`src/games/${g}/`))).toBe(true);
      for (const c of p.characters) expect(files.some((f) => f.startsWith(`src/characters/${c}/`))).toBe(true);
    });
  }

  it('отдельные продукты не пересекаются по модулям игр и персонажей', () => {
    const of = (id: string) => {
      const aliases = { '@product': join(SRC, `products/${id}.json`), '@product-games': join(SRC, `products/${id}.games.ts`) };
      return new Set([...closure(join(SRC, 'main.ts'), (f) => deps(f, aliases))].map(rel).filter((f) => /^src\/(games|characters\/[^/]+)\//.test(f)));
    };
    const single = ['durak', 'dominoes', 'chess', 'checkers'].map((id) => [id, of(id)] as const);
    for (const [a, fa] of single) for (const [b, fb] of single) if (a < b) expect([...fa].filter((f) => fb.has(f)), `${a} ∩ ${b}`).toEqual([]);
  });
});

describe('направление зависимостей', () => {
  const sharedFiles = FILES.map(rel).filter((f) => !/^src\/(games|products|dev)\//.test(f) && !/^src\/characters\/[^/]+\//.test(f) && f !== 'src/main.ts');

  it('общие модули не зависят от игр и конкретных персонажей', () => {
    const bad = sharedFiles.flatMap((f) =>
      deps(join(ROOT, f))
        .map(rel)
        .filter((d) => /^src\/(games|dev)\//.test(d) || /^src\/characters\/[^/]+\//.test(d))
        .map((d) => `${f} → ${d}`),
    );
    expect(bad).toEqual([]);
  });

  it('игра не импортирует другую игру; персонаж — другого персонажа и игры', () => {
    const bad: string[] = [];
    for (const f of FILES.map(rel)) {
      const g = /^src\/games\/([^/]+)\//.exec(f)?.[1];
      const c = /^src\/characters\/([^/]+)\//.exec(f)?.[1];
      for (const d of deps(join(ROOT, f)).map(rel)) {
        const dg = /^src\/games\/([^/]+)\//.exec(d)?.[1];
        const dc = /^src\/characters\/([^/]+)\//.exec(d)?.[1];
        if (g && dg && dg !== g) bad.push(`${f} → ${d}`);
        if (c && (dg || (dc && dc !== c))) bad.push(`${f} → ${d}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('домино не знает об Агате, подкидной — о Матвее', () => {
    const bad = FILES.map(rel).flatMap((f) =>
      deps(join(ROOT, f))
        .map(rel)
        .filter((d) => (f.startsWith('src/games/dominoes/') && /^src\/(games\/durak|characters\/agata)\//.test(d)) || (f.startsWith('src/games/durak/') && /^src\/(games\/dominoes|characters\/matvey)\//.test(d)))
        .map((d) => `${f} → ${d}`),
    );
    expect(bad).toEqual([]);
  });

  it('правила, ИИ и контроллер матча не знают о сцене, персонаже, анимации и звуке', () => {
    const core = (f: string) => /^src\/games\/[^/]+\/(rules\/|ai\/|match\.ts|sim\.ts|view\.ts)/.test(f) || f === 'src/board/match.ts';
    const bad: string[] = [];
    for (const f of FILES.map(rel).filter(core)) {
      const code = CODE.get(join(ROOT, f))!;
      if (/from '(pixi\.js|@pixi\/)/.test(code)) bad.push(`${f} → pixi`);
      // Только свои правила, вид и ИИ — и общий ГСЧ.
      for (const d of deps(join(ROOT, f)).map(rel)) if (!core(d) && d !== 'src/core/rng.ts') bad.push(`${f} → ${d}`);
    }
    expect(bad).toEqual([]);
  });

  it('каталоги игр и персонажей на месте (проверки выше не пусты)', () => {
    expect(GAME_DIRS).toEqual(expect.arrayContaining(['durak', 'dominoes', 'chess', 'checkers']));
    expect(CHARACTER_DIRS).toEqual(expect.arrayContaining(['agata', 'matvey', 'khariton', 'kostyan']));
  });
});

describe('проверка ловит случайное включение чужих модулей', () => {
  it('разбор импортов: статические и type-импорты считаются, динамические — нет', () => {
    const code = "import { a } from './a';\nimport type { B } from './b';\nexport { c } from './c';\nimport './d';\nconst e = import('./e');";
    expect(staticImports(code)).toEqual(['./a', './b', './c', './d']);
  });

  it('чужая игра или персонаж в графе продукта — ошибка', () => {
    const graph: Record<string, string[]> = {
      'src/main.ts': ['src/products/dominoes.games.ts'],
      'src/products/dominoes.games.ts': ['src/games/dominoes/module.ts'],
      'src/games/dominoes/module.ts': ['src/characters/matvey/lines.ts', 'src/characters/agata/lines.ts'],
      'src/characters/agata/lines.ts': ['src/games/durak/rules/cards.ts'],
    };
    const files = closure('src/main.ts', (f) => graph[f] ?? []);
    expect(foreignModules(files, ['dominoes'], ['matvey'])).toEqual(['src/characters/agata/lines.ts', 'src/games/durak/rules/cards.ts']);
    expect(foreignModules(['src/dev/matveyLab.ts'], ['dominoes'], ['matvey'])).toEqual(['src/dev/matveyLab.ts']);
  });
});
