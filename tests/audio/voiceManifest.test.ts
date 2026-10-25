import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkVoiceManifest } from '../../src/audio/manifestCheck';
import type { VoiceManifest } from '../../src/audio/engine';
import { AGATA_LINES } from '../../src/characters/agata/lines';
import { MATVEY_LINES } from '../../src/characters/matvey/lines';
import type { VoiceLine } from '../../src/characters/types';

const ROOT = join(__dirname, '../..');
const dirOf = (character: string) => join(ROOT, 'public/audio/ru', character);
const read = (character: string): { manifest: VoiceManifest; files: string[] } => ({
  manifest: JSON.parse(readFileSync(join(dirOf(character), 'manifest.json'), 'utf8')) as VoiceManifest,
  files: readdirSync(dirOf(character)).filter((f) => f !== 'manifest.json'),
});
// Голоса персонажей — у каждого своя папка, свой манифест и свой каталог (данные не смешиваются).
const VOICES: readonly { name: string; character: string; lines: readonly VoiceLine[] }[] = [
  { name: 'Агаты', character: 'agata', lines: AGATA_LINES },
  { name: 'Матвея', character: 'matvey', lines: MATVEY_LINES },
];

describe('голосовой манифест: сверка с каталогом', () => {
  it('ловит неизвестные id, отсутствующие файлы, неполные записи и файлы-сироты', () => {
    const r = checkVoiceManifest(
      ['a', 'b', 'c'],
      { lines: { a: { opus: 'a.opus', m4a: 'a.m4a' }, b: { opus: 'b.opus' }, x: { opus: 'x.opus', m4a: 'x.m4a' } } },
      ['a.opus', 'a.m4a', 'b.opus', 'x.opus', 'stray.opus', 'notes.txt'],
    );
    expect(r.unknownIds).toEqual(['x']);
    expect(r.missingFiles).toEqual(['x.m4a']);
    expect(r.incomplete).toEqual(['b']);
    expect(r.orphanFiles).toEqual(['stray.opus']);
    expect(r.unvoiced).toEqual(['c']);
  });

  it('полный и согласованный манифест — без замечаний', () => {
    const r = checkVoiceManifest(['a'], { lines: { a: { opus: 'a.opus', m4a: 'a.m4a' } } }, ['a.opus', 'a.m4a']);
    expect(r).toEqual({ unknownIds: [], missingFiles: [], incomplete: [], orphanFiles: [], unvoiced: [] });
  });

  for (const { name, character, lines } of VOICES) {
    it(`репозиторий: манифест ${name} согласован с каталогом реплик и файлами`, () => {
      const { manifest, files } = read(character);
      const r = checkVoiceManifest(lines.map((l) => l.id), manifest, files);
      expect(r.unknownIds, 'id в манифесте нет в каталоге').toEqual([]);
      expect(r.missingFiles, 'манифест ссылается на отсутствующие файлы').toEqual([]);
      expect(r.incomplete, 'у реплики нет Opus или AAC').toEqual([]);
      expect(r.orphanFiles, 'аудиофайлы вне манифеста').toEqual([]);
      // Каждая запись лежит в своей папке и названа своим id: чужих реплик (например, Агаты под id Матвея) нет.
      for (const [id, e] of Object.entries(manifest.lines)) {
        expect(id.startsWith(`${character}_`), id).toBe(true);
        expect([e.opus, e.m4a], id).toEqual([`${id}.opus`, `${id}.m4a`]);
      }
    });

    it(`репозиторий: каждый файл голоса ${name} — настоящий контейнер Opus/AAC со звуком, а не пустышка`, () => {
      const { manifest } = read(character);
      for (const [id, e] of Object.entries(manifest.lines)) {
        const opus = readFileSync(join(dirOf(character), e.opus!));
        const m4a = readFileSync(join(dirOf(character), e.m4a!));
        expect(opus.subarray(0, 4).toString('latin1'), id).toBe('OggS');
        expect(opus.includes(Buffer.from('OpusHead')), id).toBe(true);
        expect(m4a.subarray(4, 8).toString('latin1'), id).toBe('ftyp');
        // Самая короткая реплика — смешок Матвея «Хе-хе» (0,54 с) — после кодирования ≈ 2 КБ; пустые и обрезанные
        // файлы (заголовок без звука — сотни байт) сюда не пройдут.
        expect(opus.length, id).toBeGreaterThan(1536);
        expect(m4a.length, id).toBeGreaterThan(1536);
      }
    });
  }

  it('голос Матвея: у каждой реплики — исходник владельца с метаданными; хэш совпадает, текст — из каталога', () => {
    const src = join(ROOT, 'assets-src/audio/ru/matvey');
    const { manifest } = read('matvey');
    expect(Object.keys(manifest.lines).sort()).toEqual(MATVEY_LINES.map((l) => l.id).sort());
    expect((manifest as { voice?: { synthetic?: boolean } }).voice?.synthetic).toBe(false);
    for (const l of MATVEY_LINES) {
      const flac = join(src, `${l.id}.flac`);
      expect(existsSync(flac), l.id).toBe(true);
      const meta = JSON.parse(readFileSync(join(src, `${l.id}.json`), 'utf8')) as { id: string; text: string; sha256: string };
      expect(meta.id).toBe(l.id);
      expect(meta.text, l.id).toBe(l.text);
      expect(createHash('sha256').update(readFileSync(flac)).digest('hex'), l.id).toBe(meta.sha256);
    }
  });

  it('голос Матвея — только в продуктах с Матвеем; у «Дурака» его нет', () => {
    for (const f of readdirSync(join(ROOT, 'src/products')).filter((x) => x.endsWith('.json'))) {
      const p = JSON.parse(readFileSync(join(ROOT, 'src/products', f), 'utf8')) as { id: string; characters: string[]; publicAssets: string[] };
      // Голос в продукте — только голос его персонажей.
      for (const a of p.publicAssets.filter((x) => x.startsWith('audio/'))) expect(p.characters, `${p.id}: ${a}`).toContain(a.split('/').pop());
      expect(p.publicAssets.includes('audio/ru/matvey'), p.id).toBe(p.characters.includes('matvey'));
    }
  });
});
