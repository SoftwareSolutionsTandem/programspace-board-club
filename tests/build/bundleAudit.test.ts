import { describe, expect, it } from 'vitest';
import { auditBuild, type AuditInput } from '../../tools/bundle-audit.mjs';

// Синтетическая сборка «Дурака»: от неё отталкиваются все случаи нарушений.
const base = (): AuditInput => ({
  product: { id: 'durak', games: ['durak'], characters: ['agata'], publicAssets: ['audio/ru/agata'], strings: { 'app.title': 'Подкидной дурак' }, icon: { file: 'public/favicon.svg', status: 'current' } },
  report: {
    files: [
      { fileName: 'index.html', type: 'asset' },
      { fileName: 'favicon.svg', type: 'asset' },
      { fileName: 'assets/index.js', type: 'chunk', modules: ['src/main.ts', 'src/products/durak.json', 'src/games/durak/match.ts', 'src/characters/agata/lines.ts', 'src/characters/rig.ts'] },
      { fileName: 'audio/ru/agata/manifest.json', type: 'asset' },
      { fileName: 'audio/ru/agata/a.opus', type: 'asset' },
    ],
  },
  dist: new Map([
    ['index.html', 'h0'],
    ['favicon.svg', 'icon'],
    ['assets/index.js', 'h1'],
    ['audio/ru/agata/manifest.json', 'm'],
    ['audio/ru/agata/a.opus', 'o'],
  ]),
  publicFiles: new Map([
    ['favicon.svg', 'icon'],
    ['audio/ru/agata/manifest.json', 'm'],
    ['audio/ru/agata/a.opus', 'o'],
    ['audio/ru/boris/b.opus', 'x'],
  ]),
  iconHash: 'icon',
  licenses: '| `public/audio/ru/agata/manifest.json` |\n| `public/audio/ru/agata/a.opus` |',
  manifests: new Map([['audio/ru/agata', { lines: { a: { opus: 'a.opus' } } }]]),
  indexHtml: '<title>Подкидной дурак</title>',
  expectedTitle: 'Подкидной дурак',
});

const errorsOf = (patch: (a: AuditInput) => void) => {
  const a = base();
  patch(a);
  return auditBuild(a).errors;
};

describe('проверка состава сборки продукта', () => {
  it('корректная сборка — без ошибок; ресурсы других персонажей из public/ не требуются', () => {
    const r = auditBuild(base());
    expect(r.errors).toEqual([]);
    expect(r.games).toEqual(['durak']);
  });

  it('модуль чужой игры в чанке — ошибка', () => {
    expect(errorsOf((a) => a.report.files[2]!.modules!.push('src/games/chess/rules/engine.ts'))).toEqual([expect.stringContaining('чужой игры «chess»')]);
  });

  it('модуль чужого персонажа и конфиг другого продукта — ошибки', () => {
    const e = errorsOf((a) => a.report.files[2]!.modules!.push('src/characters/boris/lines.ts', 'src/products/igroteka.json'));
    expect(e).toEqual([expect.stringContaining('чужого персонажа «boris»'), expect.stringContaining('конфиг другого продукта')]);
  });

  it('игра продукта не вошла в сборку — ошибка', () => {
    expect(errorsOf((a) => (a.report.files[2]!.modules = ['src/main.ts', 'src/products/durak.json', 'src/characters/agata/lines.ts']))).toEqual([
      expect.stringContaining('игра «durak» указана в продукте'),
    ]);
  });

  it('посторонний файл в папке сборки и ресурс вне состава — ошибки', () => {
    const e = errorsOf((a) => a.dist.set('audio/ru/boris/b.opus', 'x'));
    expect(e).toContain('файл в сборке не от сборщика: audio/ru/boris/b.opus');
    expect(e).toContain('ресурс вне состава продукта: audio/ru/boris/b.opus');
  });

  it('потерянный или изменённый ресурс продукта — ошибка', () => {
    expect(errorsOf((a) => a.dist.set('audio/ru/agata/a.opus', 'другое'))).toEqual(['ресурс отличается от public/audio/ru/agata/a.opus']);
    expect(errorsOf((a) => a.publicFiles.set('audio/ru/agata/new.opus', 'n'))).toEqual(['ресурс продукта не попал в сборку: audio/ru/agata/new.opus']);
  });

  it('голос без записи о правах и манифест на несуществующий файл — ошибки', () => {
    expect(errorsOf((a) => (a.licenses = '| `public/audio/ru/agata/manifest.json` |'))).toEqual(['нет записи о правах: public/audio/ru/agata/a.opus']);
    expect(errorsOf((a) => (a.manifests = new Map([['audio/ru/agata', { lines: { b: { opus: 'b.opus' } } }]])))).toEqual(['манифест audio/ru/agata: b → нет файла b.opus']);
  });

  it('чужая иконка, неверный заголовок — ошибки; временная иконка — предупреждение', () => {
    expect(errorsOf((a) => (a.iconHash = 'другая'))).toEqual([expect.stringContaining('favicon.svg не совпадает')]);
    expect(errorsOf((a) => (a.indexHtml = '<title>Игротека</title>'))).toEqual(['заголовок страницы не «Подкидной дурак»']);
    const a = base();
    a.product.icon.status = 'temporary';
    expect(auditBuild(a).warnings).toEqual([expect.stringContaining('иконка временная')]);
  });
});
