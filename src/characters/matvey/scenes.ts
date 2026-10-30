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

  return [
    { id: 'tea', gesture: tea, weight: 1.3 },
    { id: 'seeds', gesture: seeds },
    { id: 'capNap', gesture: capNap, minWaitMs: 20_000, weight: 1.4 },
    { id: 'stretch', gesture: stretch, weight: 0.8 },
    { id: 'mustache', gesture: mustache, moods: ['ahead', 'even'] },
  ];
}
