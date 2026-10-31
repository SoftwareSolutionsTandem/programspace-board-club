// Костян как марионетка: части рисунка (art.ts), разрезанные по слоям, и их точки вращения.
// Части не перерисованы — это те же функции рисунка; в нейтральной позе кукла совпадает с исходной фигурой.
import type { PartSpec, PuppetArt } from '../../puppet/art';
import type { EyeStyle } from '../../puppet/types';
import type { Emotion } from '../types';
import { emotionMouth, FIGURE_BOX, KOSTYAN_PIECES as P, MOUTHS, type MouthShape } from './art';
import { cubeSvg, phoneBackSvg, phoneLookSvg, phoneSvg, sodaSvg, spinnerSvg } from '../props';

const doc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;
const part = (key: string, box: { x: number; y: number; w: number; h: number }, inner: () => string): PartSpec => ({ key, box, svg: () => doc(box, inner()) });
const hex = (c: string): number => parseInt(c.slice(1), 16);

const HEAD_FULL = { x: -10, y: -30, w: 260, h: 270 };
const EYE_BOX = { x: -16, y: -18, w: 32, h: 36 };
const MOUTH = { x: 80, y: 140, w: 80, h: 76 };
const eyes = (style: EyeStyle) => part(`eye:${style}`, EYE_BOX, () => P.eyeWhite(style));
const extras = (e: Emotion) => part(`extras:${e}`, HEAD_FULL, () => P.extras(e));

export const KOSTYAN_PUPPET: PuppetArt = {
  id: 'kostyan',
  torso: part('torso', FIGURE_BOX, P.torso),
  hip: { x: 210, y: 470 },
  neck: { x: 210, y: 228 },
  headPivot: { x: 120, y: 228 },
  head: {
    // За лицом — короткие виски и уши; над глазами — нос-кнопка; передняя деталь — чуб (пружинит).
    back: part('hair', { x: 46, y: 26, w: 148, h: 138 }, P.back),
    face: part('face', { x: 62, y: 46, w: 116, h: 180 }, P.faceBase),
    blush: part('blush', { x: 68, y: 150, w: 104, h: 20 }, P.blush),
    details: part('details', { x: 80, y: 140, w: 80, h: 80 }, P.faceDetails),
    glasses: part('nose', { x: 106, y: 146, w: 28, h: 24 }, P.nose),
    bangs: part('fringe', { x: 66, y: 28, w: 114, h: 76 }, P.fringe),
    bangsPivot: { x: 122, y: 40 },
    eyes: { ball: eyes('ball'), wide: eyes('wide'), star: eyes('star'), happy: eyes('happy'), closed: eyes('closed') },
    pupil: part('pupil', { x: -8, y: -8, w: 16, h: 16 }, () => P.pupil(6, false)),
    pupilStar: part('pupilStar', { x: -8, y: -8, w: 16, h: 16 }, () => P.pupil(6, true)),
    extras: { laugh: extras('laugh'), azart: extras('azart'), annoyed: extras('annoyed'), sad: extras('sad') },
    mouthBox: MOUTH,
    mouths: MOUTHS,
    mouthSvg: (shape) => doc(MOUTH, P.mouth(shape as MouthShape)),
  },
  eyesAt: [{ x: P.eyeL[0], y: P.eyeL[1] }, { x: P.eyeR[0], y: P.eyeR[1] }],
  pupilRange: { x: 4, y: 3.6 },
  pupilClamp: { x: 5, y: 6.4 },
  lid: { halfW: 12, top: 17, line: 3.2, skin: hex(P.colors.skin), outline: hex(P.colors.outline), closed: { ball: 12.5, wide: 14.5 }, hiddenAt: -13, bulge: 1 },
  brow: { dy: -22, halfW: 13, halfOut: 16, width: 8.5, color: hex(P.colors.hair), line: 0, lineAlpha: 0, outline: hex(P.colors.outline), under: 13 },
  shoulders: [{ x: 142, y: 270 }, { x: 278, y: 270 }],
  sleeve: { width: P.sleeve.width, outline: P.sleeve.outline, fill: hex(P.sleeve.fill), line: hex(P.sleeve.line) },
  hand: part('hand', { x: -34, y: -34, w: 68, h: 68 }, P.hand),
  handFist: part('fist', { x: -34, y: -34, w: 68, h: 68 }, P.fist),
  handR: 17,
  mirrorHandR: true,
  cuff: part('cuff', { x: -19, y: -10, w: 38, h: 20 }, P.cuff),
  fanOffset: null,
  heldCard: { x: 0, y: 0, rot: 0, w: 1, h: 1 },
  // Реквизит сценок: телефон из кармана худи.
  props: {
    phone: { ...part('prop:phone', { x: -16, y: -26, w: 32, h: 52 }, () => phoneSvg(P.colors.outline, '#2E3240', '#BFE6F2', P.colors.band)), grip: { x: -6, y: -18 }, rot: 0 },
    // Телефон в руке экраном к себе (листает, читает): видна задняя крышка, пальцы поверх корпуса (ART-REV).
    phoneLook: { ...part('prop:phoneLook', { x: -18, y: -29, w: 36, h: 56 }, () => phoneLookSvg(P.colors.outline, '#2E3240', '#1E2029', '#BFE6F2', P.colors.band)), grip: { x: 2, y: -16 }, rot: -8 },
    phoneBack: { ...part('prop:phoneBack', { x: -16, y: -26, w: 32, h: 52 }, () => phoneBackSvg(P.colors.outline, '#2E3240', P.colors.band)), grip: { x: -6, y: -18 }, rot: 0 },
    // LIFE-2: газировка, спиннер, кубик Рубика.
    soda: { ...part('prop:soda', { x: -13, y: -22, w: 26, h: 43 }, () => sodaSvg(P.colors.outline, '#D63A3A', '#F4F1E8')), grip: { x: -6, y: -18 }, rot: 0 },
    spinner: { ...part('prop:spinner', { x: -29, y: -29, w: 58, h: 58 }, () => `<g transform="scale(1.4)">${spinnerSvg(P.colors.outline, P.colors.band, '#E8EBF0')}</g>`), grip: { x: -2, y: -26 }, rot: 0, above: true },
    cube: { ...part('prop:cube', { x: -21, y: -21, w: 42, h: 42 }, () => `<g transform="scale(1.3)">${cubeSvg(P.colors.outline)}</g>`), grip: { x: -4, y: -22 }, rot: 0, above: true },
  },
  speech: { closed: 'vA', levels: [['vB', 'vF'], ['vC', 'vE'], ['vD']] },
  emotionMouth,
};
