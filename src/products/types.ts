// Продукт — отдельная сборка для Яндекс Игр: свои название, иконка, сохранения и состав игр (docs/ARCHITECTURE.md §8).
// Конфиг — JSON, чтобы его читали и игра, и сборщик (vite.config.ts), и проверка состава (tools/check-bundle.mjs).

export interface ProductConfig {
  readonly id: string;
  readonly version: string;
  /** Тексты, которыми продукт заменяет общий словарь (например, app.title). */
  readonly strings: Readonly<Record<string, string>>;
  /** Ключ настроек в хранилище браузера. У «Игротеки» — прежний igroteka.settings. */
  readonly storageKey: string;
  /** Игры (папки src/games/<id>) и персонажи (src/characters/<id>), которые входят в сборку. */
  readonly games: readonly string[];
  readonly characters: readonly string[];
  /** Пути внутри public/, которые копируются в сборку; всё остальное из public/ в неё не попадает. */
  readonly publicAssets: readonly string[];
  /** current — действующая иконка; temporary — временная, до утверждения собственной. */
  readonly icon: { readonly file: string; readonly status: 'current' | 'temporary' | 'final' };
}

const ID = /^[a-z][a-z0-9-]*$/;

/** Проверка конфига: ошибка в нём должна ронять сборку, а не всплывать у игрока. */
export function parseProduct(raw: unknown): ProductConfig {
  const p = raw as Partial<ProductConfig> | null;
  const fail = (why: string): never => {
    throw new Error(`Конфиг продукта: ${why}`);
  };
  if (!p || typeof p !== 'object') return fail('не объект');
  if (typeof p.id !== 'string' || !ID.test(p.id)) fail('id');
  if (typeof p.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(p.version)) fail('version');
  if (typeof p.storageKey !== 'string' || !p.storageKey) fail('storageKey');
  const ids = (v: unknown, name: string) => (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && ID.test(x)) ? v : fail(name));
  ids(p.games, 'games');
  ids(p.characters, 'characters');
  if (!Array.isArray(p.publicAssets) || !p.publicAssets.every((x) => typeof x === 'string' && !x.startsWith('/') && !x.includes('..'))) fail('publicAssets');
  if (!p.strings || typeof p.strings !== 'object' || !Object.values(p.strings).every((x) => typeof x === 'string')) fail('strings');
  if (!p.icon || typeof p.icon.file !== 'string' || !['current', 'temporary', 'final'].includes(p.icon.status as string)) fail('icon');
  return p as ProductConfig;
}
