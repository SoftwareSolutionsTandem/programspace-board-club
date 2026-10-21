// Запись видео анимаций с демо-страницы (/?anim&manual): время идёт покадрово (30 кадров/с), поэтому темп движения
// на записи точный, сколько бы ни рисовал кадр браузер. Нужны npm run dev и ffmpeg.
// Запуск: node tools/anim/record.mjs [адрес dev-сервера] [папка] [сцены через запятую]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/anim';
const only = process.argv[4]?.split(',');
const FPS = 30;

/** Сценарии: подпись, режим, бросок, пауза (мс времени сцены). */
const SCENES = {
  idle: [{ cap: 'Ожидание: дыхание, взгляд, моргание, мелкие действия' }, { wait: 18000 }],
  think: [{ cap: 'Ожидание' }, { wait: 2200 }, { cap: 'Раздумье', mode: 'think' }, { wait: 8500 }, { cap: 'Возврат к ожиданию', mode: 'idle' }, { wait: 3500 }],
  throw: [{ cap: 'Бросок карты' }, { wait: 1500 }, { throw: true }, { wait: 2600 }, { throw: true }, { wait: 2600 }, { mode: 'think' }, { wait: 1500 }, { cap: 'Бросок из раздумья' }, { throw: true }, { wait: 3000 }],
  'throw-slow': [{ joints: true }, { speed: 0.25 }, { cap: 'Бросок в 4 раза медленнее; точки — шарниры и опоры' }, { wait: 500 }, { throw: true }, { wait: 7000 }],
  'before-after': [
    { old: true }, { cap: 'Было: поза растворяется, карта вылетает из веера' }, { wait: 1200 }, { throw: true }, { wait: 2300 }, { throw: true }, { wait: 2300 },
    { old: false }, { clear: true }, { cap: 'Стало: карта из веера → замах → бросок из руки' }, { wait: 1200 }, { throw: true }, { wait: 2300 }, { throw: true }, { wait: 2300 },
  ],
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
mkdirSync(out, { recursive: true });
for (const [name, steps] of Object.entries(SCENES)) {
  if (only && !only.includes(name)) continue;
  await p.goto(`${base}/?anim&manual&seed=${name.length * 7}`);
  await p.waitForFunction(() => !!window.animLab, null, { timeout: 30000 });
  const frames = join(out, `${name}-frames`);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  let n = 0;
  const frame = async () => {
    await p.evaluate((ms) => window.animLab.step(ms), 1000 / FPS);
    await p.screenshot({ path: join(frames, `${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  };
  for (const s of steps) {
    if (s.cap !== undefined) await p.evaluate((t) => window.animLab.caption(t), s.cap);
    if (s.mode) await p.evaluate((m) => window.animLab.setMode(m), s.mode);
    if (s.joints) await p.evaluate(() => window.animLab.setJoints(true));
    if (s.speed) await p.evaluate((k) => window.animLab.setSpeed(k), s.speed);
    if (s.old !== undefined) await p.evaluate((v) => window.animLab.showOld(v), s.old);
    if (s.clear) await p.evaluate(() => window.animLab.clear());
    if (s.throw) await p.evaluate(() => void window.animLab.throwCard());
    if (s.wait) for (let t = 0; t < s.wait; t += 1000 / FPS) await frame();
  }
  const mp4 = join(out, `${name}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%05d.jpg'), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', mp4]);
  console.log(`${name}: ${n} кадров → ${mp4}`);
}
writeFileSync(join(out, 'errors.json'), JSON.stringify(errors, null, 2));
console.log('ошибок страницы:', errors.length);
await b.close();
