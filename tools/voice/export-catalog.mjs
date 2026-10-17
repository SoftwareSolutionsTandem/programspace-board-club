// Каталог реплик для генератора голоса: единственный источник текстов — src/characters/agata/lines.ts.
// Запуск: node tools/voice/export-catalog.mjs [файл.json] (без аргумента — в stdout).
import { writeFileSync } from 'node:fs';

const { AGATA_LINES } = await import('../../src/characters/agata/lines.ts');
const json = JSON.stringify(AGATA_LINES.map(({ id, category, emotion, text, direction }) => ({ id, category, emotion, text, direction })), null, 2) + '\n';
const out = process.argv[2];
if (out) writeFileSync(out, json);
else process.stdout.write(json);
