// Проверка состава собранных продуктов: node tools/check-bundle.mjs igroteka durak
// Перед запуском: npm run build:all. Правила — tools/bundle-audit.mjs, docs/ARCHITECTURE.md §8.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditBuild } from './bundle-audit.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const walk = (dir) => (statSync(dir).isDirectory() ? readdirSync(dir).flatMap((n) => walk(join(dir, n))) : [dir]);
// Пути — с прямой косой чертой, как в отчёте сборщика (и на Windows).
const hashes = (dir) => new Map(walk(dir).map((f) => [relative(dir, f).split(sep).join('/'), sha(f)]));

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('Укажите продукты: node tools/check-bundle.mjs igroteka durak');
  process.exit(2);
}
const ru = JSON.parse(readFileSync(join(root, 'src/i18n/ru.json'), 'utf8'));
const licenses = readFileSync(join(root, 'assets/audio/LICENSES.md'), 'utf8');
const publicFiles = hashes(join(root, 'public'));
let failed = false;

for (const id of ids) {
  const product = JSON.parse(readFileSync(join(root, 'src/products', `${id}.json`), 'utf8'));
  const outDir = join(root, 'dist', id);
  const reportPath = join(root, 'dist', `${id}.build.json`);
  if (!existsSync(outDir) || !existsSync(reportPath)) {
    console.error(`[${id}] нет сборки или отчёта сборщика — сначала npm run build:${id}`);
    failed = true;
    continue;
  }
  const dist = hashes(outDir);
  const manifests = new Map(
    [...dist.keys()].filter((f) => f.endsWith('/manifest.json') && f.startsWith('audio/')).map((f) => [f.slice(0, f.lastIndexOf('/')), JSON.parse(readFileSync(join(outDir, f), 'utf8'))]),
  );
  const r = auditBuild({
    product,
    report: JSON.parse(readFileSync(reportPath, 'utf8')),
    dist,
    publicFiles,
    iconHash: sha(join(root, product.icon.file)),
    licenses,
    manifests,
    indexHtml: readFileSync(join(outDir, 'index.html'), 'utf8'),
    expectedTitle: product.strings['app.title'] ?? ru['app.title'],
  });
  const bytes = [...dist.keys()].filter((f) => !f.endsWith('.map')).reduce((s, f) => s + statSync(join(outDir, f)).size, 0);
  const audio = [...dist.keys()].filter((f) => f.startsWith('audio/')).length;
  console.log(`[${id}] модулей ${r.modules}; игры: ${r.games.join(', ')}; персонажи: ${r.characters.join(', ')}; файлов ${dist.size} (голос ${audio}); размер без карт кода ${(bytes / 1024 / 1024).toFixed(2)} МБ`);
  for (const w of r.warnings) console.log(`[${id}] предупреждение: ${w}`);
  for (const e of r.errors) console.error(`[${id}] ОШИБКА: ${e}`);
  if (r.errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
