// Каждый аудиоресурс в public/audio должен быть записан в assets/audio/LICENSES.md (CLAUDE.md, AUDIO §9).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const registry = readFileSync(join(root, 'assets/audio/LICENSES.md'), 'utf8');
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(root, p));
  }
};
walk(join(root, 'public/audio'));
const missing = files.filter((f) => !registry.includes(`\`${f}\``));
// Манифест должен ссылаться только на существующие файлы.
const broken = [];
for (const f of files.filter((x) => x.endsWith('manifest.json'))) {
  const dir = f.slice(0, f.lastIndexOf('/') + 1);
  const m = JSON.parse(readFileSync(join(root, f), 'utf8'));
  for (const [id, entry] of Object.entries(m.lines ?? {})) for (const file of Object.values(entry)) if (!files.includes(dir + file)) broken.push(`${id}: ${dir + file}`);
}
if (missing.length || broken.length) {
  if (missing.length) console.error('Нет записи о правах в assets/audio/LICENSES.md:\n  ' + missing.join('\n  '));
  if (broken.length) console.error('Манифест ссылается на отсутствующие файлы:\n  ' + broken.join('\n  '));
  process.exit(1);
}
console.log(`Аудио: ${files.length} файл(ов), права записаны.`);
