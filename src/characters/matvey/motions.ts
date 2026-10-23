// Движения Деда Матвея: характер пружин, позы, лица эмоций, мелкие действия и жесты партии — только данные.
// Матвей сдержан: движения медленнее и мягче, чем у Агаты, без перелётов; взгляд неторопливый, жесты короткие
// и выразительные — погладить усы, тронуть кепку, постучать костяшками.
import type { SpringParams } from '../../puppet/motion';
import { clamp } from '../../puppet/motion';
import type { Face, GestureDef, MotionStyle, Pose, StateDef, ThrowTarget } from '../../puppet/types';

// Нейтральная поза — рисунок «ожидание» (art.ts, POSE_ARMS.idle): руки на столе за своими костями.
const REST = {
  torsoRot: 0, torsoX: 0, torsoY: 0,
  headRot: 0, headX: 0, headY: 0,
  gazeX: 0, gazeY: 0, pupil: 1,
  lidLI: -6, lidLO: -6, lidRI: -6, lidRO: -6,
  browLI: 2, browLO: 0, browLM: -4, browRI: 2, browRO: 0, browRM: -4,
  blush: 0.35,
  lHandX: 150, lHandY: 384, lCtrlX: 104, lCtrlY: 330, lDX: 16, lDY: 8, lHandRot: 10,
  rHandX: 270, rHandY: 384, rCtrlX: 316, rCtrlY: 330, rDX: -16, rDY: 8, rHandRot: 170,
  fanAlpha: 0,
} satisfies Pose;

// Брови рисунка: [внутренний конец, внешний, середина] (art.ts, brow()).
type Brow = readonly [number, number, number];
const BROW = {
  neutral: [2, 0, -4], happy: [-1, 2, -8], raised: [-9, -6, -15], annoyed: [8, -6, 0], sad: [-7, 6, -4],
  slyUp: [-8, -8, -14], slyDown: [5, 2, 0], frown: [6, -2, 1],
} as const satisfies Record<string, Brow>;
const brows = (l: Brow, r: Brow = l): Pose => ({ browLI: l[0], browLO: l[1], browLM: l[2], browRI: r[0], browRO: r[1], browRM: r[2] });
const lids = (i: number, o: number): Pose => ({ lidLI: i, lidLO: o, lidRI: i, lidRO: o });
// Веко выше белка (широко раскрытые глаза, азарт) — его не видно.
const NO_LID = lids(-12, -12);

const face = (eyes: Face['eyes'], pose: Pose, look: readonly [number, number] = [0, 1], extras = false, speechMax?: number): Face =>
  ({ eyes, pose: { ...lids(-6, -6), pupil: 1, blush: 0.35, ...pose }, look, extras, speechMax });

// Лица эмоций — те же, что в art.ts (EXPR): глаза небольшие, эмоцию несут брови и веки.
const FACES: MotionStyle['faces'] = {
  warm: face('ball', brows(BROW.neutral), [0, 1], true),
  sly: face('ball', { ...brows(BROW.slyDown, BROW.slyUp), ...lids(-1, 2) }, [4, 1]),
  laugh: face('happy', { ...brows(BROW.happy), blush: 0.7 }, [0, 1], true),
  azart: face('star', { ...brows(BROW.raised), ...NO_LID, blush: 0.55, pupil: 5.6 / 5.2 }, [0, 1], true),
  surprise: face('wide', { ...brows(BROW.raised), ...NO_LID, pupil: 4.2 / 5.2 }),
  think: face('ball', brows(BROW.frown, BROW.slyUp), [4, -4]),
  // Ворчит и грустит — рот при речи не раскрывается до смеющегося.
  annoyed: face('ball', { ...brows(BROW.annoyed), ...lids(-2, -2), pupil: 5 / 5.2 }, [0, 1], true, 1),
  sad: face('ball', { ...brows(BROW.sad), ...lids(-6, 0), pupil: 5 / 5.2, blush: 0.2 }, [-1, 4], true, 1),
};

function pick(p: Pose, ...keys: (keyof Pose)[]): Pose {
  const out: Pose = {};
  for (const k of keys) out[k] = p[k];
  return out;
}
const R_REST = pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot');
const L_REST = pick(REST, 'lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot');
const calm: SpringParams = { f: 2.2, zeta: 0.85 };

// ---------- мелкие действия ----------

/** Поглаживает усы: кисть к усам, проводит по ним раз-другой, возвращается. */
const strokeMustache: GestureDef = {
  id: 'strokeMustache',
  duration: 2100,
  keys: [
    { at: 0, pose: { rHandX: 236, rHandY: 200, rCtrlX: 330, rCtrlY: 272, rDX: -14, rDY: -12, rHandRot: -160, headRot: 1.5, gazeY: 0.5 }, spring: { arm: { f: 2.6, zeta: 0.82 } } },
    { at: 650, pose: { rHandX: 222, rDX: -16 }, spring: { arm: { f: 3, zeta: 0.85 } } },
    { at: 950, pose: { rHandX: 240, rDX: -12 } },
    { at: 1250, pose: { rHandX: 226, rDX: -16 } },
    { at: 1500, pose: { ...R_REST, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** Поправляет кепку: кисть к козырьку, кепка чуть сдвигается и садится на место. */
const adjustCap: GestureDef = {
  id: 'adjustCap',
  duration: 1900,
  keys: [
    { at: 0, pose: { rHandX: 284, rHandY: 96, rCtrlX: 340, rCtrlY: 210, rDX: -4, rDY: -6, rHandRot: -70, headRot: -1, gazeY: -0.2 }, spring: { arm: { f: 2.4, zeta: 0.82 } } },
    { at: 700, pose: { hatRot: 3, hatY: -2 }, spring: { face: { f: 4, zeta: 0.8 } } },
    { at: 1000, pose: { hatRot: 0, hatY: 0 } },
    { at: 1150, pose: { ...R_REST, headRot: 0, gazeY: 0.1 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/** Барабанит пальцами по столу. */
const drumFingers: GestureDef = {
  id: 'drumFingers',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandRot: 160, rDY: 6 }, spring: { arm: { f: 7, zeta: 0.6 } } },
    { at: 200, pose: { rHandRot: 176, rDY: 9 } },
    { at: 400, pose: { rHandRot: 162, rDY: 6 } },
    { at: 600, pose: { rHandRot: 177, rDY: 9 } },
    { at: 800, pose: { rHandRot: 165, rDY: 7 } },
    { at: 1000, pose: { rHandRot: 170, rDY: 8 } },
  ],
};

/** Поглядывает на свои кости и чуть кивает: прикидывает. */
const checkBones: GestureDef = {
  id: 'checkBones',
  duration: 1700,
  keys: [
    { at: 0, pose: { gazeX: 0.05, gazeY: 0.9, headRot: -1.5, headY: 2.5 }, spring: { head: calm } },
    { at: 800, pose: { headY: 1 } },
    { at: 1100, pose: { headY: 2.5 } },
  ],
};

/** «Мда…»: голова медленно склоняется, пальцы у подбородка. */
const hmmNod: GestureDef = {
  id: 'hmmNod',
  duration: 1600,
  keys: [
    { at: 0, pose: { headRot: 5, headY: 2, gazeX: 0.3, gazeY: 0.6 }, spring: { head: calm } },
    { at: 700, pose: { headY: 0 } },
    { at: 1050, pose: { headY: 1.5, headRot: 4 } },
  ],
};

// ---------- реакции (MotionStyle.gestures) ----------

/** Смотрит, как соперник кладёт кость: взгляд на цепочку, лёгкий кивок, бровь чуть вверх. */
const watchPlay: GestureDef = {
  id: 'watchPlay',
  duration: 1500,
  keys: [
    { at: 0, pose: { gazeX: 0.1, gazeY: 0.65, headY: 2, browRI: -4, browRM: -9 }, spring: { head: calm } },
    { at: 700, pose: { headY: 0.5 } },
    { at: 900, pose: { headY: 2 } },
  ],
};

/** Доволен: откидывается назад, проводит пальцем по усу. */
const satisfied: GestureDef = {
  id: 'satisfied',
  duration: 1900,
  keys: [
    { at: 0, pose: { torsoY: -3, torsoRot: -1, headY: -3, headRot: -2, rHandX: 236, rHandY: 204, rCtrlX: 330, rCtrlY: 272, rDX: -14, rDY: -12, rHandRot: -160 }, spring: { body: { f: 1.6, zeta: 0.85 }, arm: { f: 2.6, zeta: 0.82 } } },
    { at: 700, pose: { rHandX: 244 } },
    { at: 1000, pose: { ...R_REST, torsoY: 0, torsoRot: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 }, body: calm } },
  ],
};

/** Ворчит: медленно качает головой, плечи опускаются. */
const grumble: GestureDef = {
  id: 'grumble',
  duration: 1800,
  keys: [
    { at: 0, pose: { headRot: -3.5, torsoY: 2, headY: 2 }, spring: { head: { f: 2.4, zeta: 0.75 } } },
    { at: 450, pose: { headRot: 3.5 } },
    { at: 900, pose: { headRot: -2.5 } },
    { at: 1300, pose: { headRot: 0, torsoY: 0, headY: 0 } },
  ],
};

/** Удивлён: отстраняется назад, голова вверх. */
const surprised: GestureDef = {
  id: 'surprised',
  duration: 1500,
  keys: [
    { at: 0, pose: { torsoY: -4, headY: -5, headRot: 1.5, torsoRot: 0.6 }, spring: { body: { f: 3, zeta: 0.7 }, head: { f: 3.4, zeta: 0.7 } } },
    { at: 800, pose: { torsoY: -1, headY: -1 }, spring: { body: calm, head: calm } },
  ],
};

/** Пожимает плечами: «ну, бывает». */
const shrug: GestureDef = {
  id: 'shrug',
  duration: 1700,
  keys: [
    { at: 0, pose: { torsoY: -3, headRot: 4, lHandX: 124, lHandY: 360, lCtrlX: 96, lCtrlY: 320, lHandRot: -20, rHandX: 296, rHandY: 360, rCtrlX: 324, rCtrlY: 320, rHandRot: 200 }, spring: { arm: { f: 2.6, zeta: 0.8 }, body: { f: 2.4, zeta: 0.8 } } },
    { at: 800, pose: { ...L_REST, ...R_REST, torsoY: 0, headRot: 0 }, spring: { arm: { f: 2, zeta: 0.85 }, body: calm } },
  ],
};

/** Выиграл руку: откидывается, похлопывает ладонью по столу. */
const handWin: GestureDef = {
  id: 'handWin',
  duration: 1900,
  keys: [
    { at: 0, pose: { torsoY: -3, headY: -3, headRot: -2, rHandX: 286, rHandY: 352, rCtrlX: 330, rCtrlY: 320, rHandRot: 160 }, spring: { arm: { f: 3, zeta: 0.75 }, body: { f: 1.8, zeta: 0.8 } } },
    { at: 450, pose: { rHandY: 388 }, spring: { arm: { f: 7, zeta: 0.55 } } },
    { at: 700, pose: { rHandY: 360 } },
    { at: 900, pose: { rHandY: 388 } },
    { at: 1200, pose: { ...R_REST, torsoY: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 2.2, zeta: 0.85 }, body: calm } },
  ],
};

/** Проиграл руку: тяжело вздыхает, голова поникла и качнулась. */
const handLose: GestureDef = {
  id: 'handLose',
  duration: 2000,
  keys: [
    { at: 0, pose: { torsoY: -2.5, headY: -1.5 }, spring: { body: { f: 1.4, zeta: 0.9 } } },
    { at: 650, pose: { torsoY: 4, headY: 5, headRot: -3 }, spring: { body: { f: 1.2, zeta: 0.9 }, head: { f: 1.6, zeta: 0.85 } } },
    { at: 1200, pose: { headRot: 2 } },
    { at: 1550, pose: { headRot: 0, torsoY: 0, headY: 0 } },
  ],
};

/**
 * «Рыба!»: замах ладонью и шлепок по столу. Ладонь — у края стола справа от своих костей; руки над костями
 * (front), пока кисть над столом.
 */
const slap: GestureDef = {
  id: 'slap',
  duration: 1600,
  keys: [
    { at: 0, pose: { rHandX: 326, rHandY: 300, rCtrlX: 350, rCtrlY: 300, rDX: -10, rDY: 0, rHandRot: 150, torsoY: -3, torsoRot: 1.5, headY: -3 }, spring: { arm: { f: 3.6, zeta: 0.75 }, body: { f: 2.6, zeta: 0.75 } }, front: 'r' },
    { at: 380, pose: { rHandY: 404, rDY: 6, torsoY: 4, torsoRot: -1.5, headY: 4 }, spring: { arm: { f: 8, zeta: 0.5 }, body: { f: 4, zeta: 0.55 } }, front: 'r' },
    { at: 800, pose: { rHandY: 340, torsoY: 0, torsoRot: 0, headY: 0 }, spring: { arm: { f: 3, zeta: 0.8 }, body: calm }, front: 'r' },
    { at: 1050, pose: { ...R_REST }, front: false },
  ],
  markers: [{ at: 470, name: 'slap' }],
};

/** Стучит костяшками по столу дважды: хода нет. Кулак — у края стола справа от своих костей. */
const knock: GestureDef = {
  id: 'knock',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 322, rHandY: 352, rCtrlX: 348, rCtrlY: 318, rDX: -8, rDY: 0, rHandRot: 120, rFist: 1, headRot: -1.5 }, spring: { arm: { f: 3.4, zeta: 0.78 } }, front: 'r' },
    { at: 360, pose: { rHandY: 396 }, spring: { arm: { f: 9, zeta: 0.55 } }, front: 'r' },
    { at: 520, pose: { rHandY: 370 }, front: 'r' },
    { at: 680, pose: { rHandY: 396 }, front: 'r' },
    { at: 880, pose: { rHandY: 350, headRot: 0 }, spring: { arm: { f: 3, zeta: 0.8 } }, front: 'r' },
    { at: 1080, pose: { ...R_REST, rFist: 0 }, front: false },
  ],
  markers: [{ at: 420, name: 'tap' }],
};

/** Приподнимает кепку — уважение сопернику (проиграл матч, прощается). */
const capTip: GestureDef = {
  id: 'capTip',
  duration: 2200,
  keys: [
    { at: 0, pose: { rHandX: 282, rHandY: 92, rCtrlX: 340, rCtrlY: 210, rDX: -4, rDY: -6, rHandRot: -70, gazeY: 0 }, spring: { arm: { f: 2.4, zeta: 0.82 } } },
    { at: 650, pose: { hatY: -9, hatRot: 5, rHandY: 82, headRot: -3, headY: 2 }, spring: { face: { f: 3, zeta: 0.85 }, arm: { f: 3, zeta: 0.85 } } },
    { at: 1250, pose: { hatY: 0, hatRot: 0, rHandY: 92, headRot: 0, headY: 0 } },
    { at: 1500, pose: { ...R_REST }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
  ],
};

/**
 * Кладёт кость на стол к цепочке. Ближняя к цели рука берёт кость из своего ряда (pick), поднимает её над костями
 * (front), тянется к краю стола у цели и отпускает (release) — настоящая кость сцены летит из руки на место;
 * кисть поднимается над костями и возвращается за них.
 */
function placeBone(target: ThrowTarget): GestureDef {
  const right = target.x >= 210;
  // Правая рука — как есть; левая — зеркально относительно середины фигуры (x = 210).
  const m = (p: Pose): Pose => {
    if (right) return p;
    const out: Pose = {};
    for (const [k, v] of Object.entries(p) as [keyof Pose, number][]) {
      if (!k.startsWith('r') || k === 'rFist') {
        out[k] = v;
        continue;
      }
      const lk = ('l' + k.slice(1)) as keyof Pose;
      out[lk] = k === 'rHandX' || k === 'rCtrlX' ? 420 - v : k === 'rDX' ? -v : k === 'rHandRot' ? 180 - v : v;
    }
    return out;
  };
  const tx = right ? target.x : 420 - target.x;
  const sx = clamp(210 + (tx - 210) * 0.55 + 30, 230, 360);
  const gx = clamp((target.x - 210) / 260, -0.9, 0.9);
  const side = right ? 'r' : 'l';
  const restArm = right ? R_REST : L_REST;
  return {
    id: 'placeBone',
    duration: 1700,
    keys: [
      // К своим костям: кисть за ряд, к верху костей.
      { at: 0, pose: { ...m({ rHandX: 234, rHandY: 366, rCtrlX: 300, rCtrlY: 320, rDX: -10, rDY: 2, rHandRot: 140 }), gazeX: 0, gazeY: 0.85, headY: 2 }, spring: { arm: { f: 3, zeta: 0.8 } } },
      { at: 330, pose: {}, holdCard: true, holdHand: side },
      // Подняла кость над рядом.
      { at: 380, pose: { ...m({ rHandX: 250, rHandY: 318, rCtrlX: 318, rCtrlY: 296, rHandRot: 160 }), gazeX: gx, gazeY: 0.8 }, spring: { arm: { f: 3.4, zeta: 0.78 } }, holdCard: true, holdHand: side, front: side },
      // Тянется к краю стола у цели, корпус чуть вперёд.
      { at: 620, pose: { ...m({ rHandX: sx, rHandY: 410, rCtrlX: sx + 46, rCtrlY: 320, rDX: -8, rDY: 6, rHandRot: 150 }), torsoY: 3, headY: 4, gazeX: gx, gazeY: 0.95 }, spring: { arm: { f: 3.4, zeta: 0.72 }, body: { f: 2, zeta: 0.8 } }, holdCard: true, holdHand: side, front: side },
      { at: 900, pose: {}, holdCard: false, holdHand: side, front: side },
      // Кисть поднимается над костями…
      { at: 1050, pose: { ...m({ rHandX: 262, rHandY: 322, rCtrlX: 318, rCtrlY: 300, rDY: 2 }), torsoY: 0, headY: 1, gazeX: gx * 0.5, gazeY: 0.6 }, spring: { arm: { f: 2.8, zeta: 0.82 }, body: calm }, front: side },
      // …и опускается за них.
      { at: 1350, pose: { ...restArm, headY: 0, gazeX: 0, gazeY: 0.2 }, spring: { arm: { f: 2.4, zeta: 0.85 } }, front: false },
    ],
    markers: [{ at: 330, name: 'pick' }, { at: 900, name: 'release' }],
  };
}

/**
 * Берёт кость из базара: левая рука тянется к базару над столом (front), берёт кость (grab), несёт к своему ряду,
 * поднимает над костями и ставит (release) — кость появляется в ряду; кисть уходит за ряд.
 */
function takeFromBazaar(target: ThrowTarget): GestureDef {
  const bx = clamp(target.x * 0.5 + 40, 40, 170);
  return {
    id: 'takeFromBazaar',
    duration: 1900,
    keys: [
      { at: 0, pose: { lHandX: bx + 40, lHandY: 360, lCtrlX: 80, lCtrlY: 320, lDX: 10, lDY: 2, lHandRot: 30, torsoRot: -1.8, torsoX: -3, headRot: -2.5, gazeX: -0.75, gazeY: 0.8 }, spring: { arm: { f: 3, zeta: 0.8 }, body: { f: 1.8, zeta: 0.8 } }, front: 'l' },
      { at: 420, pose: { lHandX: bx, lHandY: 412, lCtrlX: bx - 24, lCtrlY: 330, lHandRot: 40 }, spring: { arm: { f: 3.6, zeta: 0.75 } }, front: 'l' },
      { at: 700, pose: {}, holdCard: true, holdHand: 'l', front: 'l' },
      { at: 760, pose: { lHandX: 168, lHandY: 306, lCtrlX: 96, lCtrlY: 296, lHandRot: 20, torsoRot: 0, torsoX: 0, headRot: 0, gazeX: 0, gazeY: 0.85 }, spring: { arm: { f: 2.8, zeta: 0.8 }, body: calm }, holdCard: true, holdHand: 'l', front: 'l' },
      { at: 1150, pose: { lHandY: 352 }, holdCard: true, holdHand: 'l', front: 'l' },
      { at: 1300, pose: {}, holdCard: false, holdHand: 'l', front: 'l' },
      { at: 1400, pose: { lHandY: 306 }, front: 'l' },
      { at: 1550, pose: { ...L_REST, gazeY: 0.2 }, spring: { arm: { f: 2.4, zeta: 0.85 } }, front: false },
    ],
    markers: [{ at: 700, name: 'grab' }, { at: 1300, name: 'release' }],
  };
}

// ---------- состояния ----------

const IDLE: StateDef = {
  pose: {},
  looks: [
    { x: 0, y: 0.1, weight: 4 },
    // Свои кости, цепочка, базар; изредка — в сторону.
    { x: 0.05, y: 0.85, weight: 3 },
    { x: 0.15, y: 0.6, weight: 2 },
    { x: -0.6, y: 0.6, weight: 1 },
    { x: 0.7, y: -0.1, weight: 1 },
  ],
  saccade: [1400, 4200],
  fidgets: [strokeMustache, drumFingers, checkBones, adjustCap],
  fidgetEvery: [6500, 13000],
  wander: 0.7,
};

// Думает: пальцы у усов, голова склонена, взгляд — на свои кости и на цепочку.
const THINK: StateDef = {
  pose: { rHandX: 282, rHandY: 230, rCtrlX: 336, rCtrlY: 300, rDX: -14, rDY: -16, rHandRot: -150, headRot: 3, headY: 1.5, torsoRot: 0.6 },
  looks: [
    { x: 0.05, y: 0.85, weight: 3 },
    { x: 0.2, y: 0.6, weight: 3 },
    { x: 0.5, y: -0.4, weight: 1 },
  ],
  saccade: [1500, 3200],
  fidgets: [hmmNod, checkBones],
  fidgetEvery: [2000, 4200],
  wander: 0.45,
};

// Добрал из базара: чуть насупился, смотрит на свои кости.
const TOOK: StateDef = {
  pose: { torsoY: 1.5, headY: 2, headRot: -1.5 },
  looks: [{ x: 0.05, y: 0.85, weight: 3 }, { x: -0.5, y: 0.6, weight: 1 }],
  saccade: [1400, 2800],
  fidgets: [grumble],
  fidgetEvery: [600, 1200],
  wander: 0.35,
};

// Победа в матче: кулак вверх (art.ts, POSE_ARMS.victory). Вход — откинулся и вскинул кулак.
const FIST_UP: Pose = { rHandX: 322, rHandY: 128, rCtrlX: 340, rCtrlY: 210, rDX: 0, rDY: -16, rHandRot: -80, rFist: 1 };
const victoryBurst: GestureDef = {
  id: 'victoryBurst',
  duration: 1400,
  keys: [
    { at: 0, pose: { torsoY: 3, headY: 3, rHandX: 286, rHandY: 360, rCtrlX: 330, rCtrlY: 320, rFist: 1 }, spring: { arm: { f: 3.4, zeta: 0.8 }, body: { f: 2.4, zeta: 0.8 } } },
    { at: 300, pose: { ...FIST_UP, torsoY: -4, headY: -5, headRot: -2 }, spring: { arm: { f: 3.6, zeta: 0.55 }, body: { f: 2.6, zeta: 0.6 }, head: { f: 3, zeta: 0.6 } } },
    { at: 900, pose: { torsoY: -1, headY: -2, headRot: 0 } },
  ],
};
/** Потрясает кулаком. */
const fistShake: GestureDef = {
  id: 'fistShake',
  duration: 1100,
  keys: [
    { at: 0, pose: { rHandY: 144, rHandRot: -70 }, spring: { arm: { f: 5, zeta: 0.6 } } },
    { at: 250, pose: { rHandY: 118, rHandRot: -88 } },
    { at: 500, pose: { rHandY: 140, rHandRot: -74 } },
    { at: 750, pose: { rHandY: 128, rHandRot: -80 } },
  ],
};
/** Посмеивается, откинувшись. */
const chuckle: GestureDef = {
  id: 'chuckle',
  duration: 1300,
  keys: [
    { at: 0, pose: { torsoY: -2, headY: -3 }, spring: { body: { f: 4, zeta: 0.6 } } },
    { at: 220, pose: { torsoY: -0.5, headY: -1.5 } },
    { at: 440, pose: { torsoY: -2, headY: -3 } },
    { at: 700, pose: { torsoY: -1, headY: -2 } },
  ],
};
const VICTORY: StateDef = {
  pose: { ...FIST_UP, headY: -2, torsoY: -1 },
  looks: [{ x: 0, y: 0, weight: 3 }, { x: 0.3, y: -0.2, weight: 1 }],
  saccade: [1300, 2600],
  fidgets: [fistShake, chuckle],
  fidgetEvery: [1400, 2600],
  wander: 0.4,
  enter: victoryBurst,
};

export const MATVEY_MOTION: MotionStyle = {
  springs: {
    body: { f: 1.4, zeta: 0.82 },
    head: { f: 1.9, zeta: 0.72 },
    gaze: { f: 7, zeta: 1 },
    face: { f: 4, zeta: 0.85 },
    arm: { f: 2.6, zeta: 0.76 },
  },
  rest: REST,
  states: { idle: IDLE, think: THINK, took: TOOK, victory: VICTORY },
  faces: FACES,
  breath: { period: [3.9, 5.2], depth: 0.01 },
  wander: { headRot: 1, headX: 1.2, headY: 0.8, torsoRot: 0.9, torsoX: 2, shiftEvery: [6000, 12000] },
  blink: { every: [2400, 6200], double: 0.12, ms: 190 },
  // Пучка, серёжек и бахромы нет; кепка сидит плотно — без инерции.
  secondary: {
    bun: { f: 2, zeta: 0.5 }, earrings: { f: 2, zeta: 0.5 }, bunGain: 0, earGain: 0,
    bangs: { f: 3, zeta: 0.6 }, bangsGain: 0, bangsMax: 0, bangsLift: 0,
    fringe: { f: 2, zeta: 0.5 }, fringeGain: 0, fringeMax: 0,
  },
  eyeSwap: { close: 80, open: 110, pop: { f: 4, zeta: 0.55 }, size: { ball: [9.5, 11], wide: [11, 13], star: [10.5, 12], happy: [10, 6], closed: [10, 4] } },
  gazeHead: { rot: 2, y: 2 },
  throwCard: placeBone,
  takeCards: takeFromBazaar,
  gestures: {
    place: (t) => placeBone(t ?? { x: 260, y: 520 }),
    draw: (t) => takeFromBazaar(t ?? { x: 40, y: 420 }),
    knock: () => knock,
    slap: () => slap,
    capTip: () => capTip,
    watchPlay: () => watchPlay,
    satisfied: () => satisfied,
    grumble: () => grumble,
    surprised: () => surprised,
    shrug: () => shrug,
    handWin: () => handWin,
    handLose: () => handLose,
    chuckle: () => chuckle,
    strokeMustache: () => strokeMustache,
  },
};
