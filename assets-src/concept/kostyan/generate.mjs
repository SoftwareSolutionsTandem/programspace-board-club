// Лист-концепт: Костян. Собирается из тех же слоёв рисунка, что и игра (src/characters/kostyan/art.ts).
// Запуск: node assets-src/concept/kostyan/generate.mjs → out/*.svg (PNG для просмотра — tools/render-svg).
import { mkdirSync, writeFileSync } from 'node:fs';

const art = await import('../../../src/characters/kostyan/art.ts');
const OUT = new URL('./out/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const EMOTIONS = ['warm', 'sly', 'laugh', 'azart', 'surprise', 'think', 'annoyed', 'sad'];
const POSES = ['idle', 'think', 'throw', 'took', 'victory'];
const LABEL = {
  warm: 'приветливый', sly: 'ухмылка', laugh: 'смех', azart: 'азарт', surprise: 'удивление', think: 'раздумье', annoyed: 'досада', sad: 'огорчён',
  idle: 'ожидание', throw: 'ход к доске', took: 'потерял шашку', victory: 'победа',
};
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const P = art.PALETTE;

/** Фигура в координатах рига: тело, голова с эмоцией и ртом, руки позы; край стола по линии талии. */
function figure(emotion, pose, table = true) {
  const headInner = inner(art.portraitSvg(emotion));
  return `<g>
  ${inner(art.bodySvg())}
  ${headInner}
  ${table ? `<rect x="-20" y="383" width="470" height="70" fill="#A86B3C" stroke="${P.outline}" stroke-width="4"/><rect x="-20" y="383" width="470" height="8" fill="#C88D58"/>` : ''}
  ${inner(art.armsSvg(pose))}
  </g>`;
}

const cell = (x, y, w, h, scale, content, label) => `<g transform="translate(${x} ${y})">
  <rect width="${w}" height="${h}" rx="14" fill="#FFF8EC" stroke="#E0C9A6" stroke-width="2"/>
  <g transform="translate(${w / 2 - 210 * scale} ${12 - (-30) * scale}) scale(${scale})">${content}</g>
  <text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="18" fill="#5A3B28">${label}</text>
  </g>`;

// Лист 1: фигура, силуэт, палитра.
{
  const W = 1500, H = 760;
  let s = `<rect width="${W}" height="${H}" fill="#F3DDB8"/>
  <text x="40" y="60" font-family="Trebuchet MS, sans-serif" font-size="36" font-weight="700" fill="#3B2418">Костян — лист-концепт v1</text>
  <text x="40" y="96" font-family="Trebuchet MS, sans-serif" font-size="20" fill="#5A3B28">Парень 18–22 лет: тёмный чуб, веснушки, живые глаза; оранжевое худи с завязками, наушники на шее, нашивка-корона дамки. Без блатных клише.</text>`;
  s += cell(40, 130, 520, 600, 1.15, figure('warm', 'idle'), 'за доской — ожидание');
  s += cell(580, 130, 360, 600, 0.78, `<g opacity="1" filter="url(#sil)">${figure('warm', 'idle', false)}</g>`, 'силуэт');
  const sw = Object.entries({ контур: P.outline, кожа: P.skin, тень: P.skinSh, волосы: P.hair, худи: P.hoodie, тень_худи: P.hoodieSh, наушники: P.phones, нашивка: P.patch, корона: P.crown });
  s += `<g transform="translate(970 130)"><rect width="490" height="600" rx="14" fill="#FFF8EC" stroke="#E0C9A6" stroke-width="2"/>
  <text x="24" y="44" font-family="Trebuchet MS, sans-serif" font-size="22" font-weight="700" fill="#3B2418">Палитра</text>
  ${sw.map(([n, c], i) => `<rect x="24" y="${70 + i * 62}" width="70" height="46" rx="8" fill="${c}" stroke="${P.outline}" stroke-width="2"/><text x="110" y="${100 + i * 62}" font-family="Trebuchet MS, sans-serif" font-size="20" fill="#3B2418">${n} ${c}</text>`).join('')}
  </g>`;
  s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><filter id="sil"><feFlood flood-color="#3B2418"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs>${s}</svg>`;
  writeFileSync(new URL('kostyan-sheet-figure.svg', OUT), s);
}

// Лист 2: восемь эмоций.
{
  const W = 1500, H = 760;
  let s = `<rect width="${W}" height="${H}" fill="#F3DDB8"/><text x="40" y="60" font-family="Trebuchet MS, sans-serif" font-size="32" font-weight="700" fill="#3B2418">Эмоции</text>`;
  EMOTIONS.forEach((e, i) => {
    const x = 40 + (i % 4) * 360, y = 90 + Math.floor(i / 4) * 330;
    s += `<g transform="translate(${x} ${y})"><rect width="340" height="310" rx="14" fill="#FFF8EC" stroke="#E0C9A6" stroke-width="2"/>
    <g transform="translate(${170 - 210 * 1} ${20 + 30})">${inner(art.portraitSvg(e))}</g>
    <text x="170" y="292" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="20" fill="#5A3B28">${LABEL[e]}</text></g>`;
  });
  writeFileSync(new URL('kostyan-sheet-emotions.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`);
}

// Лист 3: позы за столом и рты для речи.
{
  const W = 1500, H = 900;
  let s = `<rect width="${W}" height="${H}" fill="#F3DDB8"/><text x="40" y="60" font-family="Trebuchet MS, sans-serif" font-size="32" font-weight="700" fill="#3B2418">Позы за шашечной доской</text>`;
  const PE = { idle: 'warm', think: 'think', throw: 'azart', took: 'annoyed', victory: 'laugh' };
  POSES.forEach((p, i) => {
    s += cell(40 + i * 288, 90, 272, 420, 0.6, figure(PE[p], p), LABEL[p]);
  });
  s += `<text x="40" y="570" font-family="Trebuchet MS, sans-serif" font-size="28" font-weight="700" fill="#3B2418">Рот при речи (A–F)</text>`;
  ['vA', 'vB', 'vC', 'vD', 'vE', 'vF'].forEach((m, i) => {
    const x = 40 + i * 240;
    s += `<g transform="translate(${x} 600)"><rect width="224" height="270" rx="14" fill="#FFF8EC" stroke="#E0C9A6" stroke-width="2"/>
    <clipPath id="c${m}"><rect width="224" height="232"/></clipPath>
    <g clip-path="url(#c${m})"><g transform="translate(${112 - 210 * 1.3} ${-60})" ><g transform="scale(1.3)">${inner(art.headSvg('warm'))}<g>${inner(art.mouthSvg(m))}</g></g></g></g>
    <text x="112" y="254" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="20" fill="#5A3B28">${m.slice(1)}</text></g>`;
  });
  writeFileSync(new URL('kostyan-sheet-poses.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`);
}
console.log('ok');
