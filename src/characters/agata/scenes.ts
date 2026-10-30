// Сценки Бабушки Агаты — её «своя жизнь» за столом, пока игрок думает (src/characters/life.ts, docs/ART_STYLE.md §5.6).
// Агата бойкая и домашняя: то платочек, то конфетка, то карты к носу поднесёт — очки-то слабые; бывает, и задремлет.
// Левая рука держит веер карт, поэтому почти всё делает правая; реплика — на маркере say, ключ waitSpeech ждёт её конца.
import type { SpringParams } from '../../puppet/motion';
import type { GestureDef, Pose, SceneDef } from '../../puppet/types';

const soft: SpringParams = { f: 2.4, zeta: 0.82 };
const quick: SpringParams = { f: 6, zeta: 0.6 };
const slow: SpringParams = { f: 0.9, zeta: 0.95 };

const R = ['rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'] as const;
const L = ['lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot'] as const;
const only = (p: Pose, keys: readonly (keyof Pose)[]): Pose => Object.fromEntries(keys.map((k) => [k, p[k]])) as Pose;

/** Правая кисть у рта (под очками): платочек к носу, конфета в рот. */
const R_MOUTH: Pose = { rHandX: 238, rHandY: 214, rCtrlX: 330, rCtrlY: 292, rDX: -12, rDY: -12, rHandRot: -150 };
/** Правая кисть у левого рукава — там платочек. */
const R_SLEEVE: Pose = { rHandX: 178, rHandY: 322, rCtrlX: 290, rCtrlY: 372, rDX: -6, rDY: -4, rHandRot: -120 };

export function agataScenes(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);

  /** Платочек: достаёт из рукава, сморкается — от души, — убирает и оправдывается. */
  const hanky: GestureDef = {
    id: 'scene:hanky',
    duration: 4600,
    keys: [
      { at: 0, pose: { ...R_SLEEVE, gazeX: -0.45, gazeY: 0.7, headRot: -2, headY: 2 }, spring: { arm: soft } },
      { at: 520, pose: { rHandX: 196, rHandY: 312 }, props: { r: 'hanky' }, spring: { arm: { f: 3, zeta: 0.8 } } },
      { at: 820, pose: { ...R_MOUTH, rHandY: 200, gazeX: 0, gazeY: 0.2, headRot: 0, headY: -2 }, spring: { arm: { f: 2.8, zeta: 0.8 } } },
      { at: 1250, pose: { headY: -4, torsoY: -2, browLI: -6, browRI: -6 }, eyes: 'closed', mouth: 'o', spring: { head: soft, body: soft } },
      // «Пф-ф!» — два коротких рывка головы вперёд.
      { at: 1600, pose: { headY: 4, torsoY: 2, rHandY: 206 }, spring: { head: quick, body: quick, arm: quick } },
      { at: 1800, pose: { headY: -1, torsoY: 0, rHandY: 200 } },
      { at: 1980, pose: { headY: 4.5, torsoY: 2.5, rHandY: 207 } },
      { at: 2250, pose: { ...R_MOUTH, rHandX: 246, rHandY: 236, headY: 0, torsoY: 0, browLI: 2, browRI: 2 }, eyes: null, mouth: 'pursed', spring: { head: soft, body: soft, arm: soft } },
      { at: 2650, pose: { ...R_SLEEVE }, mouth: null, spring: { arm: soft } },
      { at: 3050, pose: { rHandX: 182 }, props: { r: null } },
      { at: 3250, pose: { ...rr, gazeX: 0, gazeY: 0.1, headRot: 1.5 }, emotion: 'sly', spring: { arm: soft } },
      { at: 3450, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 3300, name: 'say' }],
  };

  /** Конфетка: из кармана фартука, показывает игроку — «будешь?», — и с удовольствием ест сама. */
  const candy: GestureDef = {
    id: 'scene:candy',
    duration: 5400,
    keys: [
      { at: 0, pose: { rHandX: 262, rHandY: 352, rCtrlX: 318, rCtrlY: 352, rDX: -6, rDY: 4, rHandRot: -70, gazeX: 0.2, gazeY: 0.8, headRot: 2, headY: 2 }, spring: { arm: soft } },
      { at: 520, pose: { rHandY: 340 }, props: { r: 'candy' } },
      // Показывает: кисть вперёд-вверх, конфета на ладони, брови домиком.
      { at: 760, pose: { rHandX: 266, rHandY: 238, rCtrlX: 334, rCtrlY: 318, rDX: -8, rDY: -8, rHandRot: -110, gazeX: 0, gazeY: 0.1, headRot: -2, headY: 0, browLI: -8, browLO: -8, browRI: -8, browRO: -8 }, emotion: 'sly', spring: { arm: { f: 2.8, zeta: 0.78 } } },
      { at: 1000, pose: {}, waitSpeech: true },
      // Никто не берёт — разворачивает (покачивания кисти) и в рот.
      { at: 1300, pose: { rHandRot: -88, headRot: 0, browLI: 2, browLO: 2, browRI: 2, browRO: 2, gazeX: 0.2, gazeY: 0.5 }, spring: { arm: quick } },
      { at: 1500, pose: { rHandRot: -128 } },
      { at: 1700, pose: { rHandRot: -92 } },
      { at: 1950, pose: { ...R_MOUTH, rHandY: 220 }, mouth: 'o', spring: { arm: { f: 3, zeta: 0.8 } } },
      { at: 2350, pose: { rHandY: 226 }, props: { r: null }, mouth: 'pursed' },
      { at: 2600, pose: { ...rr, gazeY: 0.3 }, eyes: 'happy', emotion: 'laugh', spring: { arm: soft } },
      // Жуёт: рот то сжат, то волной; голова чуть кивает.
      { at: 2800, pose: { headY: 1 }, mouth: 'wavy', spring: { head: quick } },
      { at: 3050, pose: { headY: 0 }, mouth: 'pursed' },
      { at: 3300, pose: { headY: 1 }, mouth: 'wavy' },
      { at: 3550, pose: { headY: 0 }, mouth: 'pursed' },
      { at: 3800, pose: { headY: 1 }, mouth: 'wavy' },
      { at: 4050, pose: { headY: 0 }, mouth: null, eyes: null },
    ],
    markers: [{ at: 850, name: 'say' }],
  };

  /** Дальнозоркость: подносит веер к самому носу, щурится, потом отводит на вытянутую руку. */
  const peer: GestureDef = {
    id: 'scene:peer',
    duration: 4700,
    keys: [
      { at: 0, pose: { lHandX: 200, lHandY: 236, lCtrlX: 110, lCtrlY: 280, lHandRot: 30, fanRot: 6, headY: 3, headRot: -3, torsoY: 2, gazeX: -0.1, gazeY: 0.6, lidLI: -8, lidLO: -6, lidRI: -8, lidRO: -6, browLI: 6, browRI: 6, browLM: 0, browRM: 0 }, spring: { arm: { f: 2.6, zeta: 0.8 }, head: soft } },
      { at: 900, pose: { headY: 4, gazeY: 0.75 } },
      { at: 1250, pose: { lHandX: 96, lHandY: 360, lCtrlX: 60, lCtrlY: 330, lHandRot: -4, fanRot: -4, headY: -3, headRot: 4, torsoY: -2, gazeX: -0.7, gazeY: 0.75, lidLI: -18, lidLO: -18, lidRI: -18, lidRO: -18, browLI: -8, browRI: -8, browLM: -18, browRM: -18 }, eyes: 'wide', spring: { arm: { f: 2.2, zeta: 0.82 }, head: soft } },
      { at: 1800, pose: { headY: -2 } },
      { at: 2100, pose: { ...lr, fanRot: 0, headY: 0, headRot: 0, torsoY: 0, gazeX: 0, gazeY: 0.1, browLI: 2, browRI: 2, browLM: -6, browRM: -6 }, eyes: null, spring: { arm: soft } },
      { at: 2350, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 2250, name: 'say' }],
  };

  /** Задремала: веки тяжелеют, голова клонится… вздрогнула — «я не сплю!». Только когда игрок думает долго. */
  const doze: GestureDef = {
    id: 'scene:doze',
    duration: 6200,
    keys: [
      { at: 0, pose: { lidLI: -6, lidLO: -6, lidRI: -6, lidRO: -6, gazeY: 0.5, headY: 2 }, spring: { face: slow, head: slow } },
      { at: 1100, pose: { headY: 6, headRot: 5, torsoY: 2, lHandY: 346, fanRot: -6 }, eyes: 'closed', spring: { head: slow, body: slow, arm: slow } },
      { at: 2300, pose: { headY: 9, headRot: 7, torsoY: 3 }, mouth: 'o' },
      { at: 2900, pose: { headY: 7.5, headRot: 6 }, mouth: 'pursed' },
      { at: 3400, pose: { headY: 10, headRot: 8 }, mouth: 'o' },
      // Вздрогнула: голова вверх, глаза круглые.
      { at: 3900, pose: { headY: -4, headRot: -2, torsoY: -2, lHandY: 336, fanRot: 2, gazeX: 0.2, gazeY: 0 }, eyes: 'wide', mouth: null, emotion: 'surprise', spring: { head: { f: 6, zeta: 0.45 }, body: { f: 5, zeta: 0.5 }, arm: quick } },
      { at: 4300, pose: { headY: 0, headRot: 0, torsoY: 0, lHandY: 338, fanRot: 0 }, eyes: null, emotion: 'sly', spring: { head: soft, body: soft, arm: soft } },
      { at: 4500, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 4100, name: 'say' }],
  };

  /** Сквозняк: ёжится, кутается в шаль правой рукой, мелко вздрагивает. */
  const shawl: GestureDef = {
    id: 'scene:shawl',
    duration: 3900,
    keys: [
      { at: 0, pose: { torsoY: -3, headY: 3, rHandX: 164, rHandY: 262, rCtrlX: 280, rCtrlY: 330, rDX: -8, rDY: -8, rHandRot: -150, gazeX: 0.6, gazeY: -0.2, browLI: -7, browLO: 5, browRI: -7, browRO: 5, lidLI: -10, lidLO: -4, lidRI: -10, lidRO: -4 }, mouth: 'wavy', spring: { arm: { f: 2.8, zeta: 0.8 }, body: soft } },
      { at: 600, pose: { torsoRot: 1.2 }, spring: { body: { f: 9, zeta: 0.4 } } },
      { at: 720, pose: { torsoRot: -1.2 } },
      { at: 840, pose: { torsoRot: 1 } },
      { at: 960, pose: { torsoRot: -0.8 } },
      { at: 1080, pose: { torsoRot: 0 } },
      { at: 1300, pose: {}, mouth: null, waitSpeech: true },
      { at: 1500, pose: { ...rr, torsoY: 0, headY: 0, gazeX: 0, gazeY: 0.1, browLI: 2, browLO: 2, browRI: 2, browRO: 2, lidLI: -18, lidLO: -18, lidRI: -18, lidRO: -18 }, spring: { arm: soft, body: soft } },
    ],
    markers: [{ at: 1200, name: 'say' }],
  };

  /** Напевает себе под нос: глаза прикрыты, голова и веер качаются в такт, пальцы отстукивают по столу. */
  const sway = (at: number, side: number): GestureDef['keys'][number] => ({ at, pose: { headRot: 5 * side, torsoRot: 1.2 * side, fanRot: 6 * side, rHandY: side > 0 ? 386 : 392 } });
  const hum: GestureDef = {
    id: 'scene:hum',
    duration: 5600,
    keys: [
      { at: 0, pose: { headRot: 4, gazeY: -0.2 }, eyes: 'happy', emotion: 'warm', spring: { head: { f: 1.6, zeta: 0.7 }, body: { f: 1.4, zeta: 0.7 }, arm: { f: 4, zeta: 0.6 } } },
      sway(600, -1), sway(1200, 1), sway(1800, -1), sway(2400, 1), sway(3000, -1), sway(3600, 1),
      { at: 4200, pose: { headRot: 0, torsoRot: 0, fanRot: 0, rHandY: 392 }, eyes: null, spring: { head: soft, body: soft } },
      { at: 4300, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 200, name: 'say' }],
  };

  /** Подглядывает в карты игрока: тянется шеей, ловит себя — «я не подглядываю!» — и «разминает шею». */
  const peek: GestureDef = {
    id: 'scene:peek',
    duration: 5200,
    keys: [
      { at: 0, pose: { torsoY: -5, headY: -9, headRot: 2, gazeX: 0.1, gazeY: 1, lidLI: -6, lidLO: -4, lidRI: -6, lidRO: -4, browLI: -6, browRI: -8 }, emotion: 'sly', spring: { body: { f: 1.6, zeta: 0.85 }, head: { f: 1.8, zeta: 0.8 } } },
      { at: 1100, pose: { headY: -11, headRot: -2, gazeX: -0.25 } },
      // Поймана: назад, глаза круглые, ладонь «не-не».
      { at: 1700, pose: { torsoY: 1, headY: 1, headRot: 0, gazeX: 0, gazeY: 0, lidLI: -18, lidLO: -18, lidRI: -18, lidRO: -18, rHandX: 300, rHandY: 292, rCtrlX: 350, rCtrlY: 330, rDX: -4, rDY: -10, rHandRot: -90 }, eyes: 'wide', emotion: 'surprise', spring: { body: { f: 5, zeta: 0.55 }, head: { f: 5, zeta: 0.55 }, arm: { f: 4, zeta: 0.6 } } },
      { at: 1950, pose: { rHandRot: -70 }, spring: { arm: { f: 8, zeta: 0.5 } } },
      { at: 2100, pose: { rHandRot: -108 } },
      { at: 2250, pose: { rHandRot: -74 } },
      { at: 2400, pose: { ...rr }, eyes: null, emotion: 'laugh', spring: { arm: soft } },
      { at: 2500, pose: {}, waitSpeech: true },
      // Будто так и было: шею разминает.
      { at: 2700, pose: { headRot: 7, headX: 2 }, emotion: 'warm', spring: { head: { f: 2.2, zeta: 0.75 } } },
      { at: 3300, pose: { headRot: -7, headX: -2 } },
      { at: 3900, pose: { headRot: 0, headX: 0, torsoY: 0 } },
    ],
    markers: [{ at: 1850, name: 'say' }],
  };

  return [
    { id: 'hanky', gesture: hanky, weight: 1.2 },
    { id: 'candy', gesture: candy },
    { id: 'peer', gesture: peer },
    { id: 'doze', gesture: doze, minWaitMs: 22_000, weight: 1.4 },
    { id: 'shawl', gesture: shawl, weight: 0.8 },
    { id: 'hum', gesture: hum, moods: ['ahead', 'even'] },
    { id: 'peek', gesture: peek, minWaitMs: 9_000 },
  ];
}
