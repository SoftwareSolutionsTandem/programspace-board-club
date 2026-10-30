// Сценки Деда Матвея — его «своя жизнь» за столом домино (src/characters/life.ts, docs/ART_STYLE.md §5.6).
// Матвей никуда не спешит: прихлёбывает чай из подстаканника, щёлкает семечки, надвигает кепку «вздремнуть» — и хитро
// подглядывает одним глазом; кряхтит, разминая спину; подкручивает ус, будто знает какую-то хитрость.
import type { SpringParams } from '../../puppet/motion';
import type { GestureDef, Pose, SceneDef } from '../../puppet/types';

const calm: SpringParams = { f: 2.2, zeta: 0.85 };
const quick: SpringParams = { f: 6, zeta: 0.6 };
const slow: SpringParams = { f: 1, zeta: 0.95 };

const R = ['rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'] as const;
const L = ['lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot'] as const;
const only = (p: Pose, keys: readonly (keyof Pose)[]): Pose => Object.fromEntries(keys.map((k) => [k, p[k]])) as Pose;

/** Правая кисть у рта, под усами. */
const R_MOUTH: Pose = { rHandX: 244, rHandY: 214, rCtrlX: 332, rCtrlY: 280, rDX: -14, rDY: -12, rHandRot: -160 };

export function matveyScenes(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);

  /** Чаёк: берёт стакан с края стола, дует, отхлёбывает с закрытыми глазами, крякает и ставит обратно. */
  const tea: GestureDef = {
    id: 'scene:tea',
    duration: 6200,
    keys: [
      { at: 0, pose: { rHandX: 340, rHandY: 380, rCtrlX: 352, rCtrlY: 320, rDX: -8, rDY: 4, rHandRot: 150, gazeX: 0.6, gazeY: 0.7, headRot: -2 }, spring: { arm: calm } },
      { at: 650, pose: { rHandY: 372 }, props: { r: 'tea' } },
      { at: 900, pose: { rHandX: 270, rHandY: 262, rCtrlX: 344, rCtrlY: 300, rDX: -12, rDY: -8, rHandRot: -175, gazeX: 0.2, gazeY: 0.6, headRot: 0 }, spring: { arm: { f: 2, zeta: 0.85 } } },
      // Дует на чай.
      { at: 1600, pose: { headY: 2 }, mouth: 'o' },
      { at: 2100, pose: { ...R_MOUTH, rHandX: 236, rHandY: 236, headY: -2, headRot: -2 }, mouth: null, eyes: 'closed', spring: { arm: calm, head: calm } },
      { at: 2700, pose: { headY: -3 } },
      { at: 3200, pose: { rHandX: 280, rHandY: 280, rCtrlX: 344, rCtrlY: 310, headY: 0, headRot: 0 }, eyes: 'happy', emotion: 'laugh', spring: { arm: calm, head: calm } },
      { at: 3400, pose: {}, waitSpeech: true },
      { at: 3700, pose: { rHandX: 340, rHandY: 380, rCtrlX: 352, rCtrlY: 320, rDX: -8, rDY: 4, rHandRot: 150, gazeX: 0.6, gazeY: 0.7 }, eyes: null, emotion: 'warm', spring: { arm: calm } },
      { at: 4300, pose: { rHandY: 386 }, props: { r: null } },
      { at: 4600, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ],
    markers: [{ at: 3300, name: 'say' }],
  };

  /** Семечки: из кармана пиджака — в рот, щёлк, жуёт с прищуром. */
  const seeds: GestureDef = {
    id: 'scene:seeds',
    duration: 5200,
    keys: [
      { at: 0, pose: { rHandX: 262, rHandY: 334, rCtrlX: 330, rCtrlY: 340, rDX: -10, rDY: 0, rHandRot: -150, gazeX: 0.3, gazeY: 0.8, headRot: 1.5 }, spring: { arm: calm } },
      { at: 600, pose: { rHandY: 326 }, props: { r: 'seed' } },
      { at: 850, pose: { ...R_MOUTH, gazeX: 0, gazeY: 0.3, headRot: 0 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
      { at: 1300, pose: { headY: 1 }, mouth: 'o' },
      // Щёлк!
      { at: 1600, pose: { headY: -1.5, rHandY: 220 }, props: { r: null }, mouth: 'pursed', spring: { head: quick, arm: quick } },
      { at: 1800, pose: { ...rr, headY: 0 }, spring: { arm: calm, head: calm } },
      { at: 2000, pose: { headY: 1, lidLI: -1, lidLO: 2, lidRI: -1, lidRO: 2 }, mouth: 'wavy', emotion: 'sly', spring: { head: quick } },
      { at: 2250, pose: { headY: 0 }, mouth: 'pursed' },
      { at: 2500, pose: { headY: 1 }, mouth: 'wavy' },
      { at: 2750, pose: { headY: 0 }, mouth: null },
      { at: 2900, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 2850, name: 'say' }],
  };

  /** Вздремнуть: надвигает кепку на глаза, посапывает… и подглядывает одним глазом. Только при долгом раздумье игрока. */
  const capNap: GestureDef = {
    id: 'scene:capNap',
    duration: 7600,
    keys: [
      { at: 0, pose: { rHandX: 284, rHandY: 96, rCtrlX: 340, rCtrlY: 210, rDX: -4, rDY: -6, rHandRot: -70, gazeY: -0.2 }, spring: { arm: { f: 2.4, zeta: 0.82 } } },
      { at: 650, pose: { hatY: 17, hatRot: -2, rHandY: 116, headRot: 2 }, spring: { face: { f: 3, zeta: 0.85 }, arm: calm } },
      { at: 1100, pose: { ...rr, torsoY: 2, headY: 3 }, eyes: 'closed', spring: { arm: calm, body: slow, head: slow } },
      { at: 1700, pose: { torsoY: 3.5, headY: 4.5 }, mouth: 'o' },
      { at: 2400, pose: { torsoY: 2, headY: 3 }, mouth: 'pursed' },
      { at: 3100, pose: { torsoY: 3.5, headY: 4.5 }, mouth: 'o' },
      // Один глаз приоткрылся: правое веко опущено, левый глаз хитро смотрит на игрока.
      { at: 3800, pose: { torsoY: 1, headY: 1.5, lidLI: -2, lidLO: 0, lidRI: 10, lidRO: 10, gazeX: -0.15, gazeY: 0.25, browLI: -8, browLO: -6, browLM: -15 }, eyes: null, mouth: null, emotion: 'sly', spring: { head: calm, body: calm, face: { f: 4, zeta: 0.8 } } },
      { at: 4100, pose: {}, waitSpeech: true },
      // Кепку на место.
      { at: 4400, pose: { rHandX: 284, rHandY: 104, rCtrlX: 340, rCtrlY: 210, rDX: -4, rDY: -6, rHandRot: -70, lidRI: -1, lidRO: 2, browLI: 2, browLO: 0, browLM: -4 }, spring: { arm: { f: 2.4, zeta: 0.82 } } },
      { at: 5000, pose: { hatY: 0, hatRot: 0, rHandY: 92 }, spring: { face: { f: 3, zeta: 0.85 } } },
      { at: 5400, pose: { ...rr, torsoY: 0, headY: 0 }, spring: { arm: calm } },
    ],
    markers: [{ at: 3950, name: 'say' }],
  };

  /** Затекла спина: потягивается, руки вверх, — «ох», рука к пояснице, кряхтит. */
  const stretch: GestureDef = {
    id: 'scene:stretch',
    duration: 5200,
    keys: [
      { at: 0, pose: { lHandX: 120, lHandY: 150, lCtrlX: 92, lCtrlY: 230, lDX: 0, lDY: -10, lHandRot: -100, rHandX: 300, rHandY: 150, rCtrlX: 328, rCtrlY: 230, rDX: 0, rDY: -10, rHandRot: -80, torsoY: -4, headY: -4, headRot: 0 }, eyes: 'closed', mouth: 'o', spring: { arm: { f: 1.8, zeta: 0.85 }, body: { f: 1.4, zeta: 0.85 } } },
      { at: 1300, pose: { torsoY: -6, headY: -6 } },
      { at: 1900, pose: { ...lr, rHandX: 322, rHandY: 352, rCtrlX: 350, rCtrlY: 300, rDX: -8, rDY: 0, rHandRot: 110, torsoY: 1, torsoRot: -2.5, headRot: 3, headY: 1 }, eyes: null, mouth: null, emotion: 'annoyed', spring: { arm: calm, body: calm } },
      { at: 2200, pose: {}, waitSpeech: true },
      { at: 2500, pose: { ...rr, torsoRot: 0, torsoY: 0, headRot: 0, headY: 0 }, emotion: 'warm', spring: { arm: calm, body: calm } },
    ],
    markers: [{ at: 2100, name: 'say' }],
  };

  /** Подкручивает ус и хитро поглядывает на игрока: «знаю я одну хитрость». */
  const mustache: GestureDef = {
    id: 'scene:mustache',
    duration: 4400,
    keys: [
      { at: 0, pose: { ...R_MOUTH, rHandX: 254, rHandY: 196, rHandRot: -140, gazeX: -0.2, gazeY: 0.2, headRot: -2 }, emotion: 'sly', spring: { arm: { f: 2.6, zeta: 0.82 } } },
      { at: 600, pose: { rHandRot: -110, rHandY: 190 }, spring: { arm: { f: 4, zeta: 0.7 } } },
      { at: 900, pose: { rHandRot: -145, rHandY: 196 } },
      { at: 1200, pose: { rHandRot: -108, rHandY: 188 } },
      { at: 1500, pose: { rHandRot: -140, rHandY: 194 } },
      { at: 1600, pose: {}, waitSpeech: true },
      { at: 1900, pose: { ...rr, gazeX: 0, gazeY: 0.1, headRot: 0 }, spring: { arm: calm } },
      // «Хе-хе» про себя.
      { at: 2300, pose: { torsoY: -2, headY: -2.5 }, spring: { body: { f: 5, zeta: 0.5 } } },
      { at: 2500, pose: { torsoY: 0, headY: 0 } },
      { at: 2700, pose: { torsoY: -1.5, headY: -2 } },
      { at: 2950, pose: { torsoY: 0, headY: 0 } },
    ],
    markers: [{ at: 1550, name: 'say' }],
  };

  // ---------- LIFE-2: новые сценки ----------

  /** Газета: разворачивает обеими руками, читает по строчкам, хмыкает, выглядывает поверх — и складывает. */
  const readLine = (at: number, x: number): GestureDef['keys'][number] => ({ at, pose: { gazeX: x, gazeY: 0.45, headRot: x * 3 } });
  const newspaper: GestureDef = {
    id: 'scene:newspaper',
    duration: 9000,
    keys: [
      { at: 0, pose: { rHandX: 336, rHandY: 386, rCtrlX: 352, rCtrlY: 320, rDX: -8, rDY: 4, rHandRot: 150, gazeX: 0.6, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 600, pose: { rHandY: 378 }, props: { r: 'newspaper' } },
      { at: 850, pose: { rHandX: 270, rHandY: 262, rCtrlX: 336, rCtrlY: 320, rDX: -10, rDY: -6, rHandRot: -175, lHandX: 156, lHandY: 268, lCtrlX: 104, lCtrlY: 320, lDX: 10, lDY: -6, lHandRot: 0, gazeX: 0, gazeY: 0.5, headY: 2 }, spring: { arm: { f: 2, zeta: 0.85 } } },
      readLine(1400, -0.5), readLine(2000, 0.35), readLine(2300, -0.5), readLine(2900, 0.35), readLine(3200, -0.5),
      // Хмыкнул: что-то интересное.
      { at: 3700, pose: { gazeX: 0.1, headY: 0, browLI: -6, browRI: -8 }, emotion: 'surprise', spring: { head: calm } },
      { at: 4100, pose: { torsoY: -1.5, headY: -1.5 }, emotion: 'laugh', spring: { body: quick } },
      { at: 4300, pose: { torsoY: 0, headY: 0 } },
      // Поверх газеты — на игрока.
      { at: 4700, pose: { rHandY: 286, lHandY: 292, headY: -3, gazeX: 0, gazeY: 0.2, browLI: 2, browRI: 2 }, emotion: 'sly', spring: { arm: calm, head: calm } },
      { at: 5000, pose: {}, waitSpeech: true },
      { at: 5400, pose: { rHandX: 336, rHandY: 386, rCtrlX: 352, rCtrlY: 320, rHandRot: 150, ...lr, headY: 0, gazeX: 0.6, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 6000, pose: { rHandY: 392 }, props: { r: null } },
      { at: 6200, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 4900, name: 'say' }],
  };

  /** Сахар вприкуску: кусочек из кармана, хрустит, жмурится от удовольствия. */
  const crunch = (at: number): GestureDef['keys'][number][] => [
    { at, pose: { headY: 1.2 }, mouth: 'pursed', spring: { head: quick } },
    { at: at + 160, pose: { headY: -0.4 }, mouth: 'wavy' },
  ];
  const sugar: GestureDef = {
    id: 'scene:sugar',
    duration: 4800,
    keys: [
      { at: 0, pose: { rHandX: 262, rHandY: 334, rCtrlX: 330, rCtrlY: 340, rDX: -10, rDY: 0, rHandRot: -150, gazeX: 0.3, gazeY: 0.8 }, spring: { arm: calm } },
      { at: 500, pose: { rHandY: 326 }, props: { r: 'sugar' } },
      { at: 750, pose: { ...R_MOUTH, gazeX: 0, gazeY: 0.4, browLI: -6, browRI: -6 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
      { at: 1150, pose: {}, mouth: 'o' },
      { at: 1400, pose: { rHandY: 220 }, props: { r: null }, mouth: 'pursed' },
      { at: 1550, pose: { ...rr, browLI: 2, browRI: 2 }, eyes: 'happy', emotion: 'laugh', spring: { arm: calm } },
      ...crunch(1700), ...crunch(2000), ...crunch(2300),
      { at: 2600, pose: { headY: 0 }, eyes: null, mouth: null },
      { at: 2800, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 2650, name: 'say' }],
  };

  /** «Я в окно гляжу»: отвернулся, насвистывает, а глаза украдкой — на кости игрока. */
  const sideGlance: GestureDef = {
    id: 'scene:sideGlance',
    duration: 5600,
    keys: [
      { at: 0, pose: { headRot: -6, headX: -2, gazeX: -0.9, gazeY: -0.1 }, mouth: 'pursed', emotion: 'warm', spring: { head: calm } },
      { at: 1100, pose: { gazeX: 0.3, gazeY: 0.9, lidLI: -1, lidLO: 2, lidRI: -1, lidRO: 2 }, mouth: null, emotion: 'sly', spring: { gaze: { f: 3, zeta: 0.9 } } },
      { at: 2000, pose: { gazeX: 0.2, gazeY: 0.85 } },
      // Поймали взгляд — снова в окно.
      { at: 2500, pose: { gazeX: -0.9, gazeY: -0.1, headRot: -7 }, mouth: 'pursed', spring: { gaze: { f: 9, zeta: 1 } } },
      { at: 2900, pose: {}, mouth: null, waitSpeech: true },
      { at: 3200, pose: { headRot: 0, headX: 0, gazeX: 0, gazeY: 0.1, lidLI: -6, lidLO: -6, lidRI: -6, lidRO: -6 }, spring: { head: calm } },
    ],
    markers: [{ at: 2800, name: 'say' }],
  };

  /** Подсчёт на пальцах: загибает пальцы, бормочет, считает — сходится. */
  const finger = (at: number, l: number, r: number): GestureDef['keys'][number] => ({ at, pose: { lFist: l, rFist: r, rHandRot: -100 + r * 12 }, spring: { arm: quick } });
  const countFingers: GestureDef = {
    id: 'scene:countFingers',
    duration: 4800,
    keys: [
      { at: 0, pose: { lHandX: 190, lHandY: 288, lCtrlX: 112, lCtrlY: 330, lDX: 10, lDY: -8, lHandRot: -60, rHandX: 236, rHandY: 280, rCtrlX: 320, rCtrlY: 330, rDX: -10, rDY: -8, rHandRot: -100, gazeX: -0.1, gazeY: 0.6, headY: 2 }, emotion: 'think', spring: { arm: calm } },
      finger(700, 0, 1), finger(1000, 1, 1), finger(1300, 1, 0), finger(1600, 0, 0), finger(1900, 0, 1),
      { at: 2300, pose: { gazeX: 0.4, gazeY: -0.5, headY: 0 }, emotion: 'sly' },
      { at: 2500, pose: {}, waitSpeech: true },
      { at: 2800, pose: { ...lr, ...rr, lFist: 0, rFist: 0, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 600, name: 'say' }],
  };

  /** Устраивается поудобнее: ёрзает, поводит плечами, одёргивает рукава — довольно крякает. */
  const settle: GestureDef = {
    id: 'scene:settle',
    duration: 5000,
    keys: [
      { at: 0, pose: { torsoX: -4, torsoRot: -1.5, headRot: 1.5 }, spring: { body: { f: 2.4, zeta: 0.7 } } },
      { at: 450, pose: { torsoX: 4, torsoRot: 1.5, headRot: -1.5 } },
      { at: 900, pose: { torsoX: 0, torsoRot: 0, headRot: 0, torsoY: -3 }, spring: { body: calm } },
      { at: 1300, pose: { torsoY: 0 } },
      // Одёргивает правый рукав левой рукой.
      { at: 1600, pose: { lHandX: 252, lHandY: 360, lCtrlX: 150, lCtrlY: 360, lDX: 10, lDY: 0, lHandRot: 10, gazeX: 0.4, gazeY: 0.9 }, spring: { arm: calm } },
      { at: 2000, pose: { lHandX: 262 }, spring: { arm: quick } },
      { at: 2250, pose: { ...lr, gazeX: 0, gazeY: 0.1 }, eyes: 'happy', emotion: 'laugh', spring: { arm: calm } },
      { at: 2500, pose: {}, eyes: null, waitSpeech: true },
    ],
    markers: [{ at: 2400, name: 'say' }],
  };

  /** Глядит в окно из-под ладони: щурится, что-то разглядел. */
  const windowLook: GestureDef = {
    id: 'scene:window',
    duration: 5200,
    keys: [
      { at: 0, pose: { rHandX: 236, rHandY: 112, rCtrlX: 330, rCtrlY: 220, rDX: -14, rDY: -8, rHandRot: -175, headRot: -7, headX: -3, gazeX: -0.95, gazeY: -0.2, lidLI: -1, lidLO: 1, lidRI: -1, lidRO: 1 }, spring: { arm: calm, head: calm } },
      { at: 900, pose: { headRot: -9, gazeX: -1 } },
      { at: 1600, pose: { browLI: -8, browRI: -8 }, emotion: 'surprise' },
      { at: 1900, pose: {}, waitSpeech: true },
      { at: 2200, pose: { ...rr, headRot: 0, headX: 0, gazeX: 0, gazeY: 0.1, lidLI: -6, lidLO: -6, lidRI: -6, lidRO: -6, browLI: 2, browRI: 2 }, emotion: 'warm', spring: { arm: calm, head: calm } },
    ],
    markers: [{ at: 1800, name: 'say' }],
  };

  /** Игрок спешит: спокойно поднимает ладонь — «не гони лошадей». */
  const fastPlayer: GestureDef = {
    id: 'scene:fastPlayer',
    duration: 3800,
    keys: [
      { at: 0, pose: { rHandX: 290, rHandY: 236, rCtrlX: 340, rCtrlY: 310, rDX: -4, rDY: -12, rHandRot: -90, gazeX: 0, gazeY: 0.1, headRot: 0 }, emotion: 'sly', spring: { arm: calm } },
      { at: 600, pose: { headRot: 3 }, spring: { head: calm } },
      { at: 1000, pose: { headRot: -3 } },
      { at: 1400, pose: { headRot: 0 }, waitSpeech: true },
      { at: 1700, pose: { ...rr }, emotion: 'warm', spring: { arm: calm } },
    ],
    markers: [{ at: 400, name: 'say' }],
  };

  /** Игрок думает очень долго: барабанит пальцами обеих рук, потом добродушно усмехается. */
  const drum = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { lHandRot: 10 + 8 * k, rHandRot: 170 - 8 * k, lDY: 8 + k, rDY: 8 + k }, spring: { arm: { f: 8, zeta: 0.55 } } });
  const nudge: GestureDef = {
    id: 'scene:nudge',
    duration: 3800,
    keys: [
      { at: 0, pose: { gazeX: 0.1, gazeY: 0.85, headY: 2 }, emotion: 'think', spring: { head: calm } },
      drum(200, 1), drum(350, -1), drum(500, 1), drum(650, -1), drum(800, 1), drum(950, -1), drum(1100, 1),
      { at: 1300, pose: { ...lr, ...rr, gazeX: 0, gazeY: 0.15, headY: 0 }, emotion: 'sly' },
      { at: 1500, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 1400, name: 'say' }],
  };

  /** Партия затянулась: потягивается и с удовольствием зевает. */
  const longGame: GestureDef = {
    id: 'scene:longGame',
    duration: 4600,
    keys: [
      { at: 0, pose: { lHandX: 130, lHandY: 200, lCtrlX: 92, lCtrlY: 260, lDX: 0, lDY: -10, lHandRot: -100, rHandX: 290, rHandY: 200, rCtrlX: 328, rCtrlY: 260, rDX: 0, rDY: -10, rHandRot: -80, torsoY: -3, headY: -3 }, eyes: 'closed', mouth: 'o', spring: { arm: { f: 1.8, zeta: 0.85 }, body: slow } },
      { at: 1300, pose: { ...lr, ...rr, torsoY: 0, headY: 0 }, eyes: null, mouth: null, emotion: 'laugh', spring: { arm: calm, body: calm } },
      { at: 1600, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 1500, name: 'say' }],
  };

  return [
    { id: 'tea', gesture: tea, weight: 1.3 },
    { id: 'seeds', gesture: seeds },
    { id: 'capNap', gesture: capNap, tier: 'special', minWaitMs: 20_000, weight: 1.4 },
    { id: 'stretch', gesture: stretch, weight: 0.8 },
    { id: 'mustache', gesture: mustache, moods: ['ahead', 'even'] },
    { id: 'newspaper', gesture: newspaper, tier: 'special', minWaitMs: 15_000, weight: 1.3 },
    { id: 'sugar', gesture: sugar },
    { id: 'sideGlance', gesture: sideGlance, weight: 1.2 },
    { id: 'countFingers', gesture: countFingers, moods: ['ahead', 'even'] },
    { id: 'settle', gesture: settle },
    { id: 'window', gesture: windowLook },
    { id: 'fastPlayer', gesture: fastPlayer, tag: 'playerFast' },
    { id: 'nudge', gesture: nudge, tag: 'playerSlow' },
    { id: 'longGame', gesture: longGame, tag: 'longGame', cooldownMs: 600_000 },
    ...matveyHabits(rest),
  ];
}

/**
 * Привычки Матвея — неторопливые жесты без слов: крутит большими пальцами, чешет затылок, покашливает в кулак,
 * приглаживает усы, поправляет кепку, кивает своим мыслям.
 */
export function matveyHabits(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);
  const h = (id: string, duration: number, keys: GestureDef['keys']): SceneDef => ({ id, tier: 'habit', gesture: { id: `habit:${id}`, duration, keys } });
  const twiddle = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { lHandRot: 30 + 18 * k, rHandRot: 150 - 18 * k }, spring: { arm: { f: 5, zeta: 0.6 } } });
  return [
    h('thumbs', 2400, [
      { at: 0, pose: { lHandX: 190, lHandY: 330, lCtrlX: 120, lCtrlY: 340, lDX: 12, lDY: -2, lFist: 1, rHandX: 230, rHandY: 330, rCtrlX: 300, rCtrlY: 340, rDX: -12, rDY: -2, rFist: 1, gazeY: 0.5 }, spring: { arm: calm } },
      twiddle(500, 1), twiddle(750, -1), twiddle(1000, 1), twiddle(1250, -1),
      { at: 1500, pose: { ...lr, ...rr, lFist: 0, rFist: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ]),
    h('scratchNeck', 2000, [
      { at: 0, pose: { rHandX: 286, rHandY: 176, rCtrlX: 344, rCtrlY: 250, rDX: -6, rDY: -8, rHandRot: -120, headRot: -4, headY: 2, gazeY: 0.6 }, spring: { arm: calm } },
      { at: 600, pose: { rHandY: 168 }, spring: { arm: quick } },
      { at: 780, pose: { rHandY: 176 } },
      { at: 960, pose: { rHandY: 168 } },
      { at: 1200, pose: { ...rr, headRot: 0, headY: 0, gazeY: 0.1 }, spring: { arm: calm } },
    ]),
    h('cough', 1600, [
      { at: 0, pose: { ...R_MOUTH, rFist: 1, rHandY: 222 }, spring: { arm: { f: 3.4, zeta: 0.78 } } },
      { at: 400, pose: { torsoY: 2, headY: 2 }, eyes: 'closed', spring: { body: quick, head: quick } },
      { at: 550, pose: { torsoY: 0, headY: 0 } },
      { at: 700, pose: { torsoY: 2, headY: 2 } },
      { at: 900, pose: { ...rr, rFist: 0, torsoY: 0, headY: 0 }, eyes: null, spring: { arm: calm, body: calm } },
    ]),
    h('wipeMustache', 1600, [
      { at: 0, pose: { ...R_MOUTH, rHandX: 236, rHandY: 200 }, spring: { arm: { f: 2.8, zeta: 0.8 } } },
      { at: 500, pose: { rHandX: 222 }, spring: { arm: quick } },
      { at: 700, pose: { rHandX: 248 } },
      { at: 950, pose: { ...rr }, spring: { arm: calm } },
    ]),
    h('capNudge', 1500, [
      { at: 0, pose: { rHandX: 284, rHandY: 100, rCtrlX: 340, rCtrlY: 210, rDX: -4, rDY: -6, rHandRot: -70 }, spring: { arm: { f: 2.6, zeta: 0.8 } } },
      { at: 600, pose: { hatRot: -3, hatY: 1 }, spring: { face: { f: 4, zeta: 0.8 } } },
      { at: 850, pose: { ...rr, hatRot: 0, hatY: 0 }, spring: { arm: calm } },
    ]),
    h('nod', 1600, [
      { at: 0, pose: { headY: 2.5, gazeY: 0.5 }, spring: { head: calm } },
      { at: 500, pose: { headY: 0 } },
      { at: 900, pose: { headY: 2 } },
      { at: 1200, pose: { headY: 0, gazeY: 0.1 } },
    ]),
  ];
}
