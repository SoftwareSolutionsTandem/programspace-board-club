// Пользовательские настройки (docs/ARCHITECTURE.md §5): версия, миграции, безопасный сброс.
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface Settings {
  readonly version: 1;
  readonly masterVolume: number;
  readonly voiceVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  /** Субтитры — только опция доступности, по умолчанию выключены (AUDIO §1). */
  readonly subtitles: boolean;
  readonly difficulty: Difficulty;
  readonly reducedMotion: boolean;
  readonly tutorialDone: boolean;
  /** Знакомились ли уже с Агатой: первое или повторное приветствие. */
  readonly metAgata: boolean;
}

export const SETTINGS_VERSION = 1;
export const SETTINGS_KEY = 'igroteka.settings';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  masterVolume: 0.9,
  voiceVolume: 1,
  sfxVolume: 0.8,
  muted: false,
  subtitles: false,
  difficulty: 'normal',
  reducedMotion: false,
  tutorialDone: false,
  metAgata: false,
};

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const vol = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : d);
const bool = (x: unknown, d: boolean): boolean => (typeof x === 'boolean' ? x : d);
const diff = (x: unknown, d: Difficulty): Difficulty => (x === 'easy' || x === 'normal' || x === 'hard' ? x : d);

/** Миграции по версиям: vN → vN+1. Пока версия одна; новые версии добавляются сюда с тестом. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: (raw) => ({ ...raw, version: 1 }),
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
    version: 1,
    masterVolume: vol(obj.masterVolume, d.masterVolume),
    voiceVolume: vol(obj.voiceVolume, d.voiceVolume),
    sfxVolume: vol(obj.sfxVolume, d.sfxVolume),
    muted: bool(obj.muted, d.muted),
    subtitles: bool(obj.subtitles, d.subtitles),
    difficulty: diff(obj.difficulty, d.difficulty),
    reducedMotion: bool(obj.reducedMotion, d.reducedMotion),
    tutorialDone: bool(obj.tutorialDone, d.tutorialDone),
    metAgata: bool(obj.metAgata, d.metAgata),
  };
}

export function loadSettings(store: KeyValueStore): Settings {
  try {
    const text = store.get(SETTINGS_KEY);
    return text === null ? DEFAULT_SETTINGS : parseSettings(JSON.parse(text));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  try {
    store.set(SETTINGS_KEY, JSON.stringify(settings));
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
