// Харитон как марионетка: части рисунка (art.ts), разрезанные по слоям, и их точки вращения.
// Части не перерисованы — это те же функции рисунка; в нейтральной позе кукла совпадает с исходной фигурой.
import type { PartSpec, PuppetArt } from '../../puppet/art';
import type { EyeStyle } from '../../puppet/types';
import type { Emotion } from '../types';
import { emotionMouth, FIGURE_BOX, KHARITON_PIECES as P, MOUTHS, type MouthShape } from './art';

const doc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;
const part = (key: string, box: { x: number; y: number; w: number; h: number }, inner: () => string): PartSpec => ({ key, box, svg: () => doc(box, inner()) });
const hex = (c: string): number => parseInt(c.slice(1), 16);

const HEAD_FULL = { x: -10, y: -30, w: 260, h: 270 };
const EYE_BOX = { x: -15, y: -17, w: 30, h: 34 };
const MOUTH = { x: 70, y: 150, w: 100, h: 100 };
const eyes = (style: EyeStyle) => part(`eye:${style}`, EYE_BOX, () => P.eyeWhite(style));
const extras = (e: Emotion) => part(`extras:${e}`, HEAD_FULL, () => P.extras(e));

export const KHARITON_PUPPET: PuppetArt = {
  id: 'khariton',
  torso: part('torso', FIGURE_BOX, P.torso),
  hip: { x: 210, y: 470 },
  neck: { x: 210, y: 230 },
  headPivot: { x: 120, y: 230 },
  head: {
    // За лицом — седые вихры и уши; над глазами — очки; передняя деталь — хохолок (качается, как чёлка Агаты).
    back: part('hair', { x: 36, y: 14, w: 168, h: 150 }, P.back),
    face: part('face', { x: 58, y: 36, w: 124, h: 194 }, P.faceBase),
    blush: part('blush', { x: 68, y: 152, w: 104, h: 20 }, P.blush),
    details: part('details', { x: 84, y: 64, w: 72, h: 140 }, P.faceDetails),
    glasses: part('glasses', { x: 62, y: 108, w: 116, h: 44 }, P.glasses),
    bangs: part('cowlick', { x: 92, y: -6, w: 68, h: 58 }, P.cowlick),
    bangsPivot: { x: 122, y: 42 },
    eyes: { ball: eyes('ball'), wide: eyes('wide'), star: eyes('star'), happy: eyes('happy'), closed: eyes('closed') },
    pupil: part('pupil', { x: -7, y: -7, w: 14, h: 14 }, () => P.pupil(5.4, false)),
    pupilStar: part('pupilStar', { x: -7, y: -7, w: 14, h: 14 }, () => P.pupil(5.4, true)),
    extras: { laugh: extras('laugh'), azart: extras('azart'), annoyed: extras('annoyed'), sad: extras('sad') },
    mouthBox: MOUTH,
    mouths: MOUTHS,
    // Рот вместе с усами и бородкой: при открытом рте бородка опускается (art.ts, mouth()).
    mouthSvg: (shape) => doc(MOUTH, P.mouth(shape as MouthShape)),
  },
  eyesAt: [{ x: P.eyeL[0], y: P.eyeL[1] }, { x: P.eyeR[0], y: P.eyeR[1] }],
  pupilRange: { x: 3.6, y: 3.2 },
  pupilClamp: { x: 4.6, y: 6 },
  lid: { halfW: 11, top: 16, line: 3, skin: hex(P.colors.skin), outline: hex(P.colors.outline), closed: { ball: 11.5, wide: 13.5 }, hiddenAt: -12, bulge: 1 },
  brow: { dy: -22, halfW: 13, halfOut: 17, width: 7.5, color: hex(P.colors.brow), line: 0, lineAlpha: 0, outline: hex(P.colors.outline), under: 12 },
  shoulders: [{ x: 146, y: 268 }, { x: 274, y: 268 }],
  sleeve: { width: P.sleeve.width, outline: P.sleeve.outline, fill: hex(P.sleeve.fill), line: hex(P.sleeve.line) },
  hand: part('hand', { x: -24, y: -17, w: 44, h: 34 }, P.hand),
  handFist: part('fist', { x: -24, y: -17, w: 44, h: 34 }, P.fist),
  handR: 16,
  mirrorHandR: true,
  cuff: part('cuff', { x: -17, y: -9, w: 34, h: 18 }, P.cuff),
  // Карт в руке нет: фигуры на доске ходят сами, рука лишь направляет ход.
  fanOffset: null,
  heldCard: { x: 0, y: 0, rot: 0, w: 1, h: 1 },
  speech: { closed: 'vA', levels: [['vB', 'vF'], ['vC', 'vE'], ['vD']] },
  emotionMouth,
};
