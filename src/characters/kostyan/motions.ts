// Движения Костяна: характер пружин, позы, лица эмоций, мелкие действия и жесты партии — только данные.
// Костян молод и заводной: движения быстрые, с перелётом; не сидит спокойно — качает головой в такт,
// поправляет наушники и чуб, барабанит по столу; радуется бурно (кулак «йес!»), досадует так же бурно.
import type { SpringParams } from '../../puppet/motion';
import { clamp } from '../../puppet/motion';
import type { Face, GestureDef, MotionStyle, Pose, StateDef, ThrowTarget } from '../../puppet/types';

const REST = {
  torsoRot: 0, torsoX: 0, torsoY: 0,
  headRot: 0, headX: 0, headY: 0,
  gazeX: 0, gazeY: 0, pupil: 1,
  lidLI: -10, lidLO: -10, lidRI: -10, lidRO: -10,
  browLI: 0, browLO: 1, browLM: -3, browRI: 0, browRO: 1, browRM: -3,
  blush: 0.35,
  lHandX: 146, lHandY: 386, lCtrlX: 96, lCtrlY: 332, lDX: 16, lDY: 8, lHandRot: 10,
  rHandX: 274, rHandY: 386, rCtrlX: 324, rCtrlY: 332, rDX: -16, rDY: 8, rHandRot: 170,
  fanAlpha: 0,
} satisfies Pose;

type Brow = readonly [number, number, number];
const BROW = {
  neutral: [0, 1, -3], happy: [-2, 2, -7], raised: [-10, -6, -15], annoyed: [9, -6, 2], sad: [-8, 6, -3],
  slyUp: [-9, -8, -14], slyDown: [6, 2, 1], frown: [8, -2, 2],
} as const satisfies Record<string, Brow>;
const brows = (l: Brow, r: Brow = l): Pose => ({ browLI: l[0], browLO: l[1], browLM: l[2], browRI: r[0], browRO: r[1], browRM: r[2] });
const lids = (i: number, o: number): Pose => ({ lidLI: i, lidLO: o, lidRI: i, lidRO: o });
const NO_LID = lids(-14, -14);

const face = (eyes: Face['eyes'], pose: Pose, look: readonly [number, number] = [0, 1], extras = false, speechMax?: number): Face =>
  ({ eyes, pose: { ...lids(-10, -10), pupil: 1, blush: 0.35, ...pose }, look, extras, speechMax });

const FACES: MotionStyle['faces'] = {
  warm: face('ball', brows(BROW.neutral)),
  sly: face('ball', { ...brows(BROW.slyDown, BROW.slyUp), ...lids(-2, 3) }, [4, 1]),
  laugh: face('happy', { ...brows(BROW.happy), blush: 0.7 }, [0, 1], true),
  azart: face('star', { ...brows(BROW.raised), ...NO_LID, blush: 0.55, pupil: 6.4 / 6 }, [0, 1], true),
  surprise: face('wide', { ...brows(BROW.raised), ...NO_LID, pupil: 4.8 / 6 }),
  think: face('ball', brows(BROW.frown, BROW.slyUp), [4, -4]),
  annoyed: face('ball', { ...brows(BROW.annoyed), ...lids(-1, -4), pupil: 5.8 / 6 }, [0, 1], true, 1),
  sad: face('ball', { ...brows(BROW.sad), ...lids(-8, 0), pupil: 5.8 / 6, blush: 0.2 }, [-1, 4], true, 1),
};

function pick(p: Pose, ...keys: (keyof Pose)[]): Pose {
  const out: Pose = {};
  for (const k of keys) out[k] = p[k];
  return out;
}
const R_REST = pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot');
const L_REST = pick(REST, 'lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot');
const snap: SpringParams = { f: 3.2, zeta: 0.7 };

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

/** Качает головой в такт — будто в наушниках ещё играет трек. */
const headBob: GestureDef = {
  id: 'headBob',
  duration: 1700,
  keys: [
    { at: 0, pose: { headY: 2, headRot: 1.5 }, spring: { head: { f: 5, zeta: 0.55 } } },
    { at: 280, pose: { headY: -0.5, headRot: -1 } },
    { at: 560, pose: { headY: 2, headRot: 1.5 } },
    { at: 840, pose: { headY: -0.5, headRot: -1 } },
    { at: 1120, pose: { headY: 1.5, headRot: 1 } },
    { at: 1400, pose: { headY: 0, headRot: 0 } },
  ],
};

/** Поправляет наушник на шее. */
const fixHeadphones: GestureDef = {
  id: 'fixHeadphones',
  duration: 1400,
  keys: [
    { at: 0, pose: { rHandX: 270, rHandY: 282, rCtrlX: 330, rCtrlY: 320, rDX: -14, rDY: -6, rHandRot: -160, headRot: 2, gazeY: 0.5 }, spring: { arm: { f: 3.6, zeta: 0.72 } } },
    { at: 450, pose: { rHandY: 272, rHandX: 266 } },
    { at: 750, pose: { ...R_REST, headRot: 0 }, spring: { arm: { f: 3, zeta: 0.8 } } },
  ],
};

/** Откидывает чуб пятернёй — чуб пружинит. */
const fixFringe: GestureDef = {
  id: 'fixFringe',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 256, rHandY: 84, rCtrlX: 336, rCtrlY: 200, rDX: -18, rDY: -12, rHandRot: -150, headRot: -2, headY: 1 }, spring: { arm: { f: 3.6, zeta: 0.72 } } },
    { at: 420, pose: { rHandX: 290, rHandY: 70, hatY: -3, hatRot: 3 }, spring: { arm: { f: 4, zeta: 0.75 }, face: { f: 6, zeta: 0.35 } } },
    { at: 700, pose: { ...R_REST, headRot: 0, headY: 0, hatY: 0, hatRot: 0 }, spring: { arm: { f: 3, zeta: 0.8 } } },
  ],
};

/** Барабанит пальцами — не терпится. */
const drumFingers: GestureDef = {
  id: 'drumFingers',
  duration: 1200,
  keys: [
    { at: 0, pose: { rHandRot: 160, rDY: 6 }, spring: { arm: { f: 9, zeta: 0.55 } } },
    { at: 140, pose: { rHandRot: 177, rDY: 9 } },
    { at: 280, pose: { rHandRot: 162, rDY: 6 } },
    { at: 420, pose: { rHandRot: 178, rDY: 9 } },
    { at: 560, pose: { rHandRot: 164, rDY: 7 } },
    { at: 700, pose: { rHandRot: 178, rDY: 9 } },
    { at: 840, pose: { rHandRot: 170, rDY: 8 } },
  ],
};

/** Разминает шею: голова к одному плечу, к другому. */
const neckStretch: GestureDef = {
  id: 'neckStretch',
  duration: 1600,
  keys: [
    { at: 0, pose: { headRot: 6, headX: 2, gazeY: -0.2 }, spring: { head: { f: 2.6, zeta: 0.75 } } },
    { at: 600, pose: { headRot: -6, headX: -2 } },
    { at: 1150, pose: { headRot: 0, headX: 0 } },
  ],
};

const tapChin: GestureDef = {
  id: 'tapChin',
  duration: 1200,
  keys: [
    { at: 0, pose: { rHandY: 228 }, spring: { arm: { f: 7, zeta: 0.55 } } },
    { at: 200, pose: { rHandY: 236 } },
    { at: 400, pose: { rHandY: 228 } },
    { at: 600, pose: { rHandY: 236 } },
  ],
};

// ---------- реакции ----------

/** «Йес!»: кулак рывком к себе, корпус вперёд. */
const fistPump: GestureDef = {
  id: 'fistPump',
  duration: 1300,
  keys: [
    { at: 0, pose: { rHandX: 300, rHandY: 196, rCtrlX: 340, rCtrlY: 280, rDX: -6, rDY: -14, rHandRot: -80, rFist: 1, torsoY: -2, headY: -2 }, spring: { arm: { f: 5, zeta: 0.6 }, body: snap } },
    { at: 300, pose: { rHandX: 286, rHandY: 300, rCtrlX: 336, rCtrlY: 310, rHandRot: -120, torsoY: 3, headY: 3, headRot: -2 }, spring: { arm: { f: 7, zeta: 0.55 }, body: { f: 4, zeta: 0.55 } } },
    { at: 650, pose: { ...R_REST, rFist: 0, torsoY: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 3.4, zeta: 0.75 }, body: snap } },
  ],
};

/** Ладонь на лицо: «ну как так-то». */
const facepalm: GestureDef = {
  id: 'facepalm',
  duration: 1600,
  keys: [
    { at: 0, pose: { rHandX: 250, rHandY: 138, rCtrlX: 336, rCtrlY: 240, rDX: -24, rDY: -8, rHandRot: -150, headY: 4, headRot: -3, torsoY: 2 }, spring: { arm: { f: 4.4, zeta: 0.68 }, head: snap } },
    { at: 650, pose: { headRot: 3 } },
    { at: 1000, pose: { ...R_REST, headY: 0, headRot: 0, torsoY: 0 }, spring: { arm: { f: 3, zeta: 0.8 } } },
  ],
};

/** Хватается за голову обеими руками. */
const handsOnHead: GestureDef = {
  id: 'handsOnHead',
  duration: 1800,
  keys: [
    { at: 0, pose: { lHandX: 152, lHandY: 92, lCtrlX: 86, lCtrlY: 200, lDX: 14, lDY: -10, lHandRot: -40, rHandX: 268, rHandY: 92, rCtrlX: 334, rCtrlY: 200, rDX: -14, rDY: -10, rHandRot: 220, torsoY: -3, headY: -2, hatY: 2 }, spring: { arm: { f: 4, zeta: 0.68 }, body: snap } },
    { at: 1100, pose: { ...L_REST, ...R_REST, torsoY: 0, headY: 0, hatY: 0 }, spring: { arm: { f: 3, zeta: 0.8 }, body: snap } },
  ],
};

const surprised: GestureDef = {
  id: 'surprised',
  duration: 1300,
  keys: [
    { at: 0, pose: { torsoY: -5, headY: -6, headRot: 2, hatY: -4 }, spring: { body: { f: 4, zeta: 0.6 }, head: { f: 4.4, zeta: 0.6 }, face: { f: 6, zeta: 0.4 } } },
    { at: 650, pose: { torsoY: -1, headY: -1, hatY: 0 }, spring: { body: snap, head: snap } },
  ],
};

const shrug: GestureDef = {
  id: 'shrug',
  duration: 1400,
  keys: [
    { at: 0, pose: { torsoY: -4, headRot: 5, lHandX: 118, lHandY: 352, lCtrlX: 90, lCtrlY: 316, lHandRot: -25, rHandX: 302, rHandY: 352, rCtrlX: 330, rCtrlY: 316, rHandRot: 205 }, spring: { arm: { f: 3.6, zeta: 0.7 }, body: snap } },
    { at: 650, pose: { ...L_REST, ...R_REST, torsoY: 0, headRot: 0 }, spring: { arm: { f: 3, zeta: 0.8 }, body: snap } },
  ],
};

/** Ухмыляется и подаётся вперёд — «смотри, что сейчас будет». */
const leanIn: GestureDef = {
  id: 'leanIn',
  duration: 1400,
  keys: [
    { at: 0, pose: { torsoY: 4, headY: 5, headRot: -3, gazeY: 0.2 }, spring: { body: snap, head: snap } },
    { at: 850, pose: { torsoY: 0, headY: 0, headRot: 0 } },
  ],
};

/** Короткие хлопки — оценил ход соперника, хоть и неохотно. */
const respectClap: GestureDef = {
  id: 'respectClap',
  duration: 1300,
  keys: [
    { at: 0, pose: { lHandX: 182, lHandY: 318, lCtrlX: 130, lCtrlY: 330, lDX: 14, lDY: -4, lHandRot: 60, rHandX: 238, rHandY: 318, rCtrlX: 290, rCtrlY: 330, rDX: -14, rDY: -4, rHandRot: 120 }, spring: { arm: { f: 4.4, zeta: 0.7 } } },
    { at: 350, pose: { lHandX: 192, rHandX: 228 }, spring: { arm: { f: 9, zeta: 0.55 } } },
    { at: 520, pose: { lHandX: 178, rHandX: 242 } },
    { at: 690, pose: { lHandX: 192, rHandX: 228 } },
    { at: 860, pose: { ...L_REST, ...R_REST }, spring: { arm: { f: 3, zeta: 0.8 } } },
  ],
};

const chuckle: GestureDef = {
  id: 'chuckle',
  duration: 1100,
  keys: [
    { at: 0, pose: { torsoY: -2.5, headY: -3.5 }, spring: { body: { f: 5, zeta: 0.5 } } },
    { at: 180, pose: { torsoY: -0.5, headY: -1 } },
    { at: 360, pose: { torsoY: -2.5, headY: -3.5 } },
    { at: 600, pose: { torsoY: -1, headY: -1.5 } },
  ],
};

const watchMove: GestureDef = {
  id: 'watchMove',
  duration: 1200,
  keys: [
    { at: 0, pose: { gazeX: 0, gazeY: 0.85, headY: 3, torsoY: 1.5, browLI: 3, browRI: 3 }, spring: { head: snap, body: snap } },
    { at: 650, pose: { headY: 1, torsoY: 0 } },
  ],
};

/** Ход: быстрая рука к доске, касание (release), назад. */
function moveOnBoard(target: ThrowTarget): GestureDef {
  const right = target.x >= 210;
  const m = (p: Pose): Pose => (right ? p : mirror(p));
  const tx = right ? target.x : 420 - target.x;
  const hx = clamp(tx, 236, 344);
  const hy = clamp(target.y, 396, 474);
  const gx = clamp((target.x - 210) / 260, -0.9, 0.9);
  const side = right ? 'r' : 'l';
  return {
    id: 'move',
    duration: 1150,
    keys: [
      { at: 0, pose: { ...m({ rHandX: hx, rHandY: 350, rCtrlX: hx + 50, rCtrlY: 320, rDX: -10, rDY: 4, rHandRot: 140 }), gazeX: gx, gazeY: 0.95, headY: 2 }, spring: { arm: { f: 4.4, zeta: 0.72 } }, front: side },
      { at: 230, pose: { ...m({ rHandX: hx, rHandY: hy, rCtrlX: hx + 44, rCtrlY: 330, rDY: 8, rHandRot: 155 }), torsoY: 3.5, headY: 4 }, spring: { arm: { f: 5, zeta: 0.65 }, body: snap }, front: side },
      { at: 560, pose: { ...m({ rHandY: hy - 36 }), torsoY: 0, headY: 1.5 }, spring: { arm: { f: 4, zeta: 0.75 } }, front: side },
      { at: 760, pose: { ...(right ? R_REST : L_REST), headY: 0, gazeX: gx * 0.5, gazeY: 0.6 }, spring: { arm: { f: 3.4, zeta: 0.78 } }, front: false },
    ],
    markers: [{ at: 400, name: 'release' }],
  };
}

function collect(target: ThrowTarget): GestureDef {
  return { ...moveOnBoard(target), id: 'collect', markers: [{ at: 400, name: 'grab' }] };
}

// ---------- состояния ----------

const IDLE: StateDef = {
  pose: {},
  looks: [
    { x: 0, y: 0.1, weight: 4 },
    { x: 0, y: 0.85, weight: 3 },
    { x: -0.4, y: 0.6, weight: 2 },
    { x: 0.4, y: 0.6, weight: 2 },
    { x: 0.8, y: -0.1, weight: 1 },
  ],
  saccade: [900, 2800],
  fidgets: [headBob, fixHeadphones, fixFringe, drumFingers, neckStretch],
  fidgetEvery: [4200, 9000],
  wander: 0.9,
};

// Думает: кулак под подбородком (art.ts, POSE_ARMS.think), прищур, взгляд по доске.
const THINK: StateDef = {
  pose: { rHandX: 262, rHandY: 232, rCtrlX: 336, rCtrlY: 296, rDX: -14, rDY: -12, rHandRot: -150, rFist: 1, headRot: 2, headY: 2, torsoY: 1.5 },
  looks: [
    { x: 0, y: 0.85, weight: 4 },
    { x: -0.35, y: 0.7, weight: 2 },
    { x: 0.35, y: 0.7, weight: 2 },
  ],
  saccade: [700, 1900],
  fidgets: [tapChin],
  fidgetEvery: [1600, 3200],
  wander: 0.5,
};

const TOOK: StateDef = {
  pose: { torsoY: 2, headY: 3, headRot: -2 },
  looks: [{ x: 0, y: 0.85, weight: 3 }, { x: 0.2, y: 0.1, weight: 1 }],
  saccade: [1000, 2200],
  fidgets: [drumFingers],
  fidgetEvery: [800, 1500],
  wander: 0.45,
};

// Победа: оба кулака вверх (art.ts, POSE_ARMS.victory).
const FISTS_UP: Pose = {
  lHandX: 104, lHandY: 134, lCtrlX: 80, lCtrlY: 214, lDX: 0, lDY: -16, lHandRot: -100, lFist: 1,
  rHandX: 316, rHandY: 134, rCtrlX: 340, rCtrlY: 214, rDX: 0, rDY: -16, rHandRot: -80, rFist: 1,
};
const victoryBurst: GestureDef = {
  id: 'victoryBurst',
  duration: 1200,
  keys: [
    { at: 0, pose: { torsoY: 3, headY: 3 }, spring: { body: { f: 4, zeta: 0.7 } } },
    { at: 160, pose: { ...FISTS_UP, torsoY: -5, headY: -6, headRot: -2, hatY: -4 }, spring: { arm: { f: 4.6, zeta: 0.5 }, body: { f: 3.4, zeta: 0.5 }, head: { f: 3.6, zeta: 0.5 }, face: { f: 6, zeta: 0.35 } } },
    { at: 700, pose: { torsoY: -1, headY: -2, headRot: 0, hatY: 0 } },
  ],
};
const fistShake: GestureDef = {
  id: 'fistShake',
  duration: 1000,
  keys: [
    { at: 0, pose: { rHandY: 148, lHandY: 120 }, spring: { arm: { f: 6, zeta: 0.55 } } },
    { at: 220, pose: { rHandY: 120, lHandY: 148 } },
    { at: 440, pose: { rHandY: 146, lHandY: 122 } },
    { at: 660, pose: { rHandY: 134, lHandY: 134 } },
  ],
};
const VICTORY: StateDef = {
  pose: { ...FISTS_UP, headY: -2, torsoY: -1 },
  looks: [{ x: 0, y: 0, weight: 3 }, { x: 0.3, y: -0.2, weight: 1 }],
  saccade: [1000, 2200],
  fidgets: [fistShake, chuckle],
  fidgetEvery: [1200, 2400],
  wander: 0.5,
  enter: victoryBurst,
};

export const KOSTYAN_MOTION: MotionStyle = {
  springs: {
    body: { f: 2.2, zeta: 0.7 },
    head: { f: 2.8, zeta: 0.62 },
    gaze: { f: 9, zeta: 1 },
    face: { f: 5, zeta: 0.78 },
    arm: { f: 3.6, zeta: 0.68 },
  },
  rest: REST,
  states: { idle: IDLE, think: THINK, took: TOOK, victory: VICTORY },
  faces: FACES,
  breath: { period: [3, 4], depth: 0.012 },
  wander: { headRot: 1.6, headX: 1.6, headY: 1, torsoRot: 1.1, torsoX: 2.4, shiftEvery: [3500, 8000] },
  blink: { every: [1800, 4800], double: 0.2, ms: 150 },
  secondary: {
    bun: { f: 2, zeta: 0.5 }, earrings: { f: 2, zeta: 0.5 }, bunGain: 0, earGain: 0,
    bangs: { f: 3.6, zeta: 0.4 }, bangsGain: 0.9, bangsMax: 3, bangsLift: 1,
    fringe: { f: 2, zeta: 0.5 }, fringeGain: 0, fringeMax: 0,
  },
  eyeSwap: { close: 60, open: 80, pop: { f: 5.5, zeta: 0.45 }, size: { ball: [11, 12.5], wide: [12.5, 14.5], star: [12, 13.5], happy: [11, 6], closed: [11, 4] } },
  gazeHead: { rot: 2.4, y: 2.2 },
  throwCard: moveOnBoard,
  takeCards: collect,
  gestures: {
    move: (t) => moveOnBoard(t ?? { x: 260, y: 440 }),
    collect: (t) => collect(t ?? { x: 120, y: 420 }),
    fistPump: () => fistPump,
    facepalm: () => facepalm,
    handsOnHead: () => handsOnHead,
    surprised: () => surprised,
    shrug: () => shrug,
    leanIn: () => leanIn,
    respectClap: () => respectClap,
    chuckle: () => chuckle,
    watchMove: () => watchMove,
    fixHeadphones: () => fixHeadphones,
    fixFringe: () => fixFringe,
  },
};
