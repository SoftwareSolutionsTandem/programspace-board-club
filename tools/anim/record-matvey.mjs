// Запись видео анимаций Деда Матвея с демо-страницы (/?anim=matvey&manual): время идёт покадрово (30 кадров/с),
// поэтому темп движения на записи точный, сколько бы ни рисовал кадр браузер. Нужны npm run dev и ffmpeg.
// Запуск: node tools/anim/record-matvey.mjs [адрес dev-сервера] [папка] [сцены через запятую]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/anim-matvey';
const only = process.argv[4]?.split(',');
const FPS = 30;

/** Сценарии: подпись, действие (метод window.matveyLab с аргументами), пауза (мс времени сцены). */
const SCENES = {
  idle: [{ cap: 'Ожидание: дыхание, взгляд на свои кости и цепочку, моргание, мелкие действия' }, { wait: 22000 }],
  think: [{ cap: 'Ожидание' }, { wait: 1500 }, { cap: 'Раздумье: пальцы у усов, взгляд на кости', call: ['setState', 'think'] }, { wait: 9000 }, { cap: 'Возврат к ожиданию', call: ['setState', 'idle'] }, { wait: 3000 }],
  place: [{ cap: 'Кладёт кость: берёт из ряда, тянется над своими костями, кладёт к цепочке' }, { wait: 1200 }, { call: ['place'] }, { wait: 2600 }, { call: ['place'] }, { wait: 2600 }, { call: ['place'] }, { wait: 2600 }],
  'place-slow': [{ call: ['setJoints', true] }, { call: ['setSpeed', 0.25] }, { cap: 'Кладёт кость в 4 раза медленнее; точки — шарниры' }, { wait: 400 }, { call: ['place'] }, { wait: 7500 }],
  bazaar: [{ cap: 'Берёт из базара и ставит в свой ряд' }, { wait: 1000 }, { call: ['draw'] }, { wait: 2400 }, { call: ['draw'] }, { wait: 2400 }, { cap: 'Хода нет — стучит', call: ['knock'] }, { wait: 2600 }],
  reactions: [
    { cap: 'Ход соперника — провожает кость взглядом', call: ['react', 'watchPlay', 'think'] }, { wait: 2200 },
    { cap: 'Доволен ходом', call: ['react', 'satisfied', 'sly'] }, { wait: 2600 },
    { cap: 'Ворчит', call: ['react', 'grumble', 'annoyed'] }, { wait: 2500 },
    { cap: 'Удивлён: у соперника одна кость', call: ['react', 'surprised', 'surprise'] }, { wait: 2300 },
    { call: ['reset'] }, { wait: 800 },
  ],
  hands: [
    { cap: 'Выиграл руку', call: ['react', 'handWin', 'laugh'] }, { wait: 2700 },
    { cap: 'Проиграл руку', call: ['react', 'handLose', 'sad'] }, { wait: 2800 },
    { cap: '«Рыба!» — очки его', call: ['react', 'slap', 'azart'] }, { wait: 2300 },
    { cap: 'Рыба поровну — ничья', call: ['react', 'shrug', 'surprise'] }, { wait: 2500 },
    { call: ['reset'] }, { wait: 600 },
  ],
  match: [{ cap: 'Победа в матче' }, { wait: 600 }, { call: ['victory'] }, { wait: 6500 }, { call: ['reset'] }, { wait: 1500 }, { cap: 'Поражение в матче: приподнимает кепку', call: ['react', 'capTip', 'warm'] }, { wait: 3200 }],
  emotions: [{ cap: 'Эмоции: веки и брови-щётки, форма глаз' }, { wait: 800 }, ...Array.from({ length: 8 }, () => [{ call: ['nextEmotion'] }, { wait: 1500 }]).flat()],
  mouth: [{ cap: 'Формы рта для будущей озвучки (без звука)' }, { wait: 500 }, { call: ['mouth'] }, { wait: 3600 }],
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
mkdirSync(out, { recursive: true });
for (const [name, steps] of Object.entries(SCENES)) {
  if (only && !only.includes(name)) continue;
  await p.goto(`${base}/?anim=matvey&manual&seed=${name.length * 5}`);
  await p.waitForFunction(() => !!window.matveyLab, null, { timeout: 60000 });
  const frames = join(out, `${name}-frames`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  let n = 0;
  const frame = async () => {
    await p.evaluate((ms) => window.matveyLab.step(ms), 1000 / FPS);
    await p.screenshot({ path: join(frames, `${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  };
  for (const s of steps) {
    if (s.cap !== undefined) await p.evaluate((t) => window.matveyLab.caption(t), s.cap);
    if (s.call) await p.evaluate(([fn, ...args]) => void window.matveyLab[fn](...args), s.call);
    if (s.wait) for (let t = 0; t < s.wait; t += 1000 / FPS) await frame();
  }
  const mp4 = join(out, `${name}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%05d.jpg'), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', mp4]);
  console.log(`${name}: ${n} кадров → ${mp4}`);
}
writeFileSync(join(out, 'errors.json'), JSON.stringify(errors, null, 2));
console.log('ошибок страницы:', errors.length);
await b.close();
