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

  // ---------- LIFE-2: новые сценки ----------

  /** Вязание: кладёт карты, достаёт спицы, вяжет, показывает — «носочки тебе!», — спускает петлю, цокает, убирает. */
  const knitStep = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { rHandX: 232 + 6 * k, rHandRot: -120 + 10 * k, lHandX: 194 - 6 * k, lHandY: 300 + 3 * k } });
  const knitting: GestureDef = {
    id: 'scene:knitting',
    duration: 8400,
    keys: [
      { at: 0, pose: { fanAlpha: 0, lHandX: 176, lHandY: 352, lCtrlX: 110, lCtrlY: 330, rHandX: 320, rHandY: 404, rCtrlX: 352, rCtrlY: 340, rDX: -4, rDY: 6, rHandRot: -60, gazeX: 0.6, gazeY: 0.9, headRot: -2 }, spring: { arm: soft } },
      { at: 600, pose: { rHandY: 398 }, props: { r: 'knitting' } },
      { at: 850, pose: { rHandX: 232, rHandY: 296, rCtrlX: 320, rCtrlY: 340, rDX: -10, rDY: -6, rHandRot: -120, lHandX: 194, lHandY: 300, lCtrlX: 112, lCtrlY: 320, lDX: 8, lDY: -6, lHandRot: 30, gazeX: 0.1, gazeY: 0.9, headY: 3, headRot: 2, lidLI: -10, lidLO: -8, lidRI: -10, lidRO: -8 }, mouth: 'pursed', spring: { arm: { f: 2.6, zeta: 0.8 }, head: soft } },
      knitStep(1300, 1), knitStep(1550, -1), knitStep(1800, 1), knitStep(2050, -1), knitStep(2300, 1), knitStep(2550, -1),
      // Показывает работу игроку: «носочки тебе!».
      { at: 2900, pose: { rHandX: 252, rHandY: 250, rHandRot: -100, lHandX: 186, lHandY: 270, headY: 0, gazeX: 0, gazeY: 0.1, lidLI: -18, lidLO: -18, lidRI: -18, lidRO: -18 }, mouth: null, emotion: 'warm', spring: { arm: soft } },
      { at: 3200, pose: {}, waitSpeech: true },
      { at: 3500, pose: { rHandX: 232, rHandY: 296, rHandRot: -120, lHandX: 194, lHandY: 300, gazeY: 0.9, headY: 3 }, mouth: 'pursed', spring: { arm: soft } },
      knitStep(3900, 1), knitStep(4150, -1), knitStep(4400, 1), knitStep(4650, -1),
      // Ой! Петлю спустила: глаза круглые, цокает, качает головой.
      { at: 4900, pose: { headY: 5, browLI: -9, browRI: -9 }, eyes: 'wide', mouth: 'o', emotion: 'surprise', spring: { head: quick } },
      { at: 5300, pose: { headRot: 4 }, eyes: null, mouth: 'wavy', emotion: 'annoyed' },
      { at: 5550, pose: { headRot: -3 } },
      { at: 5800, pose: { headRot: 0, rHandX: 320, rHandY: 404, rCtrlX: 352, rCtrlY: 340, rHandRot: -60, lHandX: 176, lHandY: 352, gazeX: 0.6 }, mouth: null, spring: { arm: soft, head: soft } },
      { at: 6300, pose: { rHandY: 408 }, props: { r: null } },
      { at: 6500, pose: { ...lr, ...rr, fanAlpha: 1, headY: 0, gazeX: 0, gazeY: 0.1, browLI: 2, browRI: 2 }, emotion: 'warm', spring: { arm: soft } },
    ],
    markers: [{ at: 3100, name: 'say' }],
  };

  /** Где очки? Хлопает по карманам, оглядывается, — нащупала на носу, смеётся над собой. */
  const glassesSearch: GestureDef = {
    id: 'scene:glassesSearch',
    duration: 6400,
    keys: [
      { at: 0, pose: { rHandX: 256, rHandY: 334, rCtrlX: 322, rCtrlY: 352, rDX: -8, rDY: 2, rHandRot: -90, gazeX: 0.3, gazeY: 0.9, headY: 2, browLI: -7, browRI: -7, browLO: 5, browRO: 5 }, emotion: 'think', spring: { arm: soft } },
      { at: 450, pose: { rHandY: 342 }, spring: { arm: quick } },
      { at: 650, pose: { rHandY: 330 } },
      { at: 850, pose: { rHandY: 342 } },
      { at: 1150, pose: { rHandX: 190, rHandY: 320, rCtrlX: 290, rCtrlY: 370, gazeX: -0.4, gazeY: 0.9 }, spring: { arm: soft } },
      { at: 1450, pose: { rHandY: 330 }, spring: { arm: quick } },
      { at: 1650, pose: { rHandY: 318 } },
      // Оглядывается по сторонам.
      { at: 1950, pose: { ...rr, gazeX: -0.85, gazeY: 0, headRot: -5, headX: -2 }, emotion: 'surprise', spring: { arm: soft, head: soft } },
      { at: 2450, pose: { gazeX: 0.85, headRot: 5, headX: 2 } },
      { at: 2950, pose: { gazeX: 0, gazeY: 0.1, headRot: 0, headX: 0 } },
      // Нащупала очки на носу.
      { at: 3300, pose: { ...R_MOUTH, rHandX: 248, rHandY: 186, rDX: -8, rDY: -14 }, spring: { arm: { f: 3, zeta: 0.78 } } },
      { at: 3650, pose: { rHandY: 178, headY: -1.5, browLI: 2, browRI: 2, browLO: 2, browRO: 2 }, eyes: 'wide' },
      { at: 3950, pose: { ...rr, headY: 0 }, eyes: null, emotion: 'laugh', spring: { arm: soft } },
      { at: 4150, pose: { torsoY: -2, headY: -2 }, spring: { body: quick } },
      { at: 4350, pose: { torsoY: 0, headY: 0 } },
      { at: 4500, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 2400, name: 'say' }],
  };

  /** Пирожок: достаёт из-под стола, заботливо предлагает игроку, — откусывает сама. */
  const pie: GestureDef = {
    id: 'scene:pie',
    duration: 6400,
    keys: [
      { at: 0, pose: { rHandX: 340, rHandY: 410, rCtrlX: 356, rCtrlY: 340, rDX: -4, rDY: 6, rHandRot: -50, gazeX: 0.7, gazeY: 0.9, headRot: -3, torsoRot: 1.5 }, spring: { arm: soft, body: soft } },
      { at: 600, pose: { rHandY: 404 }, props: { r: 'pie' } },
      { at: 850, pose: { rHandX: 266, rHandY: 240, rCtrlX: 334, rCtrlY: 318, rDX: -8, rDY: -8, rHandRot: -110, gazeX: 0, gazeY: 0.1, headRot: -2, torsoRot: 0, browLI: -8, browLO: 5, browRI: -8, browRO: 5 }, emotion: 'warm', spring: { arm: { f: 2.8, zeta: 0.78 } } },
      { at: 1150, pose: {}, waitSpeech: true },
      { at: 1500, pose: { ...R_MOUTH, rHandY: 220, browLI: 2, browLO: 2, browRI: 2, browRO: 2 }, mouth: 'o', spring: { arm: { f: 3, zeta: 0.8 } } },
      { at: 1850, pose: { rHandY: 232, headY: 1 }, mouth: 'pursed' },
      { at: 2100, pose: { rHandX: 262, rHandY: 280, headY: 0 }, eyes: 'happy', mouth: 'wavy', emotion: 'laugh', spring: { arm: soft } },
      { at: 2350, pose: { headY: 1 }, mouth: 'pursed', spring: { head: quick } },
      { at: 2600, pose: { headY: 0 }, mouth: 'wavy' },
      { at: 2850, pose: { headY: 1 }, mouth: 'pursed' },
      { at: 3100, pose: { rHandX: 340, rHandY: 410, rCtrlX: 356, rCtrlY: 340, rHandRot: -50, headY: 0, gazeX: 0.6, gazeY: 0.8 }, eyes: null, mouth: null, spring: { arm: soft } },
      { at: 3600, pose: { rHandY: 414 }, props: { r: null } },
      { at: 3800, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: soft } },
    ],
    markers: [{ at: 1000, name: 'say' }],
  };

  /** Перебирает карты в веере: вытаскивает одну, перекладывает на другой край, бормочет. */
  const cardsSort: GestureDef = {
    id: 'scene:cardsSort',
    duration: 5200,
    keys: [
      { at: 0, pose: { rHandX: 196, rHandY: 300, rCtrlX: 300, rCtrlY: 350, rDX: -8, rDY: -6, rHandRot: -130, lHandX: 162, lHandY: 318, fanRot: -4, gazeX: -0.45, gazeY: 0.75, headRot: -3, headY: 2 }, emotion: 'think', spring: { arm: soft } },
      { at: 600, pose: { rHandX: 214, rHandY: 280, fanRot: 3 }, holdCard: true, spring: { arm: { f: 3.4, zeta: 0.75 } } },
      { at: 1100, pose: { rHandX: 230, rHandY: 262, gazeX: -0.1, gazeY: 0.5 }, holdCard: true },
      { at: 1600, pose: { rHandX: 170, rHandY: 292, fanRot: -6, gazeX: -0.6 }, holdCard: true, spring: { arm: soft } },
      { at: 2100, pose: { rHandY: 304, fanRot: 2 }, holdCard: false },
      { at: 2350, pose: { fanRot: -3 }, spring: { arm: quick } },
      { at: 2550, pose: { fanRot: 1 } },
      { at: 2800, pose: { ...rr, ...lr, fanRot: 0, gazeX: 0, gazeY: 0.1, headRot: 0, headY: 0 }, emotion: 'sly', spring: { arm: soft } },
      { at: 3000, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 500, name: 'say' }],
  };

  /** Блеф: прижимает карты к груди, тянется к игроку, подмигивает — «угадай!». */
  const bluff: GestureDef = {
    id: 'scene:bluff',
    duration: 5000,
    keys: [
      { at: 0, pose: { lHandX: 196, lHandY: 300, lCtrlX: 112, lCtrlY: 320, lHandRot: 40, fanRot: -10, torsoY: -3, headY: -4, headRot: 3, gazeX: 0, gazeY: 0.15 }, emotion: 'sly', spring: { arm: soft, body: soft, head: soft } },
      // Подмигивает: правое веко вниз.
      { at: 900, pose: { lidRI: 10, lidRO: 10, browRI: 6, browRO: 4 }, spring: { face: { f: 6, zeta: 0.7 } } },
      { at: 1250, pose: { lidRI: -3, lidRO: -1, browRI: -7, browRO: -9 } },
      { at: 1400, pose: {}, waitSpeech: true },
      { at: 1700, pose: { ...lr, fanRot: 0, torsoY: 0, headY: 0, headRot: 0 }, emotion: 'laugh', spring: { arm: soft, body: soft, head: soft } },
      { at: 1950, pose: { torsoY: -1.5, headY: -2 }, spring: { body: quick } },
      { at: 2150, pose: { torsoY: 0, headY: 0 } },
    ],
    markers: [{ at: 1300, name: 'say' }],
  };

  /** Зеркальце: из кармана, глядится, поворачивает голову, поправляет пучок, довольна собой. */
  const mirror: GestureDef = {
    id: 'scene:mirror',
    duration: 6600,
    keys: [
      { at: 0, pose: { rHandX: 262, rHandY: 352, rCtrlX: 318, rCtrlY: 352, rDX: -6, rDY: 4, rHandRot: -70, gazeX: 0.2, gazeY: 0.8 }, spring: { arm: soft } },
      // Зеркальце — в кулаке за ручку (ART-REV): раскрытая кисть с пальцами держала бы его кончиками.
      { at: 500, pose: { rHandY: 344, rFist: 1 }, props: { r: 'mirror' } },
      { at: 750, pose: { rHandX: 300, rHandY: 214, rCtrlX: 352, rCtrlY: 300, rDX: -6, rDY: -12, rHandRot: -95, gazeX: 0.75, gazeY: 0.1, headRot: 3, headX: 2 }, emotion: 'warm', spring: { arm: { f: 2.6, zeta: 0.8 } } },
      { at: 1300, pose: { headRot: -4, headX: -1, gazeX: 0.85 }, spring: { head: soft } },
      { at: 1800, pose: { headRot: 5, headX: 2, gazeX: 0.7 } },
      // Губы бантиком, бровки вверх.
      { at: 2300, pose: { headRot: 2, browLI: -8, browRI: -8, blush: 0.9 }, mouth: 'pursed', emotion: 'sly' },
      { at: 2700, pose: {}, mouth: null, waitSpeech: true },
      { at: 3000, pose: { rHandX: 262, rHandY: 352, rCtrlX: 318, rCtrlY: 352, rHandRot: -70, headRot: 0, headX: 0, gazeX: 0.2, gazeY: 0.8, browLI: 2, browRI: 2, blush: 0.55 }, spring: { arm: soft, head: soft } },
      { at: 3500, pose: { rHandY: 360, rFist: 0 }, props: { r: null } },
      { at: 3700, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, emotion: 'warm', spring: { arm: soft } },
    ],
    markers: [{ at: 2600, name: 'say' }],
  };

  /** «Жарко от твоих ходов»: рука к сердцу, обмахивается веером карт. Когда Агата проигрывает. */
  const fanning = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { fanRot: 14 * k, lHandRot: 40 + 12 * k } });
  const worry: GestureDef = {
    id: 'scene:worry',
    duration: 5000,
    keys: [
      { at: 0, pose: { rHandX: 238, rHandY: 292, rCtrlX: 320, rCtrlY: 340, rDX: -10, rDY: -6, rHandRot: -140, torsoY: -2, gazeY: -0.3, browLI: -8, browLO: 5, browRI: -8, browRO: 5 }, eyes: 'closed', emotion: 'annoyed', spring: { arm: soft, body: soft } },
      { at: 700, pose: { torsoY: 2, lHandX: 196, lHandY: 220, lCtrlX: 112, lCtrlY: 290, lDX: 6, lDY: -10, lHandRot: 40, gazeY: 0.1 }, eyes: null, spring: { arm: { f: 3, zeta: 0.75 }, body: soft } },
      fanning(1100, 1), fanning(1300, -1), fanning(1500, 1), fanning(1700, -1), fanning(1900, 1), fanning(2100, -1), fanning(2300, 1), fanning(2500, -1),
      { at: 2700, pose: { ...lr, ...rr, fanRot: 0, torsoY: 0, browLI: 2, browRI: 2, browLO: 2, browRO: 2 }, spring: { arm: soft, body: soft } },
      { at: 2900, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 1000, name: 'say' }],
  };

  /** Игрок ходит быстро: всплёскивает рукой, грозит пальцем — «куда торопишься?». */
  const wag = (at: number, rot: number): GestureDef['keys'][number] => ({ at, pose: { rHandRot: rot }, spring: { arm: { f: 7, zeta: 0.5 } } });
  const fastPlayer: GestureDef = {
    id: 'scene:fastPlayer',
    duration: 3800,
    keys: [
      { at: 0, pose: { rHandX: 300, rHandY: 240, rCtrlX: 350, rCtrlY: 320, rDX: -4, rDY: -12, rHandRot: -95, torsoY: -2, headY: -2, gazeX: 0, gazeY: 0.1, browLI: -9, browRI: -9 }, eyes: 'wide', emotion: 'surprise', spring: { arm: { f: 4, zeta: 0.65 }, body: soft } },
      { at: 500, pose: { rHandY: 210 }, eyes: null, emotion: 'sly' },
      wag(700, -80), wag(880, -110), wag(1060, -80), wag(1240, -110), wag(1420, -95),
      { at: 1600, pose: {}, waitSpeech: true },
      { at: 1900, pose: { ...rr, torsoY: 0, headY: 0, browLI: 2, browRI: 2 }, spring: { arm: soft, body: soft } },
    ],
    markers: [{ at: 400, name: 'say' }],
  };

  /** Игрок думает очень долго: наклоняется, стучит пальцем по столу — «внучек, ты там не уснул?». */
  const nudge: GestureDef = {
    id: 'scene:nudge',
    duration: 4200,
    keys: [
      { at: 0, pose: { torsoY: -3, headY: -4, rHandX: 286, rHandY: 398, rCtrlX: 340, rCtrlY: 340, rHandRot: -60, gazeX: 0, gazeY: 0.2, browLI: -6, browRI: -8 }, emotion: 'sly', spring: { body: soft, arm: soft } },
      { at: 500, pose: { rHandRot: -40, rHandY: 392 }, spring: { arm: { f: 8, zeta: 0.5 } } },
      { at: 650, pose: { rHandRot: -60, rHandY: 398 } },
      { at: 800, pose: { rHandRot: -40, rHandY: 392 } },
      { at: 950, pose: { rHandRot: -60, rHandY: 398 } },
      { at: 1200, pose: {}, waitSpeech: true },
      { at: 1500, pose: { ...rr, torsoY: 0, headY: 0, browLI: 2, browRI: 2 }, emotion: 'warm', spring: { body: soft, arm: soft } },
    ],
    markers: [{ at: 1100, name: 'say' }],
  };

  /** Партия затянулась: потягивается, зевает в ладошку, глядит на часы на стене. */
  const longGame: GestureDef = {
    id: 'scene:longGame',
    duration: 5000,
    keys: [
      { at: 0, pose: { torsoY: -4, headY: -3, rHandX: 248, rHandY: 200, rCtrlX: 330, rCtrlY: 280, rDX: -10, rDY: -12, rHandRot: -150 }, eyes: 'closed', mouth: 'o', spring: { body: { f: 1.6, zeta: 0.85 }, arm: soft } },
      { at: 1100, pose: { torsoY: 0, headY: 0, ...rr }, eyes: null, mouth: null, spring: { body: soft, arm: soft } },
      { at: 1500, pose: { gazeX: -0.8, gazeY: -0.6, headRot: -5, headX: -2 }, emotion: 'surprise', spring: { head: soft } },
      { at: 2100, pose: { gazeX: 0, gazeY: 0.1, headRot: 0, headX: 0 }, emotion: 'laugh' },
      { at: 2300, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 2000, name: 'say' }],
  };

  return [
    { id: 'hanky', gesture: hanky, weight: 1.2 },
    { id: 'candy', gesture: candy },
    { id: 'peer', gesture: peer },
    { id: 'doze', gesture: doze, tier: 'special', minWaitMs: 22_000, weight: 1.4 },
    { id: 'shawl', gesture: shawl, weight: 0.8 },
    { id: 'hum', gesture: hum, moods: ['ahead', 'even'] },
    { id: 'peek', gesture: peek, minWaitMs: 9_000 },
    { id: 'knitting', gesture: knitting, tier: 'special', minWaitMs: 15_000, weight: 1.3 },
    { id: 'glassesSearch', gesture: glassesSearch, weight: 1.2 },
    { id: 'pie', gesture: pie, weight: 1.2 },
    { id: 'cardsSort', gesture: cardsSort },
    { id: 'bluff', gesture: bluff, moods: ['ahead', 'even'] },
    { id: 'mirror', gesture: mirror },
    { id: 'worry', gesture: worry, moods: ['behind'], weight: 1.5 },
    { id: 'fastPlayer', gesture: fastPlayer, tag: 'playerFast' },
    { id: 'nudge', gesture: nudge, tag: 'playerSlow' },
    { id: 'longGame', gesture: longGame, tag: 'longGame', cooldownMs: 600_000 },
    ...agataHabits(rest),
  ];
}

/**
 * Привычки Агаты — короткие жесты без слов (уровень habit): заполняют паузы между сценками, в любую паузу партии.
 * Разгладить шаль, тронуть серёжку, оглядеться, хихикнуть про себя, постучать по столу, принюхаться, обмахнуться картами.
 */
export function agataHabits(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const h = (id: string, duration: number, keys: GestureDef['keys']): SceneDef => ({ id, tier: 'habit', gesture: { id: `habit:${id}`, duration, keys } });
  return [
    h('smoothShawl', 1900, [
      { at: 0, pose: { rHandX: 236, rHandY: 262, rCtrlX: 320, rCtrlY: 330, rDX: -10, rDY: -6, rHandRot: -140, gazeY: 0.8, headY: 2 }, spring: { arm: soft } },
      { at: 500, pose: { rHandY: 316 }, spring: { arm: { f: 2.2, zeta: 0.85 } } },
      { at: 900, pose: { rHandY: 270 } },
      { at: 1200, pose: { ...rr, gazeY: 0.1, headY: 0 }, spring: { arm: soft } },
    ]),
    h('earring', 1700, [
      { at: 0, pose: { rHandX: 282, rHandY: 198, rCtrlX: 344, rCtrlY: 280, rDX: -8, rDY: -10, rHandRot: -120, headRot: 3, gazeX: 0.4 }, spring: { arm: soft } },
      { at: 600, pose: { rHandY: 206, headRot: 4 }, spring: { arm: quick } },
      { at: 900, pose: { ...rr, headRot: 0, gazeX: 0 }, spring: { arm: soft } },
    ]),
    h('lookAround', 2300, [
      { at: 0, pose: { gazeX: -0.85, gazeY: -0.1, headRot: -4, headX: -2 }, spring: { head: soft } },
      { at: 800, pose: { gazeX: 0.85, headRot: 4, headX: 2 } },
      { at: 1600, pose: { gazeX: 0, gazeY: 0.1, headRot: 0, headX: 0 } },
    ]),
    h('giggle', 1300, [
      { at: 0, pose: { torsoY: -2, headY: -2.5, rHandX: 248, rHandY: 214, rCtrlX: 330, rCtrlY: 292, rDX: -12, rDY: -12, rHandRot: -150 }, eyes: 'happy', mouth: 'pursed', spring: { body: quick, arm: soft } },
      { at: 220, pose: { torsoY: -0.5, headY: -1 } },
      { at: 440, pose: { torsoY: -2, headY: -2.5 } },
      { at: 700, pose: { ...rr, torsoY: 0, headY: 0 }, eyes: null, mouth: null, spring: { arm: soft, body: soft } },
    ]),
    h('tapTable', 1500, [
      { at: 0, pose: { rHandRot: -30, rHandY: 388 }, spring: { arm: { f: 8, zeta: 0.5 } } },
      { at: 180, pose: { rHandRot: -46, rHandY: 394 } },
      { at: 360, pose: { rHandRot: -30, rHandY: 388 } },
      { at: 540, pose: { rHandRot: -46, rHandY: 394 } },
      { at: 720, pose: { rHandRot: -30, rHandY: 388 } },
      { at: 900, pose: { ...rr } },
    ]),
    h('sniff', 1300, [
      { at: 0, pose: { headY: -1.5, gazeX: 0.3, gazeY: -0.4 }, mouth: 'pursed', spring: { head: quick } },
      { at: 250, pose: { headY: -0.5 } },
      { at: 450, pose: { headY: -1.8 } },
      { at: 750, pose: { headY: 0, gazeX: 0, gazeY: 0.1 }, mouth: null },
    ]),
    h('fanSelf', 1600, [
      { at: 0, pose: { fanRot: 6, lHandRot: 18 }, spring: { arm: { f: 6, zeta: 0.55 } } },
      { at: 200, pose: { fanRot: -6, lHandRot: 2 } },
      { at: 400, pose: { fanRot: 6, lHandRot: 18 } },
      { at: 600, pose: { fanRot: -6, lHandRot: 2 } },
      { at: 800, pose: { fanRot: 0, lHandRot: 10 } },
    ]),
  ];
}
