import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkVoiceManifest } from '../../src/audio/manifestCheck';
import type { VoiceManifest } from '../../src/audio/engine';
import { AGATA_LINES } from '../../src/characters/agata/lines';

const DIR = join(__dirname, '../../public/audio/ru/agata');
const read = (): { manifest: VoiceManifest; files: string[] } => ({
  manifest: JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8')) as VoiceManifest,
  files: readdirSync(DIR).filter((f) => f !== 'manifest.json'),
});

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

  it('репозиторий: манифест Агаты согласован с каталогом реплик и файлами', () => {
    const { manifest, files } = read();
    const r = checkVoiceManifest(AGATA_LINES.map((l) => l.id), manifest, files);
    expect(r.unknownIds, 'id в манифесте нет в каталоге').toEqual([]);
    expect(r.missingFiles, 'манифест ссылается на отсутствующие файлы').toEqual([]);
    expect(r.incomplete, 'у реплики нет Opus или AAC').toEqual([]);
    expect(r.orphanFiles, 'аудиофайлы вне манифеста').toEqual([]);
  });

  it('репозиторий: каждый файл голоса — настоящий контейнер Opus/AAC со звуком, а не пустышка', () => {
    const { manifest } = read();
    for (const [id, e] of Object.entries(manifest.lines)) {
      const opus = readFileSync(join(DIR, e.opus!));
      const m4a = readFileSync(join(DIR, e.m4a!));
      expect(opus.subarray(0, 4).toString('latin1'), id).toBe('OggS');
      expect(opus.includes(Buffer.from('OpusHead')), id).toBe(true);
      expect(m4a.subarray(4, 8).toString('latin1'), id).toBe('ftyp');
      // Даже короткое «Ах!» после кодирования больше 2 КБ; пустые и обрезанные файлы сюда не пройдут.
      expect(opus.length, id).toBeGreaterThan(2048);
      expect(m4a.length, id).toBeGreaterThan(2048);
    }
  });
});
