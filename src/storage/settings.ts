// Пользовательские настройки (docs/ARCHITECTURE.md §5): версия, миграции, безопасный сброс.
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Settings {
  readonly version: 3;
  readonly masterVolume: number;
  readonly voiceVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  /** Субтитры — только опция доступности, по умолчанию выключены (AUDIO §1). */
  readonly subtitles: boolean;
  readonly difficulty: Difficulty;
  readonly reducedMotion: boolean;
  /** Обучение подкидному пройдено. */
  readonly tutorialDone: boolean;
  /** Знакомились ли уже с Агатой: первое или повторное приветствие. */
  readonly metAgata: boolean;
  /** Обучение домино пройдено (с версии 2). */
  readonly dominoesTutorialDone: boolean;
  /** Знакомились ли уже с Дедом Матвеем (с версии 2). */
  readonly metMatvey: boolean;
  /** Обучение шахматам и шашкам пройдено (с версии 3). */
  readonly chessTutorialDone: boolean;
  readonly checkersTutorialDone: boolean;
  /** Знакомились ли уже с Харитоном и Костяном (с версии 3). */
  readonly metKhariton: boolean;
  readonly metKostyan: boolean;
}

export const SETTINGS_VERSION = 3;
export const SETTINGS_KEY = 'igroteka.settings';

export const DEFAULT_SETTINGS: Settings = {
  version: 3,
  masterVolume: 0.9,
  voiceVolume: 1,
  sfxVolume: 0.8,
  muted: false,
  subtitles: false,
  difficulty: 'normal',
  reducedMotion: false,
  tutorialDone: false,
  metAgata: false,
  dominoesTutorialDone: false,
  metMatvey: false,
  chessTutorialDone: false,
  checkersTutorialDone: false,
  metKhariton: false,
  metKostyan: false,
};

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const vol = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
const bool = (x: unknown, d: boolean): boolean => (typeof x === 'boolean' ? x : d);
const diff = (x: unknown, d: Difficulty): Difficulty => (x === 'easy' || x === 'normal' || x === 'hard' ? x : d);

/** Миграции по версиям: vN → vN+1; каждая — с тестом. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: (raw) => ({ ...raw, version: 1 }),
  // v2: домино и Дед Матвей — обучение не пройдено, знакомства не было; остальное без изменений.
  1: (raw) => ({ ...raw, version: 2, dominoesTutorialDone: false, metMatvey: false }),
  // v3: шахматы с Харитоном и шашки с Костяном — обучение не пройдено, знакомства не было.
  2: (raw) => ({ ...raw, version: 3, chessTutorialDone: false, checkersTutorialDone: false, metKhariton: false, metKostyan: false }),
};

/** Разбор сохранённых данных; повреждённые и неизвестные поля заменяются значениями по умолчанию. */
export function parseSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  let obj = raw as Record<string, unknown>;
  let version = typeof obj.version === 'number' ? obj.version : 0;
  if (version > SETTINGS_VERSION) return DEFAULT_SETTINGS;
  while (version < SETTINGS_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return DEFAULT_SETTINGS;
    obj = step(obj);
    version += 1;
  }
  const d = DEFAULT_SETTINGS;
  return {
    version: 3,
    masterVolume: vol(obj.masterVolume, d.masterVolume),
    voiceVolume: vol(obj.voiceVolume, d.voiceVolume),
    sfxVolume: vol(obj.sfxVolume, d.sfxVolume),
    muted: bool(obj.muted, d.muted),
    subtitles: bool(obj.subtitles, d.subtitles),
    difficulty: diff(obj.difficulty, d.difficulty),
    reducedMotion: bool(obj.reducedMotion, d.reducedMotion),
    tutorialDone: bool(obj.tutorialDone, d.tutorialDone),
    metAgata: bool(obj.metAgata, d.metAgata),
    dominoesTutorialDone: bool(obj.dominoesTutorialDone, d.dominoesTutorialDone),
    metMatvey: bool(obj.metMatvey, d.metMatvey),
    chessTutorialDone: bool(obj.chessTutorialDone, d.chessTutorialDone),
    checkersTutorialDone: bool(obj.checkersTutorialDone, d.checkersTutorialDone),
    metKhariton: bool(obj.metKhariton, d.metKhariton),
    metKostyan: bool(obj.metKostyan, d.metKostyan),
  };
}

/** key — ключ продукта (src/products); по умолчанию — ключ «Игротеки». */
export function loadSettings(store: KeyValueStore, key: string = SETTINGS_KEY): Settings {
  try {
    const text = store.get(key);
    return text === null ? DEFAULT_SETTINGS : parseSettings(JSON.parse(text));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings, key: string = SETTINGS_KEY): boolean {
  try {
    store.set(key, JSON.stringify(settings));
    return true;
  } catch {
    // Хранилище недоступно (приватный режим, квота) — игра продолжает работу с текущими настройками.
    return false;
  }
}

/** Хранилище браузера с защитой от исключений; без localStorage — в памяти. */
export function browserStore(): KeyValueStore {
  const memory = new Map<string, string>();
  return {
    get(key) {
      try {
        return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
      } catch {
        return memory.get(key) ?? null;
      }
    },
    set(key, value) {
      memory.set(key, value);
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* только память */
      }
    },
  };
}
