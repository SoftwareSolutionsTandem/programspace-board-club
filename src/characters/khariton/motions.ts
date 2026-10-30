// Движения Харитона: характер пружин, позы, лица эмоций, мелкие действия и жесты партии — только данные.
// Харитон — профессор-чудак: движения размеренные, но с внезапными всплесками («эврика!»); любит поправить очки,
// погладить бородку, постучать пальцем по виску; хохолок пружинит от резких движений; к сопернику — учтив.
import type { SpringParams } from '../../puppet/motion';
import { clamp } from '../../puppet/motion';
import type { Face, GestureDef, MotionStyle, Pose, StateDef, ThrowTarget } from '../../puppet/types';
import { kharitonScenes } from './scenes';

// Нейтральная поза — рисунок «ожидание» (art.ts, POSE_ARMS.idle): руки на столе по сторонам доски.
const REST = {
  torsoRot: 0, torsoX: 0, torsoY: 0,
  headRot: 0, headX: 0, headY: 0,
  gazeX: 0, gazeY: 0, pupil: 1,
  lidLI: -9, lidLO: -9, lidRI: -9, lidRO: -9,
  browLI: 1, browLO: 2, browLM: -5, browRI: 1, browRO: 2, browRM: -5,
  blush: 0.3,
  lHandX: 148, lHandY: 384, lCtrlX: 100, lCtrlY: 330, lDX: 16, lDY: 8, lHandRot: 10,
  rHandX: 272, rHandY: 384, rCtrlX: 320, rCtrlY: 330, rDX: -16, rDY: 8, rHandRot: 170,
  fanAlpha: 0,
} satisfies Pose;

// Брови рисунка: [внутренний конец, внешний, середина] (art.ts, brow()).
type Brow = readonly [number, number, number];
const BROW = {
  neutral: [1, 2, -5], happy: [-1, 3, -9], raised: [-10, -4, -16], annoyed: [8, -5, 0], sad: [-8, 6, -4],
  slyUp: [-9, -6, -15], slyDown: [5, 3, 0], frown: [7, -1, 1],
} as const satisfies Record<string, Brow>;
const brows = (l: Brow, r: Brow = l): Pose => ({ browLI: l[0], browLO: l[1], browLM: l[2], browRI: r[0], browRO: r[1], browRM: r[2] });
const lids = (i: number, o: number): Pose => ({ lidLI: i, lidLO: o, lidRI: i, lidRO: o });
const NO_LID = lids(-13, -13);

const face = (eyes: Face['eyes'], pose: Pose, look: readonly [number, number] = [0, 1], extras = false, speechMax?: number): Face =>
  ({ eyes, pose: { ...lids(-9, -9), pupil: 1, blush: 0.3, ...pose }, look, extras, speechMax });

const FACES: MotionStyle['faces'] = {
  warm: face('ball', brows(BROW.neutral)),
  sly: face('ball', { ...brows(BROW.slyDown, BROW.slyUp), ...lids(-1, 3) }, [4, 1]),
  laugh: face('happy', { ...brows(BROW.happy), blush: 0.65 }, [0, 1], true),
  azart: face('star', { ...brows(BROW.raised), ...NO_LID, blush: 0.5, pupil: 5.8 / 5.4 }, [0, 1], true),
  surprise: face('wide', { ...brows(BROW.raised), ...NO_LID, pupil: 4.4 / 5.4 }),
  think: face('ball', brows(BROW.slyUp, BROW.frown), [-4, -5]),
  annoyed: face('ball', { ...brows(BROW.annoyed), ...lids(-3, -1), pupil: 5.2 / 5.4 }, [0, 1], true, 1),
  sad: face('ball', { ...brows(BROW.sad), ...lids(-7, 0), pupil: 5.2 / 5.4, blush: 0.18 }, [-1, 4], true, 1),
};

function pick(p: Pose, ...keys: (keyof Pose)[]): Pose {
  const out: Pose = {};
  for (const k of keys) out[k] = p[k];
  return out;
}
const R_REST = pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot');
const L_REST = pick(REST, 'lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot');
const calm: SpringParams = { f: 2.4, zeta: 0.82 };

/** Правая рука — как есть; левая — зеркально относительно середины фигуры (x = 210). */
function mirror(p: Pose): Pose {
  const out: Pose = {};
  for (const [k, v] of Object.entries(p) as [keyof Pose, number][]) {
    if (!k.startsWith('r') || k === 'rFist') {
      if (k === 'rFist') out.lFist = v;
      else out[k] = v;
      continue;
    }
    const lk = ('l' + k.slice(1)) as keyof Pose;
    out[lk] = k === 'rHandX' || k === 'rCtrlX' ? 420 - v : k === 'rDX' ? -v : k === 'rHandRot' ? 180 - v : v;
  }
  return out;
}

// ---------- мелкие действия ----------

/** Поправляет очки: палец к переносице, лёгкий толчок вверх, голова чуть назад. */
const adjustGlasses: GestureDef = {
  id: 'adjustGlasses',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 238, rHandY: 166, rCtrlX: 322, rCtrlY: 262, rDX: -18, rDY: -18, rHandRot: -120, gazeY: 0.2 }, spring: { arm: { f: 2.8, zeta: 0.8 } } },
    { at: 560, pose: { rHandY: 160, headY: -1.5, headRot: -1 }, spring: { arm: { f: 5, zeta: 0.7 } } },
    { at: 760, pose: { rHandY: 166, headY: 0 } },
    { at: 900, pose: { ...R_REST, headRot: 0 }, spring: { arm: { f: 2.4, zeta: 0.85 } } },
  ],
};

/** Гладит бородку: кисть к подбородку, проводит вниз раз-другой. */
const strokeGoatee: GestureDef = {
  id: 'strokeGoatee',
  duration: 2100,
  keys: [
    { at: 0, pose: { rHandX: 240, rHandY: 236, rCtrlX: 332, rCtrlY: 286, rDX: -16, rDY: -8, rHandRot: -150, headRot: 2, gazeX: -0.2, gazeY: 0.5 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
    { at: 650, pose: { rHandY: 250 }, spring: { arm: { f: 3.2, zeta: 0.85 } } },
    { at: 950, pose: { rHandY: 236 } },
    { at: 1250, pose: { rHandY: 252 } },
    { at: 1550, pose: { ...R_REST, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** Приглаживает вихор над ухом — тот снова пружинит. */
const smoothHair: GestureDef = {
  id: 'smoothHair',
  duration: 1700,
  keys: [
    { at: 0, pose: { lHandX: 140, lHandY: 116, lCtrlX: 86, lCtrlY: 220, lDX: 10, lDY: -12, lHandRot: -120, headRot: 2 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
    { at: 550, pose: { lHandY: 132, hatY: 2 }, spring: { arm: { f: 3, zeta: 0.85 } } },
    { at: 850, pose: { hatY: -3, hatRot: -2 }, spring: { face: { f: 6, zeta: 0.35 } } },
    { at: 1000, pose: { ...L_REST, headRot: 0, hatY: 0, hatRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** Стучит пальцем по виску: «так-так…». */
const tapTemple: GestureDef = {
  id: 'tapTemple',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 282, rHandY: 146, rCtrlX: 336, rCtrlY: 240, rDX: -8, rDY: -14, rHandRot: -95, headRot: 2.5 }, spring: { arm: { f: 2.8, zeta: 0.8 } } },
    { at: 500, pose: { rHandX: 276 }, spring: { arm: { f: 8, zeta: 0.55 } } },
    { at: 650, pose: { rHandX: 282 } },
    { at: 800, pose: { rHandX: 276 } },
    { at: 950, pose: { rHandX: 282 } },
  ],
};

/** Кивает своим мыслям. */
const nodThought: GestureDef = {
  id: 'nodThought',
  duration: 1400,
  keys: [
    { at: 0, pose: { headY: 2.5, headRot: -2, gazeY: 0.85 }, spring: { head: calm } },
    { at: 500, pose: { headY: 0.5 } },
    { at: 800, pose: { headY: 2.5 } },
  ],
};

// ---------- реакции (MotionStyle.gestures) ----------

/** «Эврика!»: резко выпрямляется, палец вверх, хохолок подпрыгивает. */
const eureka: GestureDef = {
  id: 'eureka',
  duration: 1700,
  keys: [
    { at: 0, pose: { torsoY: 2, headY: 2, rHandX: 290, rHandY: 330, rCtrlX: 330, rCtrlY: 310 }, spring: { body: { f: 3, zeta: 0.7 } } },
    { at: 220, pose: { rHandX: 312, rHandY: 140, rCtrlX: 338, rCtrlY: 220, rDX: 0, rDY: -16, rHandRot: -82, rFist: 1, torsoY: -4, headY: -5, headRot: -2, hatY: -6, hatRot: 4 }, spring: { arm: { f: 4, zeta: 0.6 }, body: { f: 3, zeta: 0.6 }, face: { f: 6, zeta: 0.3 } } },
    { at: 600, pose: { hatY: 0, hatRot: 0 } },
    { at: 1100, pose: { ...R_REST, rFist: 0, torsoY: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 2.4, zeta: 0.82 }, body: calm } },
  ],
};

/** Вежливые аплодисменты красивому ходу соперника. */
const applause: GestureDef = {
  id: 'applause',
  duration: 1900,
  keys: [
    { at: 0, pose: { lHandX: 178, lHandY: 322, lCtrlX: 130, lCtrlY: 330, lDX: 14, lDY: -4, lHandRot: 60, rHandX: 242, rHandY: 322, rCtrlX: 290, rCtrlY: 330, rDX: -14, rDY: -4, rHandRot: 120, headY: -1 }, spring: { arm: { f: 3.2, zeta: 0.8 } } },
    { at: 450, pose: { lHandX: 190, rHandX: 230 }, spring: { arm: { f: 8, zeta: 0.6 } } },
    { at: 650, pose: { lHandX: 174, rHandX: 246 } },
    { at: 850, pose: { lHandX: 190, rHandX: 230 } },
    { at: 1050, pose: { lHandX: 174, rHandX: 246 } },
    { at: 1250, pose: { lHandX: 190, rHandX: 230 } },
    { at: 1450, pose: { ...L_REST, ...R_REST, headY: 0 }, spring: { arm: { f: 2.4, zeta: 0.85 } } },
  ],
};

/** Качает головой: «ай-ай-ай». */
const shakeHead: GestureDef = {
  id: 'shakeHead',
  duration: 1500,
  keys: [
    { at: 0, pose: { headRot: -4, headY: 1 }, spring: { head: { f: 3, zeta: 0.7 } } },
    { at: 300, pose: { headRot: 4 } },
    { at: 600, pose: { headRot: -3 } },
    { at: 900, pose: { headRot: 0, headY: 0 } },
  ],
};

/** Удивлён: отстраняется, хохолок вздрагивает. */
const surprised: GestureDef = {
  id: 'surprised',
  duration: 1500,
  keys: [
    { at: 0, pose: { torsoY: -4, headY: -5, headRot: 2, hatY: -5, hatRot: -3 }, spring: { body: { f: 3.2, zeta: 0.7 }, head: { f: 3.6, zeta: 0.7 }, face: { f: 6, zeta: 0.35 } } },
    { at: 500, pose: { hatY: 0, hatRot: 0 } },
    { at: 800, pose: { torsoY: -1, headY: -1 }, spring: { body: calm, head: calm } },
  ],
};

/** Разводит руками: «бывает». */
const shrug: GestureDef = {
  id: 'shrug',
  duration: 1700,
  keys: [
    { at: 0, pose: { torsoY: -3, headRot: 4, lHandX: 120, lHandY: 356, lCtrlX: 94, lCtrlY: 318, lHandRot: -20, rHandX: 300, rHandY: 356, rCtrlX: 326, rCtrlY: 318, rHandRot: 200 }, spring: { arm: { f: 2.8, zeta: 0.8 }, body: { f: 2.6, zeta: 0.8 } } },
    { at: 800, pose: { ...L_REST, ...R_REST, torsoY: 0, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 }, body: calm } },
  ],
};

/** Доволен: откидывается и гладит бородку. */
const satisfied: GestureDef = {
  id: 'satisfied',
  duration: 1900,
  keys: [
    { at: 0, pose: { torsoY: -3, torsoRot: -1, headY: -3, headRot: -2, rHandX: 240, rHandY: 240, rCtrlX: 332, rCtrlY: 286, rDX: -16, rDY: -8, rHandRot: -150 }, spring: { body: { f: 1.8, zeta: 0.85 }, arm: { f: 2.8, zeta: 0.8 } } },
    { at: 700, pose: { rHandY: 254 } },
    { at: 1050, pose: { ...R_REST, torsoY: 0, torsoRot: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 }, body: calm } },
  ],
};

/** Рука ко лбу: досада на собственный промах. */
const facepalm: GestureDef = {
  id: 'facepalm',
  duration: 1800,
  keys: [
    { at: 0, pose: { rHandX: 246, rHandY: 112, rCtrlX: 334, rCtrlY: 220, rDX: -22, rDY: -12, rHandRot: -140, headY: 3, headRot: -2 }, spring: { arm: { f: 3, zeta: 0.75 }, head: calm } },
    { at: 700, pose: { headRot: 2 } },
    { at: 1150, pose: { ...R_REST, headY: 0, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** «Позвольте объяснить»: ладонь вверх, лёгкий взмах. */
const lecture: GestureDef = {
  id: 'lecture',
  duration: 1800,
  keys: [
    { at: 0, pose: { rHandX: 314, rHandY: 262, rCtrlX: 340, rCtrlY: 320, rDX: -4, rDY: -10, rHandRot: -40, headRot: -2, gazeX: 0, gazeY: 0 }, spring: { arm: { f: 2.8, zeta: 0.78 } } },
    { at: 500, pose: { rHandX: 322, rHandY: 250, rHandRot: -30 } },
    { at: 800, pose: { rHandX: 308, rHandY: 266, rHandRot: -50 } },
    { at: 1250, pose: { ...R_REST, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** Учтивый поклон головой — признаёт поражение или благодарит за партию. */
const bow: GestureDef = {
  id: 'bow',
  duration: 1800,
  keys: [
    { at: 0, pose: { torsoY: 3, headY: 6, headRot: 0, gazeY: 0.9, lHandX: 196, lHandY: 300, lCtrlX: 150, lCtrlY: 330, lDX: 14, lDY: 0, lHandRot: 40 }, spring: { body: { f: 1.6, zeta: 0.9 }, head: { f: 1.8, zeta: 0.88 }, arm: { f: 2.4, zeta: 0.85 } } },
    { at: 900, pose: { torsoY: 0, headY: 0, gazeY: 0.1, ...L_REST }, spring: { body: calm, head: calm } },
  ],
};

/** Посмеивается. */
const chuckle: GestureDef = {
  id: 'chuckle',
  duration: 1200,
  keys: [
    { at: 0, pose: { torsoY: -2, headY: -3 }, spring: { body: { f: 4.2, zeta: 0.6 } } },
    { at: 200, pose: { torsoY: -0.5, headY: -1.5 } },
    { at: 400, pose: { torsoY: -2, headY: -3 } },
    { at: 650, pose: { torsoY: -1, headY: -2 } },
  ],
};

/** Смотрит на ход соперника: взгляд на доску, бровь вверх. */
const watchMove: GestureDef = {
  id: 'watchMove',
  duration: 1400,
  keys: [
    { at: 0, pose: { gazeX: 0, gazeY: 0.8, headY: 2.5, browRI: -6, browRM: -11 }, spring: { head: calm } },
    { at: 700, pose: { headY: 1 } },
  ],
};

/**
 * Ход: ближняя к цели рука тянется к доске (front — над фигурами), касается фигуры (release — фигура начинает
 * свой прыжок по доске) и возвращается. Цель — точка доски в единицах рига; рука дотягивается до края стола.
 */
function moveOnBoard(target: ThrowTarget): GestureDef {
  const right = target.x >= 210;
  const m = (p: Pose): Pose => (right ? p : mirror(p));
  const tx = right ? target.x : 420 - target.x;
  const hx = clamp(tx, 236, 340);
  const hy = clamp(target.y, 396, 470);
  const gx = clamp((target.x - 210) / 260, -0.9, 0.9);
  const side = right ? 'r' : 'l';
  return {
    id: 'move',
    duration: 1500,
    keys: [
      { at: 0, pose: { ...m({ rHandX: hx, rHandY: 352, rCtrlX: hx + 50, rCtrlY: 320, rDX: -10, rDY: 4, rHandRot: 140 }), gazeX: gx, gazeY: 0.95, headY: 2 }, spring: { arm: { f: 3, zeta: 0.8 } }, front: side },
      { at: 340, pose: { ...m({ rHandX: hx, rHandY: hy, rCtrlX: hx + 44, rCtrlY: 330, rDY: 8, rHandRot: 155 }), torsoY: 3, headY: 4 }, spring: { arm: { f: 3.6, zeta: 0.72 }, body: { f: 2, zeta: 0.8 } }, front: side },
      { at: 760, pose: { ...m({ rHandY: hy - 34 }), torsoY: 0, headY: 1.5 }, spring: { arm: { f: 3, zeta: 0.82 }, body: calm }, front: side },
      { at: 1000, pose: { ...(right ? R_REST : L_REST), headY: 0, gazeX: gx * 0.5, gazeY: 0.6 }, spring: { arm: { f: 2.4, zeta: 0.85 } }, front: false },
    ],
    markers: [{ at: 560, name: 'release' }],
  };
}

/** Забирает сбитую фигуру к краю доски (свои взятые — у верхнего левого края). */
function collect(target: ThrowTarget): GestureDef {
  const g = moveOnBoard(target);
  return { ...g, id: 'collect', markers: [{ at: 560, name: 'grab' }] };
}

// ---------- состояния ----------

const IDLE: StateDef = {
  pose: {},
  looks: [
    { x: 0, y: 0.1, weight: 3 },
    { x: 0, y: 0.85, weight: 4 },
    { x: -0.35, y: 0.7, weight: 2 },
    { x: 0.35, y: 0.7, weight: 2 },
    { x: 0.7, y: -0.2, weight: 1 },
  ],
  saccade: [1300, 3800],
  fidgets: [adjustGlasses, strokeGoatee, smoothHair, nodThought],
  fidgetEvery: [6000, 12000],
  wander: 0.65,
};

// Думает: пальцы у бородки, взгляд по доске, изредка — «в потолок».
const THINK: StateDef = {
  pose: { rHandX: 240, rHandY: 240, rCtrlX: 332, rCtrlY: 286, rDX: -16, rDY: -8, rHandRot: -150, headRot: 2.5, headY: 1.5, torsoRot: 0.5 },
  looks: [
    { x: 0, y: 0.85, weight: 4 },
    { x: -0.3, y: 0.7, weight: 2 },
    { x: 0.3, y: 0.7, weight: 2 },
    { x: 0.3, y: -0.6, weight: 1 },
  ],
  saccade: [900, 2400],
  fidgets: [tapTemple, nodThought],
  fidgetEvery: [2200, 4600],
  wander: 0.4,
};

// Потерял фигуру: насупился, смотрит на доску.
const TOOK: StateDef = {
  pose: { torsoY: 1.5, headY: 2, headRot: -1.5 },
  looks: [{ x: 0, y: 0.85, weight: 3 }, { x: 0, y: 0.2, weight: 1 }],
  saccade: [1300, 2600],
  fidgets: [shakeHead],
  fidgetEvery: [900, 1600],
  wander: 0.35,
};

// Победа: палец вверх (art.ts, POSE_ARMS.victory), взгляд на игрока.
const FINGER_UP: Pose = { rHandX: 312, rHandY: 140, rCtrlX: 338, rCtrlY: 220, rDX: 0, rDY: -16, rHandRot: -82, rFist: 1 };
const fingerWag: GestureDef = {
  id: 'fingerWag',
  duration: 1100,
  keys: [
    { at: 0, pose: { rHandRot: -70, rHandX: 316 }, spring: { arm: { f: 5, zeta: 0.6 } } },
    { at: 250, pose: { rHandRot: -94, rHandX: 308 } },
    { at: 500, pose: { rHandRot: -72, rHandX: 316 } },
    { at: 750, pose: { rHandRot: -82, rHandX: 312 } },
  ],
};
/** Вход в победу — «эврика» без возврата руки: палец остаётся поднятым. */
const victoryBurst: GestureDef = { id: 'victoryBurst', duration: 1100, keys: eureka.keys.slice(0, 3) };
const VICTORY: StateDef = {
  pose: { ...FINGER_UP, headY: -2, torsoY: -1 },
  looks: [{ x: 0, y: 0, weight: 3 }, { x: 0, y: 0.8, weight: 1 }],
  saccade: [1300, 2600],
  fidgets: [fingerWag, chuckle],
  fidgetEvery: [1500, 2800],
  wander: 0.4,
  enter: victoryBurst,
};

export const KHARITON_MOTION: MotionStyle = {
  springs: {
    body: { f: 1.6, zeta: 0.8 },
    head: { f: 2.2, zeta: 0.72 },
    gaze: { f: 7.5, zeta: 1 },
    face: { f: 4.4, zeta: 0.82 },
    arm: { f: 2.8, zeta: 0.75 },
  },
  rest: REST,
  states: { idle: IDLE, think: THINK, took: TOOK, victory: VICTORY },
  faces: FACES,
  breath: { period: [3.6, 4.8], depth: 0.011 },
  wander: { headRot: 1.2, headX: 1.2, headY: 0.8, torsoRot: 0.8, torsoX: 1.8, shiftEvery: [5500, 11000] },
  blink: { every: [2200, 5600], double: 0.18, ms: 170 },
  // Хохолок пружинит заметно — фирменная «чудаковатость»; пучка, серёжек и бахромы нет.
  secondary: {
    bun: { f: 2, zeta: 0.5 }, earrings: { f: 2, zeta: 0.5 }, bunGain: 0, earGain: 0,
    bangs: { f: 3, zeta: 0.3 }, bangsGain: 1.4, bangsMax: 5, bangsLift: 1.2,
    fringe: { f: 2, zeta: 0.5 }, fringeGain: 0, fringeMax: 0,
  },
  eyeSwap: { close: 80, open: 100, pop: { f: 4.4, zeta: 0.5 }, size: { ball: [10, 11.5], wide: [11.5, 13.5], star: [11, 12.5], happy: [10, 6], closed: [10, 4] } },
  gazeHead: { rot: 2, y: 2 },
  throwCard: moveOnBoard,
  takeCards: collect,
  scenes: kharitonScenes(REST),
  gestures: {
    move: (t) => moveOnBoard(t ?? { x: 260, y: 440 }),
    collect: (t) => collect(t ?? { x: 120, y: 420 }),
    eureka: () => eureka,
    applause: () => applause,
    shakeHead: () => shakeHead,
    surprised: () => surprised,
    shrug: () => shrug,
    satisfied: () => satisfied,
    facepalm: () => facepalm,
    lecture: () => lecture,
    bow: () => bow,
    chuckle: () => chuckle,
    watchMove: () => watchMove,
    adjustGlasses: () => adjustGlasses,
    strokeGoatee: () => strokeGoatee,
  },
};
