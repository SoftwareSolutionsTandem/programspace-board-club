// Харитон как марионетка: части рисунка (art.ts), разрезанные по слоям, и их точки вращения.
// Части не перерисованы — это те же функции рисунка; в нейтральной позе кукла совпадает с исходной фигурой.
import type { PartSpec, PuppetArt } from '../../puppet/art';
import type { EyeStyle } from '../../puppet/types';
import type { Emotion } from '../types';
import { emotionMouth, FIGURE_BOX, KHARITON_PIECES as P, MOUTHS, type MouthShape } from './art';
import { clothSvg, knightSvg, magnifierSvg, notebookSvg, pencilSvg, pocketWatchSvg } from '../props';

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
  // Реквизит сценок: свои очки в руке (на лице их прячет канал glassesOff), замшевая салфетка, карманные часы.
  props: {
    glasses: { ...part('prop:glasses', { x: -58, y: -22, w: 116, h: 44 }, () => `<g transform="translate(-120 -130)">${P.glasses()}</g>`), grip: { x: -10, y: -24 }, rot: 0 },
    cloth: { ...part('prop:cloth', { x: -19, y: -15, w: 38, h: 30 }, () => clothSvg(P.colors.outline, '#E7C76A', '#B9963E')), grip: { x: -4, y: -12 }, rot: 0, above: true },
    watch: { ...part('prop:watch', { x: -19, y: -26, w: 38, h: 44 }, () => pocketWatchSvg(P.colors.outline, P.colors.frame, P.colors.frameHi, '#FFFDF5')), grip: { x: -6, y: -20 }, rot: 0 },
    // LIFE-2: записная книжка и карандаш, лупа, шахматный конь из кармана.
    notebook: { ...part('prop:notebook', { x: -29, y: -20, w: 58, h: 42 }, () => notebookSvg(P.colors.outline, '#7A3B2E', '#FBF6E8', '#6B6258')), grip: { x: 4, y: -18 }, rot: 0, above: true },
    pencil: { ...part('prop:pencil', { x: -5, y: -28, w: 10, h: 52 }, () => pencilSvg(P.colors.outline, '#E8B83C', '#3B2418')), grip: { x: -10, y: -4 }, rot: 30, above: true },
    magnifier: { ...part('prop:magnifier', { x: -18, y: -18, w: 46, h: 46 }, () => magnifierSvg(P.colors.outline, P.colors.frame, '#7A4A2A')), grip: { x: -20, y: -22 }, rot: 0 },
    knight: { ...part('prop:knight', { x: -14, y: -18, w: 28, h: 38 }, () => knightSvg(P.colors.outline, '#F5ECD7', '#CDBF9D')), grip: { x: -2, y: -24 }, rot: 0, above: true },
  },
  speech: { closed: 'vA', levels: [['vB', 'vF'], ['vC', 'vE'], ['vD']] },
  emotionMouth,
};
