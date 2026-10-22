// Сборка голоса персонажа: FLAC-исходники → обрезка тишины → громкость → Opus и AAC → манифест, права, отчёт.
// docs/AUDIO.md §8, §14. Нужен ffmpeg с libopus. Модель синтеза здесь не участвует.
//
//   node tools/audio/build-voice.mjs                 # весь каталог Агаты в public/audio/ru/agata
//   node tools/audio/build-voice.mjs --only agata_win_01
//   node tools/audio/build-voice.mjs --src <папка> --out <папка> --no-manifest   # пробы для прослушивания
//   node tools/audio/build-voice.mjs --src <папка> --out <папка> --no-manifest --report-dir <папка>   # предпрослушивание, отчёт вне репозитория
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? def : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(name);

const cfg = JSON.parse(readFileSync(join(root, 'tools/voice/agata.voice.json'), 'utf8'));
const src = arg('--src', join(root, 'assets-src/audio', cfg.lang, cfg.character));
const out = arg('--out', join(root, 'public/audio', cfg.lang, cfg.character));
const only = arg('--only', '')?.split(',').filter(Boolean) ?? [];
const writeManifest = !flag('--no-manifest');

// Целевые параметры (§8.1): громкость −16 LUFS, пик −1,5 dBTP; голос моно.
export const TARGET = { lufs: -16, truePeak: -1.5, lra: 11, opusKbps: 32, aacKbps: 48 };

const { AGATA_LINES } = await import('../../src/characters/agata/lines.ts');
const catalog = new Map(AGATA_LINES.map((l) => [l.id, l]));

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
// Замеры ffmpeg печатает в stderr — читаем его и при успешном завершении.
const ffStderr = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr ?? '').trim().split('\n').pop()}`);
  return r.stderr;
};
const probeDuration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

// Обрезка тишины по краям (порог −50 дБ), затем короткие поля, чтобы не съесть атаку и хвост.
// Края — с плавным входом 5 мс и выходом 8 мс: живая запись, нарезанная вплотную к звуку, иначе щёлкает.
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,afade=t=in:d=0.008,areverse,afade=t=in:d=0.005';

function measure(file, loops = 0) {
  const input = loops ? ['-stream_loop', String(loops), '-i', file] : ['-i', file];
  const err = ffStderr([...input, '-af', `${TRIM},loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=${TARGET.lra}:print_format=json`, '-f', 'null', '-']);
  const json = err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

function volume(file) {
  const err = ffStderr(['-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const num = (re) => Number(err.match(re)?.[1] ?? NaN);
  return { mean: num(/mean_volume: (-?[\d.]+) dB/), max: num(/max_volume: (-?[\d.]+) dB/) };
}

function buildOne(id, flac, tmp) {
  const warnings = [];
  const m = measure(flac);
  const norm = join(tmp, `${id}.wav`);
  const tail = 'aresample=48000,adelay=40:all=1,apad=pad_dur=0.12';
  let gain;
  if (Number.isFinite(Number(m.input_i))) {
    gain = `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=${TARGET.lra}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  } else {
    // Реплика короче окна измерения громкости (≈0,4 с после обрезки): меряем её, повторённую 5 раз, —
    // громкость повтора равна громкости реплики. Усиление постоянное, с запасом по пику.
    const r = measure(flac, 4);
    const db = Math.min(TARGET.lufs - Number(r.input_i), TARGET.truePeak - Number(r.input_tp));
    if (!Number.isFinite(db)) throw new Error('не удалось измерить громкость');
    gain = `volume=${db.toFixed(2)}dB`;
    warnings.push('короткая: громкость по повтору');
  }
  // Второй проход: линейная нормализация по замеру, 48 кГц моно, поля 40 мс в начале и 120 мс в конце.
  ff(['-i', flac, '-af', `${TRIM},${gain},${tail}`, '-ac', '1', '-c:a', 'pcm_s16le', norm]);
  const opus = join(out, `${id}.opus`);
  const m4a = join(out, `${id}.m4a`);
  const common = ['-map_metadata', '-1', '-fflags', '+bitexact', '-ac', '1'];
  ff(['-i', norm, ...common, '-c:a', 'libopus', '-b:a', `${TARGET.opusKbps}k`, '-vbr', 'on', '-application', 'audio', opus]);
  ff(['-i', norm, ...common, '-ar', '24000', '-c:a', 'aac', '-b:a', `${TARGET.aacKbps}k`, '-movflags', '+faststart', m4a]);
  const duration = probeDuration(opus);
  const vol = volume(norm);
  if (!(duration >= 0.3)) warnings.push('слишком короткая (< 0,3 с)');
  if (duration > 12) warnings.push('слишком длинная (> 12 с)');
  if (vol.mean < -40) warnings.push(`почти тишина (средний уровень ${vol.mean} дБ)`);
  if (vol.max > -0.5) warnings.push(`риск клиппинга (пик ${vol.max} дБ)`);
  if (Number(m.input_i) < -40) warnings.push(`исходник очень тихий (${m.input_i} LUFS)`);
  return {
    id,
    durationSec: Math.round(duration * 100) / 100,
    bytes: { flac: statSync(flac).size, opus: statSync(opus).size, m4a: statSync(m4a).size, wav: statSync(norm).size },
    inputLufs: Number(m.input_i),
    peakDb: vol.max,
    status: warnings.length ? 'warning' : 'ok',
    warnings,
  };
}

if (!existsSync(src)) {
  console.error(`Нет папки исходников: ${src}`);
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const sources = readdirSync(src).filter((f) => f.endsWith('.flac') && !f.startsWith('_')).map((f) => f.slice(0, -5));
const unknown = sources.filter((id) => !catalog.has(id));
const ids = sources.filter((id) => catalog.has(id) && (only.length === 0 || only.includes(id))).sort();
const tmp = mkdtempSync(join(tmpdir(), 'voice-'));
const results = [];
for (const id of ids) {
  try {
    const r = buildOne(id, join(src, `${id}.flac`), tmp);
    results.push(r);
    console.log(`[${r.status}] ${id}: ${r.durationSec} с, opus ${(r.bytes.opus / 1024).toFixed(1)} КБ, m4a ${(r.bytes.m4a / 1024).toFixed(1)} КБ${r.warnings.length ? ' — ' + r.warnings.join('; ') : ''}`);
  } catch (e) {
    results.push({ id, status: 'error', warnings: [String(e.message ?? e).split('\n')[0]] });
    console.error(`[error] ${id}: ${e.message ?? e}`);
  }
}
rmSync(tmp, { recursive: true, force: true });

if (writeManifest) {
  // Манифест — только файлы, которые реально есть в папке сборки (включая собранные ранее).
  const present = new Set(readdirSync(out).filter((f) => f.endsWith('.opus')).map((f) => f.slice(0, -5)));
  const lines = {};
  for (const id of [...present].filter((x) => catalog.has(x)).sort()) {
    if (existsSync(join(out, `${id}.m4a`))) lines[id] = { opus: `${id}.opus`, m4a: `${id}.m4a` };
  }
  const manifestPath = join(out, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({ voice: cfg.license?.voice ?? null, lines }, null, 2) + '\n');

  // Права: автоматический раздел реестра со строкой на каждый файл (CLAUDE.md, AUDIO §9).
  const regPath = join(root, 'assets/audio/LICENSES.md');
  const reg = readFileSync(regPath, 'utf8');
  const start = `<!-- voice:${cfg.character}:start -->`;
  const end = `<!-- voice:${cfg.character}:end -->`;
  const lic = cfg.license;
  if (!lic) {
    console.error('В tools/voice/agata.voice.json нет раздела license — файлы не будут записаны в реестр прав, проверка check:assets не пройдёт.');
  } else {
    const rel = (f) => relative(root, join(out, f));
    const rows = Object.entries(lines).flatMap(([, e]) => [e.opus, e.m4a]).map((f) => `| \`${rel(f)}\` | ${lic.source} | ${lic.date} | ${lic.terms} | ${lic.use} |`);
    const block = `${start}\n${rows.join('\n')}\n${end}`;
    const next = reg.includes(start) ? reg.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block) : reg.replace(/(\| `public\/audio\/ru\/agata\/manifest\.json`[^\n]*\n)/, `$1${block}\n`);
    writeFileSync(regPath, next);
  }
}

// Отчёт: длительность, размеры, статус каждой реплики и чего не хватает в каталоге.
const reportDir = arg('--report-dir', join(root, 'tools/voice/report'));
mkdirSync(reportDir, { recursive: true });
const built = new Map(results.map((r) => [r.id, r]));
const missing = [...catalog.keys()].filter((id) => !existsSync(join(out, `${id}.opus`)));
const sum = (k) => results.reduce((a, r) => a + (r.bytes?.[k] ?? 0), 0);
const kb = (b) => (b / 1024).toFixed(1);
const md = [
  `# Отчёт сборки голоса: ${cfg.character}`,
  '',
  `Исходники: \`${relative(root, src)}\`, сборка: \`${relative(root, out)}\`. Цель: ${TARGET.lufs} LUFS, пик ${TARGET.truePeak} dBTP; Opus ${TARGET.opusKbps} кбит/с, AAC ${TARGET.aacKbps} кбит/с, моно.`,
  '',
  '| Реплика | Текст | Длит., с | WAV 48 кГц, КБ | FLAC, КБ | Opus, КБ | AAC, КБ | Статус |',
  '|---|---|---|---|---|---|---|---|',
  ...ids.map((id) => {
    const r = built.get(id);
    return `| \`${id}\` | ${catalog.get(id).text} | ${r.durationSec ?? '—'} | ${r.bytes ? kb(r.bytes.wav) : '—'} | ${r.bytes ? kb(r.bytes.flac) : '—'} | ${r.bytes ? kb(r.bytes.opus) : '—'} | ${r.bytes ? kb(r.bytes.m4a) : '—'} | ${r.status}${r.warnings.length ? ': ' + r.warnings.join('; ') : ''} |`;
  }),
  '',
  `Итого (${results.length} шт.): WAV ${kb(sum('wav'))} КБ, FLAC ${kb(sum('flac'))} КБ, Opus ${kb(sum('opus'))} КБ, AAC ${kb(sum('m4a'))} КБ; речь ${results.reduce((a, r) => a + (r.durationSec ?? 0), 0).toFixed(1)} с.`,
  '',
  `Реплик каталога без голоса: ${missing.length}${missing.length ? ' — ' + missing.map((x) => `\`${x}\``).join(', ') : ''}.`,
  unknown.length ? `\nИсходники без реплики в каталоге (пропущены): ${unknown.join(', ')}.` : '',
].join('\n');
const reportName = arg('--report', cfg.character);
writeFileSync(join(reportDir, `${reportName}.md`), md + '\n');
writeFileSync(join(reportDir, `${reportName}.json`), JSON.stringify({ target: TARGET, results, missing, unknown }, null, 2) + '\n');
console.log(`Готово: ${results.filter((r) => r.status !== 'error').length}/${results.length}; без голоса в каталоге: ${missing.length}. Отчёт: ${relative(root, join(reportDir, reportName + '.md'))}`);
if (results.some((r) => r.status === 'error') || unknown.length) process.exit(1);
