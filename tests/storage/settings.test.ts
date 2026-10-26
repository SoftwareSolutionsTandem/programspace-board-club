import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings, SETTINGS_KEY, type KeyValueStore } from '../../src/storage/settings';

const memStore = (init: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map(Object.entries(init));
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
};

describe('настройки', () => {
  it('без сохранений — значения по умолчанию', () => expect(loadSettings(memStore())).toEqual(DEFAULT_SETTINGS));
  it('сохранение и загрузка', () => {
    const s = memStore();
    const mine = { ...DEFAULT_SETTINGS, muted: true, voiceVolume: 0.3, difficulty: 'hard' as const, tutorialDone: true };
    expect(saveSettings(s, mine)).toBe(true);
    expect(loadSettings(s)).toEqual(mine);
  });
  it('повреждённый JSON — безопасный сброс', () => expect(loadSettings(memStore({ [SETTINGS_KEY]: '{нет' }))).toEqual(DEFAULT_SETTINGS));
  it('неверные поля заменяются, громкость ограничивается 0…1', () => {
    const s = parseSettings({ version: 1, masterVolume: 7, voiceVolume: -1, sfxVolume: 'громко', muted: 'да', difficulty: 'бог' });
    expect(s.masterVolume).toBe(1);
    expect(s.voiceVolume).toBe(0);
    expect(s.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
    expect(s.muted).toBe(false);
    expect(s.difficulty).toBe('normal');
  });
  it('миграция с версии 0 (без поля version) сохраняет известные значения', () => {
    expect(parseSettings({ muted: true, subtitles: true })).toMatchObject({ version: 3, muted: true, subtitles: true });
  });
  it('миграция с версии 1: прогресс дурака сохраняется, домино начинается с обучения', () => {
    const v1 = { version: 1, masterVolume: 0.5, voiceVolume: 0.7, sfxVolume: 0.2, muted: false, subtitles: true, difficulty: 'hard', reducedMotion: true, tutorialDone: true, metAgata: true };
    expect(parseSettings(v1)).toEqual({ ...v1, version: 3, dominoesTutorialDone: false, metMatvey: false, chessTutorialDone: false, checkersTutorialDone: false, metKhariton: false, metKostyan: false });
    // Сохранённое после миграции читается без изменений.
    const s = memStore();
    saveSettings(s, parseSettings(v1));
    expect(loadSettings(s)).toEqual(parseSettings(v1));
  });
  it('миграция с версии 2: прогресс дурака и домино сохраняется, шахматы и шашки начинаются с обучения', () => {
    const v2 = { version: 2, masterVolume: 0.4, voiceVolume: 0.6, sfxVolume: 0.3, muted: true, subtitles: false, difficulty: 'easy', reducedMotion: false, tutorialDone: true, metAgata: true, dominoesTutorialDone: true, metMatvey: true };
    expect(parseSettings(v2)).toEqual({ ...v2, version: 3, chessTutorialDone: false, checkersTutorialDone: false, metKhariton: false, metKostyan: false });
    const s = memStore();
    saveSettings(s, parseSettings(v2));
    expect(loadSettings(s)).toEqual(parseSettings(v2));
  });
  it('версия из будущего — значения по умолчанию', () => expect(parseSettings({ version: 99, muted: true })).toEqual(DEFAULT_SETTINGS));
  it('недоступное хранилище не роняет игру', () => {
    const broken: KeyValueStore = { get: () => { throw new Error('denied'); }, set: () => { throw new Error('quota'); } };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(broken, DEFAULT_SETTINGS)).toBe(false);
  });
});
