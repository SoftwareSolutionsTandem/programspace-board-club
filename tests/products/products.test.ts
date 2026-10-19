import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProduct } from '../../src/products/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY, type KeyValueStore } from '../../src/storage/settings';

const DIR = join(import.meta.dirname, '../../src/products');
const read = (id: string) => parseProduct(JSON.parse(readFileSync(join(DIR, `${id}.json`), 'utf8')));
const ids = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

describe('конфиги продуктов', () => {
  it('первый этап: «Игротека» и «Дурак»', () => expect(ids.sort()).toEqual(['durak', 'igroteka']));

  it('каждый конфиг корректен, id совпадает с именем файла, ключи сохранений разные', () => {
    const all = ids.map(read);
    for (const p of all) expect(ids).toContain(p.id);
    expect(all.map((p) => p.id)).toEqual(ids);
    expect(new Set(all.map((p) => p.storageKey)).size).toBe(all.length);
  });

  it('«Игротека»: прежний ключ настроек, общий словарь без замен — поведение не меняется', () => {
    const p = read('igroteka');
    expect(p.storageKey).toBe('igroteka.settings');
    expect(p.storageKey).toBe(SETTINGS_KEY);
    expect(p.strings).toEqual({});
  });

  it('игры и персонажи продукта существуют в исходниках', () => {
    for (const p of ids.map(read)) {
      for (const g of p.games) expect(readdirSync(join(DIR, '../games'))).toContain(g);
      for (const c of p.characters) expect(readdirSync(join(DIR, '../characters'))).toContain(c);
    }
  });

  it('ошибка в конфиге ловится при разборе', () => {
    expect(() => parseProduct({ ...read('durak'), games: [] })).toThrow(/games/);
    expect(() => parseProduct({ ...read('durak'), publicAssets: ['../secret'] })).toThrow(/publicAssets/);
  });
});

describe('ключ настроек продукта', () => {
  const memStore = (): KeyValueStore & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v) };
  };

  it('у каждого продукта свои настройки; без ключа — прежний igroteka.settings', () => {
    const s = memStore();
    saveSettings(s, { ...DEFAULT_SETTINGS, muted: true });
    expect([...s.data.keys()]).toEqual(['igroteka.settings']);
    saveSettings(s, { ...DEFAULT_SETTINGS, voiceVolume: 0.2 }, 'durak.settings');
    expect(loadSettings(s).muted).toBe(true);
    expect(loadSettings(s, 'durak.settings').voiceVolume).toBe(0.2);
    expect(loadSettings(s, 'durak.settings').muted).toBe(false);
  });
});
