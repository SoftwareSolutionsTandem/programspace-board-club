// Движения Бабушки Агаты: характер пружин, позы, лица эмоций, мелкие действия и бросок карты — только данные.
// Агата бойкая: быстрые движения с заметным перелётом, частые переводы взгляда, живые брови.
import type { SpringParams } from '../../puppet/motion';
import { clamp } from '../../puppet/motion';
import type { Face, GestureDef, MotionStyle, Pose, StateDef } from '../../puppet/types';
import { agataScenes } from './scenes';

// Нейтральная поза — ровно утверждённый рисунок «ожидание»: рукава и кисти как в art.ts (POSE_ARMS.idle).
const REST = {
  torsoRot: 0, torsoX: 0, torsoY: 0,
  headRot: 0, headX: 0, headY: 0,
  gazeX: 0, gazeY: 0, pupil: 1,
  lidLI: -18, lidLO: -18, lidRI: -18, lidRO: -18,
  browLI: 2, browLO: 2, browLM: -6, browRI: 2, browRO: 2, browRM: -6,
  blush: 0.55,
  lHandX: 150, lHandY: 338, lCtrlX: 96, lCtrlY: 318, lDX: 0, lDY: 4, lHandRot: 10,
  rHandX: 316, rHandY: 392, rCtrlX: 332, rCtrlY: 330, rDX: 0, rDY: 6, rHandRot: -40,
  fanRot: 0, fanAlpha: 1,
} satisfies Pose;

// Брови исходного рисунка: [внутренний конец, внешний, середина] (art.ts, brow()).
type Brow = readonly [number, number, number];
const BROW: Record<string, Brow> = {
  neutral: [2, 2, -6], happy: [0, 1, -10], raised: [-9, -9, -19], annoyed: [7, -5, -2], sad: [-7, 5, -5], slyUp: [-7, -9, -17], slyDown: [4, 0, -3],
};
const brows = (l: Brow, r: Brow = l): Pose => ({ browLI: l[0], browLO: l[1], browLM: l[2], browRI: r[0], browRO: r[1], browRM: r[2] });
// Веки исходного рисунка: [внутренний угол, внешний] (art.ts, eye() → lid()); «открыто» — веко выше белка.
const lids = (i: number, o: number): Pose => ({ lidLI: i, lidLO: o, lidRI: i, lidRO: o });
const OPEN = lids(-18, -18);

const face = (eyes: Face['eyes'], pose: Pose, look: readonly [number, number] = [0, 2], extras = false, speechMax?: number): Face => ({ eyes, pose: { ...OPEN, pupil: 1, blush: 0.55, ...pose }, look, extras, speechMax });

const FACES: MotionStyle['faces'] = {
  warm: face('ball', brows(BROW.neutral!)),
  sly: face('ball', { ...brows(BROW.slyDown!, BROW.slyUp!), ...lids(-3, -1) }, [6, 2]),
  laugh: face('happy', { ...brows(BROW.happy!), blush: 0.85 }, [0, 2], true),
  azart: face('star', { ...brows(BROW.raised!), blush: 0.75, pupil: 8 / 7.5 }, [0, 2], true),
  surprise: face('wide', { ...brows(BROW.raised!), pupil: 5.5 / 7.5 }),
  think: face('ball', brows(BROW.neutral!, BROW.slyUp!), [5, -6]),
  // В досаде и грусти рот при речи не раскрывается до смеющегося.
  annoyed: face('ball', { ...brows(BROW.annoyed!), ...lids(-4, -4), pupil: 7 / 7.5 }, [0, 2], true, 1),
  sad: face('ball', { ...brows(BROW.sad!), ...lids(-9, -1), pupil: 7 / 7.5, blush: 0.35 }, [-1, 6], true, 1),
};

// ---------- мелкие действия ----------
const fast: SpringParams = { f: 8, zeta: 0.6 };

/** Поправляет очки: кисть к переносице, лёгкий толчок вверх, голова чуть опускается и поднимается. */
const adjustGlasses: GestureDef = {
  id: 'adjustGlasses',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 256, rHandY: 204, rCtrlX: 330, rCtrlY: 282, rDX: -8, rDY: -14, rHandRot: -150, headRot: -1.5, headY: 2.5, gazeX: 0.05, gazeY: 0.35 }, spring: { arm: { f: 3.4, zeta: 0.78 } } },
    { at: 520, pose: { rHandY: 188, headY: -2, headRot: 0.5 }, spring: { arm: { f: 6, zeta: 0.7 } } },
    { at: 760, pose: { rHandY: 191, gazeX: 0, gazeY: 0.1 } },
    { at: 980, pose: { ...pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'), headY: 0, headRot: 0 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
  ],
};

/** Поглядывает в свой веер и подравнивает его постукиванием. */
const fanTidy: GestureDef = {
  id: 'fanTidy',
  duration: 1500,
  keys: [
    { at: 0, pose: { gazeX: -0.6, gazeY: 0.75, headRot: -3, headY: 2, fanRot: -7, lHandRot: 4 } },
    { at: 360, pose: { lHandY: 344, fanRot: 4 }, spring: { arm: fast } },
    { at: 560, pose: { lHandY: 338, fanRot: -2 }, spring: { arm: fast } },
    { at: 760, pose: { lHandY: 343, fanRot: 2 }, spring: { arm: fast } },
    { at: 980, pose: { lHandY: 338, fanRot: 0, lHandRot: 10, gazeX: 0, gazeY: 0.1, headRot: 0, headY: 0 } },
  ],
};

/** Устраивается поудобнее: глубокий вдох с подъёмом плеч, выдох, взгляд на игрока. */
const settle: GestureDef = {
  id: 'settle',
  duration: 1500,
  keys: [
    { at: 0, pose: { torsoY: -3.5, torsoRot: 0.8, headRot: 2, headY: -3, gazeX: 0.3, gazeY: -0.2 }, spring: { body: { f: 1.6, zeta: 0.85 } } },
    { at: 650, pose: { torsoY: 1.5, torsoRot: -0.4, headRot: -1, headY: 1.5, gazeX: 0, gazeY: 0.12 }, spring: { body: { f: 1.4, zeta: 0.9 } } },
    { at: 1100, pose: { torsoY: 0, torsoRot: 0, headRot: 0, headY: 0 } },
  ],
};

/** В раздумье постукивает пальцами по щеке. */
const cheekTap: GestureDef = {
  id: 'cheekTap',
  duration: 760,
  keys: [
    { at: 0, pose: { rHandRot: -140 }, spring: { arm: { f: 9, zeta: 0.55 } } },
    { at: 170, pose: { rHandRot: -152 }, spring: { arm: { f: 9, zeta: 0.55 } } },
    { at: 340, pose: { rHandRot: -141 }, spring: { arm: { f: 9, zeta: 0.55 } } },
    { at: 520, pose: { rHandRot: -150 } },
  ],
};

/** «Хм…»: голова чуть склоняется сильнее и кивает. */
const hmmNod: GestureDef = {
  id: 'hmmNod',
  duration: 1100,
  keys: [
    { at: 0, pose: { headRot: 8, headY: 2.5, gazeX: 0.4, gazeY: -0.55 } },
    { at: 380, pose: { headY: -1, headRot: 6.5 } },
    { at: 700, pose: { headY: 1, headRot: 5 } },
  ],
};

function pick(p: Pose, ...keys: (keyof Pose)[]): Pose {
  const out: Pose = {};
  for (const k of keys) out[k] = p[k];
  return out;
}

// ---------- состояния ----------
const IDLE: StateDef = {
  pose: {},
  looks: [
    { x: 0, y: 0.1, weight: 4 },
    { x: 0.05, y: 0.75, weight: 3 },
    { x: -0.6, y: 0.7, weight: 2 },
    { x: -0.75, y: -0.05, weight: 1 },
    { x: 0.7, y: -0.15, weight: 1 },
  ],
  saccade: [900, 3200],
  fidgets: [adjustGlasses, fanTidy, settle],
  fidgetEvery: [5000, 10500],
  wander: 1,
};

// Раздумье: кисть у щеки, голова склонена к ней, взгляд то в веер, то вверх.
const THINK: StateDef = {
  pose: { rHandX: 286, rHandY: 232, rCtrlX: 338, rCtrlY: 290, rDX: -10, rDY: -18, rHandRot: -150, headRot: 5, headY: 1.5, torsoRot: 0.8 },
  looks: [
    { x: 0.55, y: -0.75, weight: 3 },
    { x: -0.6, y: 0.75, weight: 3 },
    { x: 0.1, y: 0.8, weight: 2 },
    { x: -0.7, y: -0.3, weight: 1 },
  ],
  saccade: [1100, 2600],
  fidgets: [cheekTap, hmmNod],
  fidgetEvery: [1500, 3200],
  wander: 0.6,
};

// Взяла: плечи опустились, голова поникла, веер (теперь толще) держит пониже и поглядывает в него.
/** Вздох: плечи поднимаются и тяжело опускаются, голова качается «эх». */
const sigh: GestureDef = {
  id: 'sigh',
  duration: 1600,
  keys: [
    { at: 0, pose: { torsoY: -2.5, headY: -2, headRot: 1.5 }, spring: { body: { f: 1.6, zeta: 0.85 } } },
    { at: 600, pose: { torsoY: 5, headY: 5, headRot: -3.5 }, spring: { body: { f: 1.2, zeta: 0.9 }, head: { f: 1.6, zeta: 0.8 } } },
    { at: 1050, pose: { headRot: 2.5 } },
    { at: 1300, pose: { headRot: -1.5 } },
  ],
};

/** Всплеснула руками: «ах ты ж!» — правая ладонь к щеке, голова качнулась (веер в левой остаётся). */
const throwUpHands: GestureDef = {
  id: 'throwUpHands',
  duration: 1500,
  keys: [
    { at: 0, pose: { rHandX: 300, rHandY: 250, rCtrlX: 350, rCtrlY: 320, rDX: -6, rDY: -10, rHandRot: -100, torsoY: -2, headY: -2, headRot: 2 }, spring: { arm: { f: 4.4, zeta: 0.6 }, body: { f: 3.6, zeta: 0.6 } } },
    { at: 300, pose: { rHandX: 262, rHandY: 196, rCtrlX: 334, rCtrlY: 280, rDX: -10, rDY: -14, rHandRot: -150, headRot: -3 }, spring: { arm: { f: 3, zeta: 0.75 } } },
    { at: 650, pose: { headRot: 3 } },
    { at: 900, pose: { headRot: -2 } },
    { at: 1100, pose: { ...pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'), torsoY: 0, headY: 0, headRot: 0 }, spring: { arm: { f: 2.6, zeta: 0.8 }, body: { f: 1.8, zeta: 0.8 } } },
  ],
};

const TOOK: StateDef = {
  pose: { torsoY: 3, headY: 3.5, headRot: -2, lHandY: 346, lHandRot: 6, fanRot: -5, rHandX: 300, rHandY: 396, rCtrlX: 326, rCtrlY: 334, rHandRot: -55 },
  looks: [
    { x: -0.6, y: 0.75, weight: 3 },
    { x: 0, y: 0.15, weight: 2 },
  ],
  saccade: [1300, 2600],
  fidgets: [sigh],
  fidgetEvery: [400, 900],
  wander: 0.4,
};

// Победа: руки вверх. Вход — с замахом: присела, сжалась и выстрелила руками вверх с перелётом.
const ARMS_UP: Pose = {
  lHandX: 96, lHandY: 108, lCtrlX: 74, lCtrlY: 190, lDX: 0, lDY: -8, lHandRot: 160,
  rHandX: 324, rHandY: 108, rCtrlX: 346, rCtrlY: 190, rDX: 0, rDY: -8, rHandRot: 20,
};
const victoryBurst: GestureDef = {
  id: 'victoryBurst',
  duration: 1200,
  keys: [
    { at: 0, pose: { lHandX: 176, lHandY: 356, lCtrlX: 112, lCtrlY: 330, lHandRot: 30, rHandX: 246, rHandY: 356, rCtrlX: 310, rCtrlY: 330, rHandRot: 150, torsoY: 6, headY: 5, headRot: 0, gazeX: 0, gazeY: 0.3 }, spring: { arm: { f: 4.6, zeta: 0.8 }, body: { f: 3.4, zeta: 0.75 }, head: { f: 3.4, zeta: 0.7 } } },
    { at: 260, pose: { ...ARMS_UP, torsoY: -7, headY: -8, headRot: -2, gazeY: -0.1 }, spring: { arm: { f: 4.2, zeta: 0.36 }, body: { f: 3.2, zeta: 0.42 }, head: { f: 3.6, zeta: 0.45 } } },
    { at: 760, pose: { torsoY: -2, headY: -3, headRot: 2 } },
  ],
};
/** Ликует: руки вверх-вниз с подскоком. */
const cheer: GestureDef = {
  id: 'cheer',
  duration: 900,
  keys: [
    { at: 0, pose: { lHandY: 146, rHandY: 146, lCtrlY: 214, rCtrlY: 214, torsoY: 2, headY: 1 }, spring: { arm: { f: 6, zeta: 0.6 }, body: { f: 4, zeta: 0.6 } } },
    { at: 200, pose: { lHandY: 100, rHandY: 100, lCtrlY: 186, rCtrlY: 186, torsoY: -4, headY: -5 }, spring: { arm: { f: 5.5, zeta: 0.4 }, body: { f: 4, zeta: 0.45 } } },
    { at: 520, pose: { torsoY: -1, headY: -2 } },
  ],
};
/** Пританцовывает: корпус качается из стороны в сторону, руки — за ним. */
const victorySway: GestureDef = {
  id: 'victorySway',
  duration: 1700,
  keys: [
    { at: 0, pose: { torsoRot: -3.5, headRot: 4, lHandX: 84, rHandX: 312 }, spring: { body: { f: 2.2, zeta: 0.6 } } },
    { at: 560, pose: { torsoRot: 3.5, headRot: -4, lHandX: 108, rHandX: 336 } },
    { at: 1120, pose: { torsoRot: 0, headRot: 1, lHandX: 96, rHandX: 324 } },
  ],
};
/** Трясёт кулаками по очереди: то левая выше, то правая (руки — по бокам головы, лицо не закрывают). */
const fistPump: GestureDef = {
  id: 'fistPump',
  duration: 1300,
  keys: [
    { at: 0, pose: { lHandY: 86, lCtrlY: 176, rHandY: 140, rCtrlY: 206, headRot: -2.5, torsoRot: -1.2 }, spring: { arm: { f: 6, zeta: 0.5 } } },
    { at: 300, pose: { lHandY: 140, lCtrlY: 206, rHandY: 86, rCtrlY: 176, headRot: 2.5, torsoRot: 1.2 } },
    { at: 600, pose: { lHandY: 92, lCtrlY: 180, rHandY: 132, rCtrlY: 200, headRot: -1.5, torsoRot: -0.6 } },
    { at: 860, pose: { ...ARMS_UP, headRot: 0, torsoRot: 0 }, spring: { arm: { f: 4, zeta: 0.55 } } },
  ],
};

const VICTORY: StateDef = {
  pose: { ...ARMS_UP, fanAlpha: 0, headY: -3, torsoY: -1 },
  looks: [{ x: 0, y: 0, weight: 3 }, { x: 0.3, y: -0.3, weight: 1 }, { x: -0.3, y: -0.3, weight: 1 }],
  saccade: [900, 1800],
  fidgets: [cheer, victorySway, fistPump],
  fidgetEvery: [700, 1500],
  wander: 0.5,
  enter: victoryBurst,
};

/**
 * Бросок карты к точке на столе (единицы рига): берёт карту из веера → замах вверх-назад, корпус откидывается →
 * рывок к столу, корпус и голова подаются вперёд → карта отпускается (release) в нижней точке рывка →
 * кисть по инерции доходит и пружинит → взгляд за картой, затем на игрока → возврат.
 */
function throwCard(target: { x: number; y: number }): GestureDef {
  // Удар — в сторону места на столе: правая рука дотягивается от центра до своего края.
  const sx = clamp(210 + (target.x - 210) * 0.6 + 40, 205, 380);
  const gx = clamp((target.x - 210) / 260, -0.9, 0.9);
  return {
    id: 'throwCard',
    duration: 1450,
    keys: [
      { at: 0, pose: { rHandX: 182, rHandY: 304, rCtrlX: 262, rCtrlY: 352, rDX: -6, rDY: -4, rHandRot: -110, gazeX: -0.55, gazeY: 0.75, headRot: -3, headY: 3, torsoRot: -1.2, fanRot: 3 }, spring: { arm: { f: 4.4, zeta: 0.8 } } },
      { at: 230, pose: {}, holdCard: true },
      { at: 260, pose: { rHandX: 352, rHandY: 204, rCtrlX: 378, rCtrlY: 292, rDX: 2, rDY: -10, rHandRot: -22, torsoRot: 3.6, torsoY: -5, headRot: 5, headY: -6, gazeX: gx, gazeY: 0.9, fanRot: 0 }, spring: { arm: { f: 3.6, zeta: 0.74 }, body: { f: 2.6, zeta: 0.72 }, head: { f: 3, zeta: 0.7 } }, holdCard: true },
      { at: 470, pose: { rHandX: sx, rHandY: 398, rCtrlX: sx + 42, rCtrlY: 318, rDX: 2, rDY: 8, rHandRot: -76, torsoRot: -3.4, torsoY: 5, headRot: -3.5, headY: 6 }, spring: { arm: { f: 7.2, zeta: 0.42 }, body: { f: 4, zeta: 0.55 }, head: { f: 4.5, zeta: 0.5 } }, holdCard: true },
      { at: 540, pose: {}, holdCard: false },
      { at: 640, pose: { rHandX: sx + 6, rHandY: 402, gazeX: gx, gazeY: 1 }, spring: { arm: { f: 4, zeta: 0.6 } } },
      { at: 960, pose: { ...pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'), torsoRot: 0, torsoY: 0, headRot: 1.5, headY: 0, gazeX: 0, gazeY: 0.1 }, spring: { arm: { f: 2.8, zeta: 0.78 }, body: { f: 1.8, zeta: 0.75 } } },
    ],
    markers: [{ at: 230, name: 'pick' }, { at: 540, name: 'release' }],
  };
}

/**
 * Сгребает карты со стола в веер: наклон, взгляд на карты → правая кисть тянется к картам (grab — коснулась) →
 * подгребает к себе и вкладывает в веер, левая рука подставляет веер → подравнивает → возврат.
 */
function takeCards(target: { x: number; y: number }): GestureDef {
  const tx = clamp(210 + (target.x - 210) * 0.6, 186, 360);
  const gx = clamp((target.x - 210) / 260, -0.9, 0.9);
  return {
    id: 'takeCards',
    duration: 1350,
    keys: [
      { at: 0, pose: { rHandX: tx + 26, rHandY: 404, rCtrlX: tx + 70, rCtrlY: 326, rDX: -4, rDY: 6, rHandRot: -62, torsoY: 4, torsoRot: -1.5, headY: 4, headRot: -2, gazeX: gx, gazeY: 0.95, lHandY: 350, fanRot: -6 }, spring: { arm: { f: 4.2, zeta: 0.72 }, body: { f: 2.6, zeta: 0.7 } } },
      { at: 300, pose: { rHandX: tx, rHandY: 412, rHandRot: -92 }, spring: { arm: { f: 6, zeta: 0.7 } } },
      { at: 380, pose: { rHandX: 198, rHandY: 330, rCtrlX: 262, rCtrlY: 374, rDX: -8, rDY: -4, rHandRot: -122, lHandY: 334, fanRot: 5, gazeX: -0.55, gazeY: 0.7, torsoY: 1, headY: 2 }, spring: { arm: { f: 3.4, zeta: 0.72 } } },
      { at: 800, pose: { rHandY: 322, fanRot: 0 }, spring: { arm: { f: 8, zeta: 0.6 } } },
      { at: 950, pose: { ...pick(REST, 'rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot', 'lHandY'), torsoY: 0, torsoRot: 0, headY: 0, headRot: 0, gazeX: 0, gazeY: 0.2 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
    ],
    markers: [{ at: 330, name: 'grab' }],
  };
}

export const AGATA_MOTION: MotionStyle = {
  springs: {
    body: { f: 1.8, zeta: 0.75 },
    head: { f: 2.6, zeta: 0.62 },
    gaze: { f: 9, zeta: 1 },
    face: { f: 5, zeta: 0.8 },
    arm: { f: 3.2, zeta: 0.68 },
  },
  rest: REST,
  states: { idle: IDLE, think: THINK, took: TOOK, victory: VICTORY },
  faces: FACES,
  breath: { period: [3.2, 4.4], depth: 0.012 },
  wander: { headRot: 1.6, headX: 1.8, headY: 1.2, torsoRot: 1.4, torsoX: 3, shiftEvery: [4500, 9500] },
  blink: { every: [1800, 5200], double: 0.18, ms: 170 },
  secondary: {
    bun: { f: 2.2, zeta: 0.32 }, earrings: { f: 1.6, zeta: 0.18 }, bunGain: 1.4, earGain: 0.6,
    // Чёлка короткая и плотная: качается чуть-чуть. Бахрома — лёгкая, с заметным перелётом.
    bangs: { f: 3.2, zeta: 0.4 }, bangsGain: 0.5, bangsMax: 1.6, bangsLift: 0.35,
    fringe: { f: 2.4, zeta: 0.22 }, fringeGain: 2.6, fringeMax: 16,
  },
  eyeSwap: { close: 70, open: 90, pop: { f: 5, zeta: 0.45 }, size: { ball: [14, 16], wide: [17, 20], star: [15, 17], happy: [13, 8], closed: [13, 5] } },
  gazeHead: { rot: 3, y: 3 },
  throwCard,
  takeCards,
  scenes: agataScenes(REST),
  // Жесты-реакции дурака (src/games/durak/reactions.ts): раньше Агата отвечала на события только лицом.
  gestures: { sigh: () => sigh, throwUpHands: () => throwUpHands },
};
