// Дед Матвей как марионетка: части рисунка (art.ts), разрезанные по слоям, и их точки вращения.
// Части не перерисованы — это те же функции рисунка; в нейтральной позе кукла совпадает с исходной фигурой.
import type { PartSpec, PuppetArt } from '../../puppet/art';
import type { EyeStyle } from '../../puppet/types';
import type { Emotion } from '../types';
import { emotionMouth, FIGURE_BOX, MATVEY_PIECES as P, MOUTHS, type MouthShape } from './art';
import { seedSvg, teaGlassSvg } from '../props';

const doc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;
const part = (key: string, box: { x: number; y: number; w: number; h: number }, inner: () => string): PartSpec => ({ key, box, svg: () => doc(box, inner()) });
const hex = (c: string): number => parseInt(c.slice(1), 16);

const HEAD_FULL = { x: -10, y: -30, w: 260, h: 270 };
const EYE_BOX = { x: -14, y: -16, w: 28, h: 32 };
const MOUTH = { x: 80, y: 146, w: 80, h: 76 };
const eyes = (style: EyeStyle) => part(`eye:${style}`, EYE_BOX, () => P.eyeWhite(style));
const extras = (e: Emotion) => part(`extras:${e}`, HEAD_FULL, () => P.extras(e));

export const MATVEY_PUPPET: PuppetArt = {
  id: 'matvey',
  torso: part('torso', FIGURE_BOX, P.torso),
  hip: { x: 210, y: 470 },
  neck: { x: 210, y: 230 },
  headPivot: { x: 120, y: 230 },
  head: {
    // Пучка и серёжек у Матвея нет; за лицом — уши, над глазами — нос, передняя деталь — кепка.
    back: part('ears', { x: 36, y: 98, w: 168, h: 66 }, P.ears),
    face: part('face', { x: 50, y: 48, w: 140, h: 180 }, P.faceBase),
    blush: part('blush', { x: 66, y: 150, w: 108, h: 20 }, P.blush),
    details: part('details', { x: 84, y: 88, w: 72, h: 134 }, P.faceDetails),
    glasses: part('nose', { x: 100, y: 124, w: 40, h: 46 }, P.nose),
    bangs: part('cap', { x: 34, y: -14, w: 172, h: 112 }, P.cap),
    bangsPivot: { x: 120, y: 60 },
    eyes: { ball: eyes('ball'), wide: eyes('wide'), star: eyes('star'), happy: eyes('happy'), closed: eyes('closed') },
    pupil: part('pupil', { x: -7, y: -7, w: 14, h: 14 }, () => P.pupil(5.2, false)),
    pupilStar: part('pupilStar', { x: -7, y: -7, w: 14, h: 14 }, () => P.pupil(5.2, true)),
    extras: { warm: extras('warm'), laugh: extras('laugh'), azart: extras('azart'), annoyed: extras('annoyed'), sad: extras('sad') },
    mouthBox: MOUTH,
    mouths: MOUTHS,
    // Рот вместе с усами: при открытом рте усы приподнимаются (art.ts, mouth()).
    mouthSvg: (shape) => doc(MOUTH, P.mouth(shape as MouthShape)),
  },
  eyesAt: [{ x: P.eyeL[0], y: P.eyeL[1] }, { x: P.eyeR[0], y: P.eyeR[1] }],
  pupilRange: { x: 3.4, y: 3 },
  pupilClamp: { x: 4.3, y: 5.8 },
  // Веко Матвея тяжёлое: в покое прикрывает верх глаза (art.ts, eye() → lid()).
  lid: { halfW: 11, top: 16, line: 3.2, skin: hex(P.colors.skin), outline: hex(P.colors.outline), closed: { ball: 10, wide: 12 }, hiddenAt: -11.5, bulge: 1 },
  // Брови-щётки: толстый контур снизу, седая бровь, волоски (art.ts, brow()).
  brow: { dy: -21, halfW: 15, halfOut: 19, width: 12.5, color: hex(P.colors.hair), line: 0, lineAlpha: 0, outline: hex(P.colors.outline), under: 17, tufts: { count: 4, dx: 3, dy: -6, width: 2.2, color: hex(P.colors.hairSh) } },
  shoulders: [{ x: 148, y: 268 }, { x: 272, y: 268 }],
  sleeve: { width: P.sleeve.width, outline: P.sleeve.outline, fill: hex(P.sleeve.fill), line: hex(P.sleeve.line) },
  hand: part('hand', { x: -24, y: -17, w: 44, h: 34 }, P.hand),
  handFist: part('fist', { x: -24, y: -17, w: 44, h: 34 }, P.fist),
  handR: 17,
  mirrorHandR: true,
  cuff: part('cuff', { x: -17, y: -9, w: 34, h: 18 }, P.cuff),
  // Своих костей в руке нет — они стоят на столе; в руке — одна кость, которую он кладёт или несёт из базара.
  fanOffset: null,
  heldCard: { x: -4, y: 12, rot: 90, w: 60, h: 30 },
  // Реквизит сценок: стакан чая в подстаканнике, семечка.
  props: {
    tea: { ...part('prop:tea', { x: -26, y: -33, w: 52, h: 56 }, () => teaGlassSvg(P.colors.outline, '#B9BEC6', '#8A919C', '#B5621E')), grip: { x: -4, y: -26 }, rot: 0 },
    seed: { ...part('prop:seed', { x: -8, y: -10, w: 16, h: 20 }, () => seedSvg(P.colors.outline)), grip: { x: -14, y: -14 }, rot: 0, above: true },
  },
  speech: { closed: 'vA', levels: [['vB', 'vF'], ['vC', 'vE'], ['vD']] },
  emotionMouth,
};
