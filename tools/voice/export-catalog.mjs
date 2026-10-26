// Каталог реплик для генератора голоса: единственный источник текстов — src/characters/<персонаж>/lines.ts.
// Запуск: node tools/voice/export-catalog.mjs [--character matvey] [файл.json] (без файла — в stdout; по умолчанию agata).
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const at = args.indexOf('--character');
const character = at >= 0 ? args.splice(at, 2)[1] : 'agata';
const mod = await import(`../../src/characters/${character}/lines.ts`);
const lines = mod[`${character.toUpperCase()}_LINES`];
if (!lines) throw new Error(`нет каталога ${character.toUpperCase()}_LINES в src/characters/${character}/lines.ts`);
const json = JSON.stringify(lines.map(({ id, category, emotion, text, direction }) => ({ id, category, emotion, text, direction })), null, 2) + '\n';
const out = args[0];
if (out) writeFileSync(out, json);
else process.stdout.write(json);
