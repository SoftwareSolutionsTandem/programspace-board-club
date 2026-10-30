// Агата как марионетка: части утверждённого рисунка (art.ts), разрезанные по слоям, и их точки вращения.
// Части не перерисованы — это те же функции рисунка; в нейтральной позе кукла совпадает с исходной фигурой.
import type { PartSpec, PivotPart, PuppetArt } from '../../puppet/art';
import type { EyeStyle } from '../../puppet/types';
import type { Emotion } from '../types';
import { AGATA_PIECES as P, emotionMouth, FIGURE_BOX, MOUTHS, type MouthShape } from './art';
import { candySvg, hankySvg, knittingSvg, mirrorSvg, pieSvg } from '../props';

const doc = (box: { x: number; y: number; w: number; h: number }, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${inner}</svg>`;
const part = (key: string, box: { x: number; y: number; w: number; h: number }, inner: () => string): PartSpec => ({ key, box, svg: () => doc(box, inner()) });
const pivotPart = (key: string, box: { x: number; y: number; w: number; h: number }, pivot: { x: number; y: number }, inner: () => string): PivotPart => ({ ...part(key, box, inner), pivot });
const hex = (c: string): number => parseInt(c.slice(1), 16);

const HEAD_FULL = { x: -10, y: -30, w: 260, h: 270 };
const EYE_BOX = { x: -22, y: -26, w: 44, h: 52 };
const eyes = (style: EyeStyle) => part(`eye:${style}`, EYE_BOX, () => P.eyeWhite(style));
const extras = (e: Emotion) => part(`extras:${e}`, HEAD_FULL, () => P.extras(e));

export const AGATA_PUPPET: PuppetArt = {
  id: 'agata',
  torso: part('torso', FIGURE_BOX, P.torso),
  hip: { x: 210, y: 455 },
  neck: { x: 210, y: 225 },
  headPivot: { x: 120, y: 225 },
  head: {
    bun: pivotPart('bun', { x: 80, y: -30, w: 96, h: 82 }, { x: 120, y: 42 }, P.bun),
    back: part('hairMass', { x: 8, y: 14, w: 224, h: 180 }, P.hairMass),
    earrings: [
      pivotPart('earringL', { x: 28, y: 184, w: 32, h: 34 }, { x: 42, y: 188 }, () => P.earring(42)),
      pivotPart('earringR', { x: 180, y: 184, w: 32, h: 34 }, { x: 194, y: 188 }, () => P.earring(194)),
    ],
    face: part('face', { x: 40, y: 40, w: 160, h: 188 }, P.faceBase),
    blush: part('blush', { x: 48, y: 163, w: 144, h: 26 }, P.blush),
    details: part('details', { x: 42, y: 120, w: 156, h: 74 }, P.faceDetails),
    glasses: part('glasses', { x: 40, y: 106, w: 160, h: 68 }, P.glasses),
    bangs: part('bangs', { x: 24, y: 14, w: 192, h: 132 }, P.bangs),
    bangsPivot: { x: 120, y: 28 },
    eyes: { ball: eyes('ball'), wide: eyes('wide'), star: eyes('star'), happy: eyes('happy'), closed: eyes('closed') },
    pupil: part('pupil', { x: -10, y: -10, w: 20, h: 20 }, () => P.pupil(7.5, false)),
    pupilStar: part('pupilStar', { x: -10, y: -10, w: 20, h: 20 }, () => P.pupil(7.5, true)),
    extras: { laugh: extras('laugh'), azart: extras('azart'), annoyed: extras('annoyed'), sad: extras('sad') },
    mouthBox: { x: 82, y: 168, w: 76, h: 62 },
    mouths: MOUTHS,
    // Рот и подбородок: складка подбородка лежит поверх рта, как в исходной голове.
    mouthSvg: (shape) => doc({ x: 82, y: 168, w: 76, h: 62 }, P.mouth(shape as MouthShape) + P.chinLine()),
  },
  eyesAt: [{ x: P.eyeL[0], y: P.eyeL[1] }, { x: P.eyeR[0], y: P.eyeR[1] }],
  pupilRange: { x: 5.5, y: 5 },
  lid: { halfW: 16, top: 24, line: 3.4, skin: hex(P.colors.skin), outline: hex(P.colors.outline) },
  brow: { dy: -40, halfW: 15, width: 6.5, color: hex(P.colors.hairSh), line: 1.6, lineAlpha: 0.55, outline: hex(P.colors.outline) },
  shoulders: [{ x: 132, y: 256 }, { x: 288, y: 256 }],
  sleeve: { width: P.sleeve.width, outline: P.sleeve.outline, fill: hex(P.sleeve.fill), line: hex(P.sleeve.line) },
  hand: part('hand', { x: -28, y: -28, w: 56, h: 56 }, () => P.hand(19)),
  handR: 19,
  cuff: part('cuff', { x: -20, y: -11, w: 40, h: 22 }, P.cuff),
  fanOffset: { x: -4, y: -46 },
  heldCard: { x: -4, y: -18, rot: -12 },
  fringe: { ...P.fringe, color: hex(P.fringe.color), outline: hex(P.fringe.outline) },
  // vA — губы сомкнуты; дальше по раскрытию: чуть, средне (или «о»), широко (как в смехе).
  // Реквизит сценок: платочек из рукава, конфета-барбариска из кармана фартука.
  props: {
    hanky: { ...part('prop:hanky', { x: -24, y: -21, w: 48, h: 42 }, () => hankySvg(P.colors.outline, '#FFF8F0', '#E07A8A', '#E9D9CC')), grip: { x: -4, y: -20 }, rot: 0, above: true },
    candy: { ...part('prop:candy', { x: -23, y: -12, w: 46, h: 24 }, () => candySvg(P.colors.outline, '#D8343F', '#FFF3E4')), grip: { x: -2, y: -22 }, rot: -10, above: true },
    // LIFE-2: вязание (спицы с полотном), пирожок, зеркальце.
    knitting: { ...part('prop:knitting', { x: -45, y: -32, w: 90, h: 63 }, () => `<g transform="scale(1.5)">${knittingSvg(P.colors.outline, '#7FA6C9', '#5A82A6', '#C9CED6')}</g>`), grip: { x: 4, y: -22 }, rot: 0, above: true },
    pie: { ...part('prop:pie', { x: -22, y: -14, w: 44, h: 28 }, () => pieSvg(P.colors.outline, '#E3A44F', '#B97A2E')), grip: { x: -2, y: -20 }, rot: 0, above: true },
    mirror: { ...part('prop:mirror', { x: -17, y: -19, w: 34, h: 48 }, () => mirrorSvg(P.colors.outline, '#D8343F', '#D9EEF2')), grip: { x: -4, y: -40 }, rot: 0 },
  },
  speech: { closed: 'vA', levels: [['vB', 'vF'], ['vC', 'vE'], ['vD']] },
  emotionMouth,
};
