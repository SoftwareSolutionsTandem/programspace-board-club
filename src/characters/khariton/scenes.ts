// Сценки Харитона — «своя жизнь» профессора за доской (src/characters/life.ts, docs/ART_STYLE.md §5.6).
// Рассеянный и театральный: снимает и протирает очки (без них щурится), сверяется с карманными часами — сначала
// прикладывает их к уху, — разыгрывает варианты в воздухе, воюет с непокорным хохолком, начинает лекцию и смущается,
// а то и вскакивает с «эврикой», которая тут же оказывается ложной.
import type { SpringParams } from '../../puppet/motion';
import type { GestureDef, Pose, SceneDef } from '../../puppet/types';

const calm: SpringParams = { f: 2.4, zeta: 0.82 };
const quick: SpringParams = { f: 6, zeta: 0.6 };

const R = ['rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'] as const;
const L = ['lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot'] as const;
const only = (p: Pose, keys: readonly (keyof Pose)[]): Pose => Object.fromEntries(keys.map((k) => [k, p[k]])) as Pose;

/** Правая кисть у очков (дужка у виска). */
const R_GLASSES: Pose = { rHandX: 262, rHandY: 140, rCtrlX: 336, rCtrlY: 250, rDX: -12, rDY: -16, rHandRot: -110 };
/** Без очков: прищур и сдвинутые брови. */
const SQUINT: Pose = { lidLI: -2, lidLO: 0, lidRI: -2, lidRO: 0, browLI: 6, browRI: 6, browLM: 0, browRM: 0 };
const UNSQUINT: Pose = { lidLI: -9, lidLO: -9, lidRI: -9, lidRO: -9, browLI: 1, browRI: 1, browLM: -5, browRM: -5 };

export function kharitonScenes(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);

  /** Очки: снимает, щурится, дышит на стёкла, протирает салфеткой, смотрит на свет, надевает — «вот теперь вижу». */
  const glasses: GestureDef = {
    id: 'scene:glasses',
    duration: 7600,
    keys: [
      { at: 0, pose: { ...R_GLASSES, gazeY: 0.2 }, spring: { arm: calm } },
      { at: 600, pose: { glassesOff: 1 }, props: { r: 'glasses' } },
      { at: 700, pose: { rHandX: 246, rHandY: 262, rCtrlX: 330, rCtrlY: 300, rDX: -14, rDY: -10, rHandRot: -165, gazeX: 0.1, gazeY: 0.7, headY: 2, ...SQUINT }, spring: { arm: { f: 2.2, zeta: 0.84 } } },
      // Дышит на стёкла.
      { at: 1300, pose: { rHandY: 236, headY: 3 }, mouth: 'o' },
      { at: 1700, pose: { lHandX: 196, lHandY: 268, lCtrlX: 110, lCtrlY: 320, lDX: 12, lDY: -6, lHandRot: -10, rHandY: 262, headY: 2 }, mouth: null, props: { l: 'cloth' }, spring: { arm: calm } },
      // Трёт: салфетка ходит туда-сюда.
      { at: 2100, pose: { lHandX: 214 }, spring: { arm: { f: 5, zeta: 0.6 } } },
      { at: 2350, pose: { lHandX: 198 } },
      { at: 2600, pose: { lHandX: 216 } },
      { at: 2850, pose: { lHandX: 200 } },
      { at: 3100, pose: { lHandX: 214 } },
      // Смотрит на свет: стёкла вверх, голова назад.
      { at: 3400, pose: { ...lr, rHandX: 270, rHandY: 160, rCtrlX: 340, rCtrlY: 250, rHandRot: -150, gazeX: 0.45, gazeY: -0.55, headY: -2, headRot: -2 }, props: { l: null }, spring: { arm: calm, head: calm } },
      { at: 4100, pose: { ...R_GLASSES, rHandY: 144, gazeX: 0, gazeY: 0.1, headY: 0, headRot: 0 }, spring: { arm: calm, head: calm } },
      { at: 4600, pose: { glassesOff: 0, ...UNSQUINT }, props: { r: null } },
      // Палец на переносицу — «так-то лучше».
      { at: 4800, pose: { rHandX: 238, rHandY: 160, rDX: -18, rDY: -18, rHandRot: -120, headY: -1.5 }, emotion: 'sly', spring: { arm: { f: 4, zeta: 0.7 } } },
      { at: 5100, pose: { ...rr, headY: 0 }, spring: { arm: calm } },
      { at: 5300, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 5050, name: 'say' }],
  };

  /** Карманные часы: из жилета, сначала к уху — тикают ли, — потом на циферблат и брови вверх. */
  const watch: GestureDef = {
    id: 'scene:watch',
    duration: 6400,
    keys: [
      { at: 0, pose: { lHandX: 184, lHandY: 334, lCtrlX: 110, lCtrlY: 340, lDX: 12, lDY: -2, lHandRot: -20, gazeX: -0.2, gazeY: 0.85, headRot: 2, headY: 2 }, spring: { arm: calm } },
      { at: 600, pose: { lHandY: 326 }, props: { l: 'watch' } },
      // К уху: голова клонится, глаза в сторону — слушает.
      { at: 850, pose: { lHandX: 128, lHandY: 150, lCtrlX: 84, lCtrlY: 250, lDX: 8, lDY: -14, lHandRot: -70, headRot: -6, headX: -2, headY: 0, gazeX: 0.6, gazeY: -0.3 }, spring: { arm: { f: 2.2, zeta: 0.84 }, head: calm } },
      { at: 1900, pose: { headRot: -7 } },
      // На циферблат.
      { at: 2300, pose: { lHandX: 176, lHandY: 214, lCtrlX: 100, lCtrlY: 290, lDX: 14, lDY: -10, lHandRot: -20, headRot: 2, headX: 0, headY: 2, gazeX: -0.4, gazeY: 0.75 }, spring: { arm: calm, head: calm } },
      { at: 2900, pose: { headY: -2, browLI: -10, browRI: -10, browLM: -16, browRM: -16 }, eyes: 'wide', emotion: 'surprise', spring: { head: quick } },
      { at: 3100, pose: {}, waitSpeech: true },
      { at: 3400, pose: { lHandX: 184, lHandY: 334, lCtrlX: 110, lCtrlY: 340, lDX: 12, lDY: -2, lHandRot: -20, headY: 1, gazeX: -0.2, gazeY: 0.8 }, eyes: null, emotion: 'warm', spring: { arm: calm } },
      { at: 4000, pose: { lHandY: 342 }, props: { l: null } },
      { at: 4250, pose: { ...lr, headRot: 0, headY: 0, gazeX: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ],
    markers: [{ at: 3000, name: 'say' }],
  };

  /** Партия в воздухе: переставляет воображаемые фигуры пальцами, бормочет, отмахивается — «вздор». */
  const place = (at: number, x: number, y: number, gx: number): GestureDef['keys'][number] => ({ at, pose: { rHandX: x, rHandY: y, gazeX: gx, gazeY: 0.45 } });
  const dip = (at: number, y: number): GestureDef['keys'][number] => ({ at, pose: { rHandY: y }, spring: { arm: quick } });
  const airChess: GestureDef = {
    id: 'scene:airChess',
    duration: 5600,
    keys: [
      { at: 0, pose: { rHandX: 252, rHandY: 264, rCtrlX: 330, rCtrlY: 320, rDX: -14, rDY: -12, rHandRot: -120, gazeX: 0.25, gazeY: 0.45, headRot: 2, headY: 1 }, emotion: 'think', spring: { arm: calm } },
      dip(500, 274), place(700, 232, 248, 0.05), dip(1000, 258), place(1250, 278, 236, 0.4), dip(1550, 246),
      place(1800, 246, 270, 0.15), dip(2100, 280), place(2350, 266, 250, 0.3),
      { at: 2600, pose: {}, waitSpeech: true },
      // Отмахивается: «нет, вздор».
      { at: 2900, pose: { rHandX: 300, rHandY: 280, rHandRot: -60, headRot: -4, gazeX: 0, gazeY: 0.1 }, emotion: 'annoyed', spring: { arm: { f: 4, zeta: 0.6 }, head: quick } },
      { at: 3150, pose: { headRot: 4 } },
      { at: 3400, pose: { ...rr, headRot: 0, headY: 0 }, emotion: 'warm', spring: { arm: calm, head: calm } },
    ],
    markers: [{ at: 400, name: 'say' }],
  };

  /** Хохолок: приглаживает ладонью, держит… отпускает — он снова торчит, ещё и пружинит. Вторая попытка, вздох. */
  const tuft: GestureDef = {
    id: 'scene:tuft',
    duration: 5400,
    keys: [
      // Локоть отведён наружу и вверх: рука огибает голову сбоку, а не ложится рукавом на лицо и очки (ART-REV).
      { at: 0, pose: { lHandX: 156, lHandY: 66, lCtrlX: 44, lCtrlY: 140, lDX: 12, lDY: -14, lHandRot: -150, headRot: 2, gazeY: -0.85 }, spring: { arm: calm } },
      { at: 600, pose: { lHandX: 178, lHandY: 74, hatY: 7, hatRot: 3 }, spring: { arm: { f: 2, zeta: 0.85 }, face: { f: 4, zeta: 0.85 } } },
      { at: 1300, pose: { lHandX: 120, lHandY: 110 }, spring: { arm: { f: 4, zeta: 0.7 } } },
      // Отпустил — хохолок выстреливает вверх и долго качается.
      { at: 1450, pose: { hatY: -7, hatRot: -5 }, spring: { face: { f: 4.5, zeta: 0.18 } } },
      { at: 1700, pose: { hatY: 0, hatRot: 0 } },
      { at: 2000, pose: { lHandX: 160, lHandY: 66, gazeY: -0.9, browLI: 6, browRI: 6 }, emotion: 'annoyed', spring: { arm: calm } },
      { at: 2500, pose: { lHandX: 182, lHandY: 76, hatY: 7 }, spring: { arm: { f: 2, zeta: 0.85 }, face: { f: 4, zeta: 0.85 } } },
      { at: 3000, pose: { ...lr, gazeY: 0.1, browLI: 1, browRI: 1 }, spring: { arm: { f: 3, zeta: 0.8 } } },
      { at: 3150, pose: { hatY: -8, hatRot: 6 }, spring: { face: { f: 4.5, zeta: 0.18 } } },
      { at: 3400, pose: { hatY: 0, hatRot: 0, headRot: 0 }, emotion: 'annoyed' },
      { at: 3600, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 3450, name: 'say' }],
  };

  /** Лекция: выпрямляется, палец вверх — «Знаете, ещё Стейниц…» — спохватывается, смущённо трёт затылок. */
  const lecture: GestureDef = {
    id: 'scene:lecture',
    duration: 5600,
    keys: [
      { at: 0, pose: { torsoY: -3, headY: -3, rHandX: 304, rHandY: 150, rCtrlX: 338, rCtrlY: 230, rDX: 0, rDY: -16, rHandRot: -82, gazeX: 0.3, gazeY: -0.3, headRot: -2 }, emotion: 'azart', spring: { arm: { f: 3, zeta: 0.75 }, body: calm } },
      { at: 500, pose: { rHandY: 142 } },
      { at: 700, pose: {}, waitSpeech: true },
      // Спохватился: рука к затылку, румянец, взгляд в стол.
      { at: 1000, pose: { torsoY: 1, headY: 2, headRot: 3, rHandX: 286, rHandY: 112, rCtrlX: 340, rCtrlY: 220, rDX: -10, rDY: -10, rHandRot: -150, gazeX: -0.2, gazeY: 0.8, blush: 0.75 }, emotion: 'warm', spring: { arm: calm, body: calm, face: calm } },
      { at: 1400, pose: { rHandX: 280 }, spring: { arm: { f: 6, zeta: 0.6 } } },
      { at: 1650, pose: { rHandX: 290 } },
      { at: 1900, pose: { rHandX: 282 } },
      { at: 2300, pose: { ...rr, torsoY: 0, headY: 0, headRot: 0, gazeX: 0, gazeY: 0.1, blush: 0.3 }, spring: { arm: calm, body: calm, face: calm } },
    ],
    markers: [{ at: 600, name: 'say' }],
  };

  /** Ложная эврика: вскидывается с поднятым пальцем — замирает — сникает: «…нет, показалось». */
  const falseEureka: GestureDef = {
    id: 'scene:falseEureka',
    duration: 5200,
    keys: [
      { at: 0, pose: { torsoY: 2, headY: 2, rHandX: 290, rHandY: 330, rCtrlX: 330, rCtrlY: 310, gazeY: 0.6 }, emotion: 'think', spring: { body: { f: 3, zeta: 0.7 } } },
      { at: 500, pose: { rHandX: 312, rHandY: 140, rCtrlX: 338, rCtrlY: 220, rDX: 0, rDY: -16, rHandRot: -82, torsoY: -4, headY: -5, headRot: -2, hatY: -6, hatRot: 4, gazeY: -0.3 }, eyes: 'star', emotion: 'azart', spring: { arm: { f: 4, zeta: 0.6 }, body: { f: 3, zeta: 0.6 }, face: { f: 6, zeta: 0.3 } } },
      { at: 900, pose: { hatY: 0, hatRot: 0 } },
      // Замер… смотрит на доску… плечи опускаются.
      { at: 1500, pose: { gazeX: 0.1, gazeY: 0.9, headY: 1 }, eyes: null, emotion: 'surprise', spring: { head: calm } },
      { at: 2100, pose: { torsoY: 4, headY: 4, headRot: 2, rHandX: 300, rHandY: 280, rCtrlX: 336, rCtrlY: 300, rHandRot: -40, browLI: -8, browLO: 6, browRI: -8, browRO: 6 }, emotion: 'think', spring: { arm: { f: 1.8, zeta: 0.85 }, body: { f: 1.4, zeta: 0.85 } } },
      { at: 2300, pose: {}, waitSpeech: true },
      { at: 2700, pose: { ...rr, torsoY: 0, headY: 0, headRot: 0 }, emotion: 'laugh', spring: { arm: calm, body: calm } },
    ],
    markers: [{ at: 2200, name: 'say' }],
  };

  // ---------- LIFE-2: новые сценки ----------

  /** Лупа: достаёт из жилета, склоняется над доской, глаз огромный, — выпрямляется довольный. */
  const magnifier: GestureDef = {
    id: 'scene:magnifier',
    duration: 6400,
    keys: [
      { at: 0, pose: { rHandX: 234, rHandY: 336, rCtrlX: 320, rCtrlY: 350, rDX: -10, rDY: 0, rHandRot: -150, gazeX: 0.2, gazeY: 0.85 }, spring: { arm: calm } },
      { at: 550, pose: { rHandY: 328 }, props: { r: 'magnifier' } },
      // Склоняется к доске: лупа перед глазом.
      { at: 800, pose: { rHandX: 254, rHandY: 196, rCtrlX: 330, rCtrlY: 290, rDX: -14, rDY: -10, rHandRot: -160, torsoY: 5, headY: 6, headRot: 3, gazeX: 0.25, gazeY: 0.95 }, emotion: 'think', spring: { arm: calm, body: { f: 1.8, zeta: 0.85 }, head: calm } },
      { at: 1500, pose: { rHandX: 236, headRot: -3, gazeX: -0.2 }, spring: { arm: { f: 1.6, zeta: 0.9 }, head: calm } },
      { at: 2200, pose: { rHandX: 262, headRot: 4, gazeX: 0.3 } },
      { at: 2800, pose: { browLI: -10, browRI: -10, browLM: -16, browRM: -16 }, eyes: 'wide', emotion: 'surprise' },
      { at: 3100, pose: {}, waitSpeech: true },
      { at: 3400, pose: { rHandX: 234, rHandY: 336, rCtrlX: 320, rCtrlY: 350, rHandRot: -150, torsoY: 0, headY: 0, headRot: 0, gazeX: 0.2, gazeY: 0.8, browLI: 1, browRI: 1, browLM: -5, browRM: -5 }, eyes: null, emotion: 'sly', spring: { arm: calm, body: calm, head: calm } },
      { at: 3900, pose: { rHandY: 344 }, props: { r: null } },
      { at: 4100, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ],
    markers: [{ at: 3000, name: 'say' }],
  };

  /**
   * Газета (как у Матвея, D71): разворачивает обеими руками, читает, находит шахматный раздел, восклицает — смотрит
   * поверх газеты на игрока, складывает. Газета — за обеими кистями: левая рука сверху (topArm), правая держит газету.
   */
  const readLine = (at: number, x: number): GestureDef['keys'][number] => ({ at, pose: { gazeX: x, gazeY: 0.45, headRot: x * 3 } });
  const newspaper: GestureDef = {
    id: 'scene:newspaper',
    duration: 9000,
    keys: [
      { at: 0, pose: { rHandX: 334, rHandY: 386, rCtrlX: 350, rCtrlY: 320, rDX: -8, rDY: 4, rHandRot: 150, gazeX: 0.6, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 600, pose: { rHandY: 378 }, props: { r: 'newspaper' }, topArm: 'l' },
      { at: 850, pose: { rHandX: 270, rHandY: 262, rCtrlX: 336, rCtrlY: 320, rDX: -10, rDY: -6, rHandRot: -175, lHandX: 156, lHandY: 268, lCtrlX: 104, lCtrlY: 320, lDX: 10, lDY: -6, lHandRot: 0, gazeX: 0, gazeY: 0.5, headY: 2 }, emotion: 'think', spring: { arm: { f: 2, zeta: 0.85 } } },
      readLine(1400, -0.5), readLine(2000, 0.35), readLine(2300, -0.5), readLine(2900, 0.35), readLine(3200, -0.5),
      // Шахматный раздел! Брови вверх, «эврика».
      { at: 3700, pose: { gazeX: 0.1, headY: 0, browLI: -6, browRI: -8 }, emotion: 'surprise', eyes: 'star', spring: { head: calm } },
      { at: 4100, pose: { torsoY: -1.5, headY: -1.5 }, eyes: null, emotion: 'azart', spring: { body: quick } },
      { at: 4300, pose: { torsoY: 0, headY: 0 } },
      // Поверх газеты — на игрока.
      { at: 4700, pose: { rHandY: 286, lHandY: 292, headY: -3, gazeX: 0, gazeY: 0.2, browLI: 1, browRI: 1 }, emotion: 'sly', spring: { arm: calm, head: calm } },
      { at: 5000, pose: {}, waitSpeech: true },
      { at: 5400, pose: { rHandX: 334, rHandY: 386, rCtrlX: 350, rCtrlY: 320, rHandRot: 150, ...lr, headY: 0, gazeX: 0.6, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 6000, pose: { rHandY: 392 }, props: { r: null } },
      { at: 6200, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 4900, name: 'say' }],
  };

  /** Конь из кармана: вертит фигурку в пальцах, смотрит ей в «глаза», «прыгает» ею буквой Г и прячет. */
  const knight: GestureDef = {
    id: 'scene:knight',
    duration: 6000,
    keys: [
      { at: 0, pose: { rHandX: 234, rHandY: 336, rCtrlX: 320, rCtrlY: 350, rDX: -10, rDY: 0, rHandRot: -150, gazeX: 0.2, gazeY: 0.85 }, spring: { arm: calm } },
      { at: 550, pose: { rHandY: 328 }, props: { r: 'knight' } },
      { at: 800, pose: { rHandX: 262, rHandY: 230, rCtrlX: 336, rCtrlY: 300, rDX: -10, rDY: -10, rHandRot: -110, gazeX: 0.45, gazeY: 0.3, headRot: 2, propRotR: 0 }, emotion: 'warm', spring: { arm: calm } },
      { at: 1300, pose: { propRotR: 25 }, spring: { face: { f: 3, zeta: 0.6 } } },
      { at: 1700, pose: { propRotR: -20 } },
      { at: 2100, pose: { propRotR: 0, headRot: 4, headY: -1 }, emotion: 'sly' },
      { at: 2300, pose: {}, waitSpeech: true },
      // Прыжок буквой Г: вверх-вверх-вбок.
      { at: 2600, pose: { rHandY: 200, propRotR: 10 }, spring: { arm: { f: 5, zeta: 0.6 } } },
      { at: 2850, pose: { rHandY: 176 } },
      { at: 3100, pose: { rHandX: 290 } },
      { at: 3350, pose: { rHandY: 190, propRotR: 0 }, emotion: 'laugh' },
      { at: 3700, pose: { rHandX: 234, rHandY: 336, rCtrlX: 320, rCtrlY: 350, rHandRot: -150, headRot: 0, headY: 0, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 4200, pose: { rHandY: 344 }, props: { r: null } },
      { at: 4400, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 2200, name: 'say' }],
  };

  /** Забыл, что искал: хлопает по карманам обеими руками, замирает, смотрит в потолок — пожимает плечами. */
  const forgot: GestureDef = {
    id: 'scene:forgot',
    duration: 5600,
    keys: [
      { at: 0, pose: { lHandX: 186, lHandY: 340, lCtrlX: 110, lCtrlY: 350, lDX: 12, lDY: -2, lHandRot: -20, rHandX: 234, rHandY: 340, rCtrlX: 320, rCtrlY: 350, rDX: -12, rDY: -2, rHandRot: -160, gazeX: 0, gazeY: 0.85, headY: 2 }, emotion: 'think', spring: { arm: calm } },
      { at: 450, pose: { lHandY: 348, rHandY: 332 }, spring: { arm: quick } },
      { at: 650, pose: { lHandY: 334, rHandY: 346 } },
      { at: 850, pose: { lHandY: 348, rHandY: 332 } },
      { at: 1050, pose: { lHandX: 176, lHandY: 300, rHandX: 244, rHandY: 300 }, spring: { arm: calm } },
      { at: 1350, pose: { lHandY: 308, rHandY: 292 }, spring: { arm: quick } },
      // Замер: что я искал? Глаза в потолок.
      { at: 1700, pose: { gazeX: 0.3, gazeY: -0.9, headY: -1, headRot: -2, browLI: -9, browRI: -9 }, emotion: 'surprise', spring: { head: calm } },
      { at: 2500, pose: { gazeX: -0.3, headRot: 2 } },
      { at: 2800, pose: {}, waitSpeech: true },
      // Пожал плечами.
      { at: 3100, pose: { ...lr, ...rr, torsoY: -3, headRot: 3, gazeX: 0, gazeY: 0.1, browLI: 1, browRI: 1 }, emotion: 'laugh', spring: { arm: calm, body: calm } },
      { at: 3500, pose: { torsoY: 0, headRot: 0 } },
    ],
    markers: [{ at: 2700, name: 'say' }],
  };

  /** Дирижирует невидимым оркестром: глаза закрыты, рука ведёт мелодию, голова в такт, — финальный взмах. */
  const beat = (at: number, x: number, y: number, head: number): GestureDef['keys'][number] => ({ at, pose: { rHandX: x, rHandY: y, headRot: head }, spring: { arm: { f: 3.6, zeta: 0.6 }, head: calm } });
  const conduct: GestureDef = {
    id: 'scene:conduct',
    duration: 5600,
    keys: [
      { at: 0, pose: { rHandX: 290, rHandY: 220, rCtrlX: 340, rCtrlY: 290, rDX: -6, rDY: -12, rHandRot: -100, torsoY: -2, headY: -2, gazeY: -0.3 }, eyes: 'happy', emotion: 'warm', spring: { arm: calm, body: calm } },
      beat(500, 300, 180, 3), beat(800, 280, 230, -2), beat(1100, 318, 210, 4), beat(1400, 296, 170, -3), beat(1700, 284, 236, 2), beat(2000, 320, 196, -3), beat(2300, 300, 160, 3),
      // Финальный аккорд: рука вверх и резко вниз.
      { at: 2700, pose: { rHandY: 130, torsoY: -4, headY: -4 }, spring: { arm: { f: 4, zeta: 0.6 } } },
      { at: 3000, pose: { rHandY: 250, torsoY: 1, headY: 2, rFist: 1 }, emotion: 'azart', spring: { arm: { f: 7, zeta: 0.55 } } },
      { at: 3300, pose: { ...rr, rFist: 0, torsoY: 0, headY: 0, headRot: 0, gazeY: 0.1 }, eyes: null, spring: { arm: calm, body: calm } },
      { at: 3500, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 200, name: 'say' }],
  };

  /** Бабочка: поправляет галстук-бабочку обеими руками, разглаживает лацканы, — порядок. */
  const bowTie: GestureDef = {
    id: 'scene:bowTie',
    duration: 4600,
    keys: [
      { at: 0, pose: { lHandX: 192, lHandY: 262, lCtrlX: 110, lCtrlY: 320, lDX: 10, lDY: -8, lHandRot: -40, rHandX: 228, rHandY: 262, rCtrlX: 310, rCtrlY: 320, rDX: -10, rDY: -8, rHandRot: -140, headY: -2, gazeY: 0.9 }, spring: { arm: calm } },
      { at: 600, pose: { lHandY: 258, rHandY: 266 }, spring: { arm: quick } },
      { at: 800, pose: { lHandY: 266, rHandY: 258 } },
      { at: 1000, pose: { lHandY: 262, rHandY: 262 } },
      // Разглаживает лацканы.
      { at: 1300, pose: { lHandX: 178, lHandY: 300, rHandX: 242, rHandY: 300 }, spring: { arm: calm } },
      { at: 1700, pose: { lHandY: 336, rHandY: 336 } },
      { at: 2000, pose: { ...lr, ...rr, headY: -3, gazeY: 0.1, torsoY: -2 }, emotion: 'sly', spring: { arm: calm, body: calm } },
      { at: 2200, pose: {}, waitSpeech: true },
      { at: 2500, pose: { headY: 0, torsoY: 0 } },
    ],
    markers: [{ at: 2100, name: 'say' }],
  };

  /** Игрок спешит: всплёскивает руками — «шахматы не блиц!» — и тут же оговаривается. */
  const fastPlayer: GestureDef = {
    id: 'scene:fastPlayer',
    duration: 4000,
    keys: [
      { at: 0, pose: { lHandX: 150, lHandY: 300, lCtrlX: 96, lCtrlY: 320, lHandRot: -40, rHandX: 270, rHandY: 300, rCtrlX: 324, rCtrlY: 320, rHandRot: 220, torsoY: -2, gazeY: 0.1 }, eyes: 'wide', emotion: 'surprise', spring: { arm: { f: 3.4, zeta: 0.7 } } },
      { at: 700, pose: {}, eyes: null, emotion: 'laugh' },
      { at: 900, pose: {}, waitSpeech: true },
      { at: 1200, pose: { ...lr, ...rr, torsoY: 0 }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 400, name: 'say' }],
  };

  /** Игрок думает очень долго: деликатно покашливает и поглядывает — «не тороплю, но…». */
  const nudge: GestureDef = {
    id: 'scene:nudge',
    duration: 4000,
    keys: [
      { at: 0, pose: { rHandX: 236, rHandY: 214, rCtrlX: 330, rCtrlY: 290, rDX: -14, rDY: -12, rHandRot: -160, rFist: 1, gazeX: 0.3, gazeY: -0.2 }, spring: { arm: calm } },
      { at: 400, pose: { torsoY: 1.5, headY: 1.5 }, spring: { body: quick, head: quick } },
      { at: 550, pose: { torsoY: 0, headY: 0 } },
      { at: 800, pose: { ...rr, rFist: 0, gazeX: 0, gazeY: 0.1 }, emotion: 'sly', spring: { arm: calm } },
      { at: 1100, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 1000, name: 'say' }],
  };

  /** Партия затянулась: разводит руки, откидывается — какая партия! */
  const longGame: GestureDef = {
    id: 'scene:longGame',
    duration: 4200,
    keys: [
      { at: 0, pose: { lHandX: 120, lHandY: 260, lCtrlX: 80, lCtrlY: 300, lHandRot: -60, rHandX: 300, rHandY: 260, rCtrlX: 340, rCtrlY: 300, rHandRot: 240, torsoY: -3, headY: -3, gazeY: -0.3 }, emotion: 'azart', spring: { arm: calm, body: calm } },
      { at: 900, pose: {}, waitSpeech: true },
      { at: 1200, pose: { ...lr, ...rr, torsoY: 0, headY: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: calm, body: calm } },
    ],
    markers: [{ at: 500, name: 'say' }],
  };

  return [
    { id: 'glasses', gesture: glasses, weight: 1.4 },
    { id: 'watch', gesture: watch, tier: 'special', minWaitMs: 14_000, weight: 1.3 },
    { id: 'airChess', gesture: airChess },
    { id: 'tuft', gesture: tuft },
    { id: 'lecture', gesture: lecture, moods: ['ahead', 'even'] },
    { id: 'falseEureka', gesture: falseEureka, weight: 0.8 },
    { id: 'magnifier', gesture: magnifier, weight: 1.2 },
    { id: 'newspaper', gesture: newspaper, tier: 'special', minWaitMs: 15_000, weight: 1.3 },
    { id: 'knight', gesture: knight },
    { id: 'forgot', gesture: forgot, weight: 1.2 },
    { id: 'conduct', gesture: conduct, moods: ['ahead', 'even'] },
    { id: 'bowTie', gesture: bowTie },
    { id: 'fastPlayer', gesture: fastPlayer, tag: 'playerFast' },
    { id: 'nudge', gesture: nudge, tag: 'playerSlow' },
    { id: 'longGame', gesture: longGame, tag: 'longGame', cooldownMs: 600_000 },
    ...kharitonHabits(rest),
  ];
}

/**
 * Привычки Харитона — без слов: проводит пальцем по подбородку, приподнимает бровь, играет пальцами по столу
 * как на рояле, смотрит в потолок, поправляет манжету, потирает руки.
 */
export function kharitonHabits(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);
  const h = (id: string, duration: number, keys: GestureDef['keys']): SceneDef => ({ id, tier: 'habit', gesture: { id: `habit:${id}`, duration, keys } });
  const key = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { lHandRot: 10 + 10 * k, rHandRot: 170 - 10 * ((k + 1) % 2 ? 1 : -1), lDY: 8 + 2 * k, rDY: 8 - 2 * k }, spring: { arm: { f: 9, zeta: 0.5 } } });
  return [
    h('chin', 1800, [
      { at: 0, pose: { rHandX: 236, rHandY: 236, rCtrlX: 330, rCtrlY: 290, rDX: -16, rDY: -8, rHandRot: -150, headRot: 2, gazeX: 0.3, gazeY: -0.3 }, spring: { arm: calm } },
      { at: 700, pose: { rHandY: 248 }, spring: { arm: { f: 2.4, zeta: 0.85 } } },
      { at: 1100, pose: { ...rr, headRot: 0, gazeX: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ]),
    h('brow', 1500, [
      { at: 0, pose: { browRI: -12, browRO: -10, browRM: -18, headRot: -2, gazeX: 0.2 }, emotion: 'sly', spring: { face: { f: 5, zeta: 0.7 } } },
      { at: 900, pose: { browRI: 1, browRO: 2, browRM: -5, headRot: 0, gazeX: 0 } },
    ]),
    h('piano', 1700, [key(0, 1), key(170, -1), key(340, 1), key(510, -1), key(680, 1), key(850, -1), { at: 1000, pose: { ...lr, ...rr } }]),
    h('ceiling', 2000, [
      { at: 0, pose: { gazeX: -0.3, gazeY: -0.95, headY: -2, headRot: -2 }, spring: { head: calm } },
      { at: 800, pose: { gazeX: 0.3, headRot: 2 } },
      { at: 1400, pose: { gazeX: 0, gazeY: 0.1, headY: 0, headRot: 0 } },
    ]),
    h('cuff', 1700, [
      { at: 0, pose: { lHandX: 246, lHandY: 372, lCtrlX: 150, lCtrlY: 370, lDX: 10, lDY: 0, lHandRot: 10, gazeX: 0.4, gazeY: 0.9 }, spring: { arm: calm } },
      { at: 500, pose: { lHandX: 254 }, spring: { arm: quick } },
      { at: 700, pose: { lHandX: 246 } },
      { at: 950, pose: { ...lr, gazeX: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ]),
    h('rubHands', 1600, [
      { at: 0, pose: { lHandX: 196, lHandY: 320, lCtrlX: 120, lCtrlY: 340, lDX: 12, lDY: -2, lHandRot: 20, rHandX: 224, rHandY: 320, rCtrlX: 300, rCtrlY: 340, rDX: -12, rDY: -2, rHandRot: 160 }, emotion: 'sly', spring: { arm: calm } },
      { at: 400, pose: { lHandY: 326, rHandY: 314 }, spring: { arm: { f: 8, zeta: 0.5 } } },
      { at: 560, pose: { lHandY: 314, rHandY: 326 } },
      { at: 720, pose: { lHandY: 326, rHandY: 314 } },
      { at: 900, pose: { ...lr, ...rr }, spring: { arm: calm } },
    ]),
  ];
}
