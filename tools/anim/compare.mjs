// Сравнение нейтральной позы марионетки с исходным рисунком (старый риг) попиксельно.
// Запуск: npm run dev, затем node tools/anim/compare.mjs [http://localhost:5173] [папка для картинок].
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'test-results/anim';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(`${base}/?anim&manual`);
await p.waitForFunction(() => !!window.animLab, null, { timeout: 30000 });
const box = await p.evaluate(() => window.animLab.characterBox());
const clip = { x: Math.max(0, Math.round(box.x)), y: Math.max(0, Math.round(box.y)), width: Math.round(box.w), height: Math.round(Math.min(720 - Math.max(0, box.y), box.h)) };
await p.evaluate(() => window.animLab.freeze(true));
const fresh = await p.screenshot({ clip });
await p.evaluate(() => window.animLab.showOld(true));
const old = await p.screenshot({ clip });
writeFileSync(`${out}/neutral-new.png`, fresh);
writeFileSync(`${out}/neutral-old.png`, old);
// Сравнение в браузере: доля пикселей, отличающихся больше порога, и карта отличий.
const res = await p.evaluate(async ([a, c]) => {
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const [ia, ic] = await Promise.all([load(a), load(c)]);
  const w = ia.width, h = ia.height;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, w, h).data;
  g.clearRect(0, 0, w, h); g.drawImage(ic, 0, 0); const dc = g.getImageData(0, 0, w, h).data;
  const diff = g.createImageData(w, h);
  let n = 0, big = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - dc[i]), Math.abs(da[i + 1] - dc[i + 1]), Math.abs(da[i + 2] - dc[i + 2]));
    if (d > 24) n++;
    if (d > 96) big++;
    diff.data[i] = d > 24 ? 220 : da[i] * 0.3 + 170; diff.data[i + 1] = d > 24 ? 30 : da[i + 1] * 0.3 + 170; diff.data[i + 2] = d > 24 ? 60 : da[i + 2] * 0.3 + 170; diff.data[i + 3] = 255;
  }
  g.putImageData(diff, 0, 0);
  return { w, h, changed: n / (w * h), strong: big / (w * h), diff: cv.toDataURL('image/png') };
}, [`data:image/png;base64,${fresh.toString('base64')}`, `data:image/png;base64,${old.toString('base64')}`]);
writeFileSync(`${out}/neutral-diff.png`, Buffer.from(res.diff.split(',')[1], 'base64'));
console.log(`Область ${res.w}×${res.h}: отличаются ${(res.changed * 100).toFixed(2)} % пикселей (сильно — ${(res.strong * 100).toFixed(2)} %). Карта: ${out}/neutral-diff.png`);
await b.close();
