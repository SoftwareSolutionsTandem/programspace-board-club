// Сверка голосового манифеста с каталогом реплик и файлами на диске (docs/AUDIO.md §14).
// Чистая функция: используется тестами и инструментами, в браузере не нужна.
import type { VoiceManifest } from './engine';

export interface ManifestIssues {
  /** В манифесте есть id, которого нет в каталоге (опечатка или удалённая реплика). */
  readonly unknownIds: string[];
  /** Манифест ссылается на файл, которого нет. */
  readonly missingFiles: string[];
  /** У реплики в манифесте нет одного из форматов (Opus для Chrome/Firefox, AAC для Safari). */
  readonly incomplete: string[];
  /** Аудиофайл лежит в папке, но манифест о нём не знает. */
  readonly orphanFiles: string[];
  /** Реплики каталога без голоса (допустимо до полной озвучки; список — для отчёта). */
  readonly unvoiced: string[];
}

export function checkVoiceManifest(catalogIds: readonly string[], manifest: VoiceManifest, files: readonly string[]): ManifestIssues {
  const catalog = new Set(catalogIds);
  const onDisk = new Set(files);
  const referenced = new Set<string>();
  const unknownIds: string[] = [];
  const missingFiles: string[] = [];
  const incomplete: string[] = [];
  for (const [id, entry] of Object.entries(manifest.lines)) {
    if (!catalog.has(id)) unknownIds.push(id);
    if (!entry.opus || !entry.m4a) incomplete.push(id);
    for (const f of [entry.opus, entry.m4a]) {
      if (!f) continue;
      referenced.add(f);
      if (!onDisk.has(f)) missingFiles.push(f);
    }
  }
  const orphanFiles = files.filter((f) => /\.(opus|m4a|ogg|mp3|wav|webm)$/i.test(f) && !referenced.has(f));
  const unvoiced = catalogIds.filter((id) => !manifest.lines[id]);
  return { unknownIds, missingFiles, incomplete, orphanFiles, unvoiced };
}
