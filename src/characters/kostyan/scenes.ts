// Сценки Костяна — «своя жизнь» за шашечной доской (src/characters/life.ts, docs/ART_STYLE.md §5.6).
// Молодой, нетерпеливый и уверенный в себе: отвлекается на телефон (и тут же себя одёргивает), делает селфи «на фоне
// победы», играет на воздушной гитаре, зевает, напоминая, что пора ходить, хрустит пальцами перед решающим ходом.
import type { SpringParams } from '../../puppet/motion';
import type { GestureDef, Pose, SceneDef } from '../../puppet/types';

const brisk: SpringParams = { f: 3.4, zeta: 0.74 };
const quick: SpringParams = { f: 8, zeta: 0.5 };

const R = ['rHandX', 'rHandY', 'rCtrlX', 'rCtrlY', 'rDX', 'rDY', 'rHandRot'] as const;
const L = ['lHandX', 'lHandY', 'lCtrlX', 'lCtrlY', 'lDX', 'lDY', 'lHandRot'] as const;
const only = (p: Pose, keys: readonly (keyof Pose)[]): Pose => Object.fromEntries(keys.map((k) => [k, p[k]])) as Pose;

/** Правая кисть у кармана худи — там телефон. */
const R_POCKET: Pose = { rHandX: 248, rHandY: 360, rCtrlX: 318, rCtrlY: 350, rDX: -10, rDY: 2, rHandRot: -160 };
/** Телефон перед грудью, экран к себе. */
const R_PHONE: Pose = { rHandX: 236, rHandY: 282, rCtrlX: 322, rCtrlY: 330, rDX: -12, rDY: -8, rHandRot: -170 };

export function kostyanScenes(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const lr = only(rest, L);

  /** Телефон: достаёт, листает большим пальцем, фыркает от смешного — и убирает: «сейчас — шашки». */
  const scroll = (at: number, rot: number): GestureDef['keys'][number] => ({ at, pose: { rHandRot: rot }, spring: { arm: quick } });
  const phone: GestureDef = {
    id: 'scene:phone',
    duration: 6400,
    keys: [
      { at: 0, pose: { ...R_POCKET, gazeX: 0.2, gazeY: 0.8 }, spring: { arm: brisk } },
      { at: 450, pose: { rHandY: 352 }, props: { r: 'phone' } },
      { at: 650, pose: { ...R_PHONE, headY: 3, headRot: 2, gazeX: 0.15, gazeY: 0.95 }, emotion: 'think', spring: { arm: brisk } },
      scroll(1200, -164), scroll(1400, -172), scroll(1700, -163), scroll(1900, -172), scroll(2200, -164), scroll(2400, -171),
      // Смешное: брови вверх, смешок.
      { at: 2700, pose: { headY: 1 }, eyes: 'wide', emotion: 'surprise' },
      { at: 3000, pose: { torsoY: -2, headY: -1.5 }, eyes: null, emotion: 'laugh', spring: { body: { f: 5, zeta: 0.5 } } },
      { at: 3200, pose: { torsoY: 0, headY: 0 } },
      { at: 3400, pose: { torsoY: -1.5, headY: -1 } },
      // Спохватился: в карман, взгляд на доску.
      { at: 3700, pose: { ...R_POCKET, torsoY: 0, headY: 0, headRot: 0, gazeX: 0, gazeY: 0.5 }, emotion: 'sly', spring: { arm: brisk } },
      { at: 4100, pose: { rHandY: 368 }, props: { r: null } },
      { at: 4250, pose: { ...rr }, spring: { arm: brisk } },
      { at: 4400, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 4200, name: 'say' }],
  };

  /** Селфи: телефон на вытянутой руке, наклон головы, улыбка «на камеру», — «для истории!». */
  const selfie: GestureDef = {
    id: 'scene:selfie',
    duration: 6000,
    keys: [
      { at: 0, pose: { ...R_POCKET, gazeY: 0.7 }, spring: { arm: brisk } },
      { at: 450, pose: { rHandY: 352 }, props: { r: 'phone' } },
      { at: 700, props: { r: 'phoneBack' }, pose: { rHandX: 334, rHandY: 132, rCtrlX: 352, rCtrlY: 230, rDX: -4, rDY: -14, rHandRot: -120, headRot: -6, headX: 2, gazeX: 0.55, gazeY: -0.5, torsoRot: -1.5 }, emotion: 'sly', spring: { arm: { f: 2.8, zeta: 0.78 }, head: brisk } },
      { at: 1300, pose: { headRot: -8 }, eyes: 'happy', emotion: 'laugh' },
      { at: 1700, pose: {}, waitSpeech: true },
      // Щёлк: короткое моргание вспышки — кисть дёрнулась.
      { at: 1900, pose: { rHandY: 138 }, eyes: 'closed', spring: { arm: quick } },
      { at: 2050, pose: { rHandY: 132 }, eyes: 'happy' },
      { at: 2400, props: { r: 'phone' }, pose: { ...R_PHONE, headRot: 0, headX: 0, gazeX: 0.15, gazeY: 0.95, torsoRot: 0 }, eyes: null, emotion: 'think', spring: { arm: brisk, head: brisk } },
      { at: 3100, pose: { headY: 1 }, emotion: 'sly' },
      { at: 3500, pose: { ...R_POCKET, headY: 0, gazeX: 0, gazeY: 0.3 }, spring: { arm: brisk } },
      { at: 3900, pose: { rHandY: 368 }, props: { r: null } },
      { at: 4050, pose: { ...rr }, emotion: 'warm', spring: { arm: brisk } },
    ],
    markers: [{ at: 1500, name: 'say' }],
  };

  /** Воздушная гитара: левая — гриф, правая бьёт по струнам, голова в такт, глаза закрыты… заметил взгляд — смутился. */
  const strum = (at: number, down: boolean): GestureDef['keys'][number] => ({ at, pose: { rHandY: down ? 330 : 300, rHandRot: down ? -120 : -150, headY: down ? 2.5 : -1 }, spring: { arm: quick, head: { f: 6, zeta: 0.55 } } });
  const airGuitar: GestureDef = {
    id: 'scene:airGuitar',
    duration: 6200,
    keys: [
      { at: 0, pose: { lHandX: 110, lHandY: 250, lCtrlX: 70, lCtrlY: 300, lDX: 10, lDY: -10, lHandRot: -40, lFist: 1, rHandX: 252, rHandY: 310, rCtrlX: 320, rCtrlY: 340, rDX: -10, rDY: -4, rHandRot: -140, torsoRot: -2, headRot: 3 }, eyes: 'closed', emotion: 'azart', spring: { arm: brisk, body: brisk } },
      strum(600, true), strum(800, false), strum(1000, true), strum(1200, false), strum(1400, true), strum(1600, false),
      { at: 1800, pose: { lHandX: 126, lHandY: 236 }, mouth: 'grin' },
      strum(1900, true), strum(2100, false), strum(2300, true), strum(2500, false), strum(2700, true),
      // Открыл глаза — на него смотрят. Замер, румянец.
      { at: 3000, pose: { headY: 0, headRot: 0, torsoRot: 0, gazeX: 0, gazeY: 0.1, blush: 0.8 }, eyes: 'wide', mouth: null, emotion: 'surprise', spring: { head: brisk, body: brisk } },
      { at: 3500, pose: { ...lr, ...rr, lFist: 0, blush: 0.35 }, eyes: null, emotion: 'sly', spring: { arm: brisk } },
      { at: 3700, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 3600, name: 'say' }],
  };

  /** Зевок: потягивается во весь рост, руки за голову, откидывается — «ну давай, ходи уже». Только при долгом ожидании. */
  const yawn: GestureDef = {
    id: 'scene:yawn',
    duration: 6000,
    keys: [
      { at: 0, pose: { lHandX: 120, lHandY: 110, lCtrlX: 92, lCtrlY: 210, lDX: 0, lDY: -12, lHandRot: -100, rHandX: 300, rHandY: 110, rCtrlX: 328, rCtrlY: 210, rDX: 0, rDY: -12, rHandRot: -80, torsoY: -5, headY: -5 }, eyes: 'closed', mouth: 'o', spring: { arm: { f: 2.2, zeta: 0.8 }, body: { f: 1.6, zeta: 0.85 } } },
      { at: 1300, pose: { torsoY: -6, headY: -6, headRot: 2 } },
      // Руки за голову, откинулся.
      { at: 1900, pose: { lHandX: 160, lHandY: 74, lCtrlX: 92, lCtrlY: 160, lDX: 10, lDY: -6, lHandRot: -160, rHandX: 260, rHandY: 74, rCtrlX: 328, rCtrlY: 160, rDX: -10, rDY: -6, rHandRot: -20, torsoY: -2, headY: -2, headRot: -3 }, eyes: null, mouth: null, emotion: 'sly', spring: { arm: brisk, body: brisk } },
      { at: 2300, pose: {}, waitSpeech: true },
      { at: 2800, pose: { ...lr, ...rr, torsoY: 0, headY: 0, headRot: 0 }, emotion: 'warm', spring: { arm: brisk, body: brisk } },
    ],
    markers: [{ at: 2200, name: 'say' }],
  };

  /** Хрустит пальцами: кулаки вместе, три щелчка, встряхивает кисти — «разминка перед победой». */
  const crack = (at: number): GestureDef['keys'][number][] => [
    { at, pose: { lHandX: 200, rHandX: 220, torsoY: 1, lHandRot: 10, rHandRot: 170 }, spring: { arm: quick, body: quick } },
    { at: at + 160, pose: { lHandX: 194, rHandX: 226, torsoY: 0, lHandRot: 0, rHandRot: 180 } },
  ];
  const knuckles: GestureDef = {
    id: 'scene:knuckles',
    duration: 4600,
    keys: [
      { at: 0, pose: { lHandX: 194, lHandY: 300, lCtrlX: 120, lCtrlY: 330, lDX: 12, lDY: -4, lHandRot: 0, lFist: 1, rHandX: 226, rHandY: 300, rCtrlX: 300, rCtrlY: 330, rDX: -12, rDY: -4, rHandRot: 180, rFist: 1, gazeY: 0.4 }, emotion: 'azart', spring: { arm: brisk } },
      ...crack(600), ...crack(900), ...crack(1200),
      { at: 1400, pose: {}, waitSpeech: true },
      // Встряхнул кисти.
      { at: 1600, pose: { lHandX: 150, lHandY: 330, rHandX: 270, rHandY: 330, lFist: 0, rFist: 0, lHandRot: 30, rHandRot: 150 }, spring: { arm: quick } },
      { at: 1750, pose: { lHandRot: -10, rHandRot: 190 } },
      { at: 1900, pose: { lHandRot: 30, rHandRot: 150 } },
      { at: 2100, pose: { ...lr, ...rr, gazeY: 0.1 }, emotion: 'sly', spring: { arm: brisk } },
    ],
    markers: [{ at: 1380, name: 'say' }],
  };

  // ---------- LIFE-2: новые сценки ----------

  /** Газировка: банка из-под стола, щелчок (вздрогнул от шипения), пьёт запрокинув голову, — «ах!». */
  const soda: GestureDef = {
    id: 'scene:soda',
    duration: 5600,
    keys: [
      { at: 0, pose: { rHandX: 340, rHandY: 412, rCtrlX: 360, rCtrlY: 340, rDX: -6, rDY: 4, rHandRot: 160, gazeX: 0.7, gazeY: 0.9, torsoRot: 1.5 }, spring: { arm: brisk, body: brisk } },
      { at: 500, pose: { rHandY: 404 }, props: { r: 'soda' } },
      { at: 750, pose: { rHandX: 256, rHandY: 280, rCtrlX: 330, rCtrlY: 330, rDX: -10, rDY: -8, rHandRot: -170, lHandX: 214, lHandY: 268, lCtrlX: 120, lCtrlY: 330, lDX: 12, lDY: -8, lHandRot: -40, gazeX: 0.2, gazeY: 0.8, torsoRot: 0 }, spring: { arm: brisk } },
      // Пш-ш! — отпрянул.
      { at: 1200, pose: { headY: -3, torsoY: -2, ...lr }, eyes: 'wide', emotion: 'surprise', spring: { head: quick, body: quick, arm: brisk } },
      { at: 1500, pose: { headY: 0, torsoY: 0 }, eyes: null, emotion: 'laugh', spring: { head: brisk, body: brisk } },
      // Пьёт: банку к губам, голова назад.
      { at: 1800, pose: { rHandX: 236, rHandY: 196, rCtrlX: 330, rCtrlY: 280, rDX: -14, rDY: -12, rHandRot: -150, headY: -3, headRot: -3, gazeY: -0.6 }, eyes: 'closed', spring: { arm: brisk, head: brisk } },
      { at: 2700, pose: { rHandX: 260, rHandY: 290, rCtrlX: 330, rCtrlY: 330, rHandRot: -170, headY: 0, headRot: 0, gazeY: 0.1 }, eyes: 'happy', mouth: 'o', spring: { arm: brisk, head: brisk } },
      { at: 3000, pose: {}, mouth: null, waitSpeech: true },
      { at: 3300, pose: { rHandX: 340, rHandY: 412, rCtrlX: 360, rCtrlY: 340, rHandRot: 160, gazeX: 0.6, gazeY: 0.8 }, eyes: null, emotion: 'sly', spring: { arm: brisk } },
      { at: 3800, pose: { rHandY: 418 }, props: { r: null } },
      { at: 4000, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, spring: { arm: brisk } },
    ],
    markers: [{ at: 2900, name: 'say' }],
  };

  /** Спиннер: крутит на пальце, залипает, глаза за ним, — спохватывается. */
  const spin = (at: number, deg: number): GestureDef['keys'][number] => ({ at, pose: { propRotR: deg }, spring: { face: { f: 2.5, zeta: 0.9 } } });
  const spinner: GestureDef = {
    id: 'scene:spinner',
    duration: 5600,
    keys: [
      { at: 0, pose: { ...R_POCKET, gazeY: 0.8 }, spring: { arm: brisk } },
      { at: 450, pose: { rHandY: 352 }, props: { r: 'spinner' } },
      { at: 700, pose: { rHandX: 244, rHandY: 262, rCtrlX: 322, rCtrlY: 320, rDX: -10, rDY: -10, rHandRot: -120, gazeX: 0.25, gazeY: 0.6, headY: 2, propRotR: 0 }, spring: { arm: brisk } },
      // Щелчок пальцем другой руки — и закрутился.
      { at: 1000, pose: { lHandX: 222, lHandY: 260, lCtrlX: 120, lCtrlY: 320, lDX: 12, lDY: -6, lHandRot: -30 }, spring: { arm: quick } },
      // Голова плывёт за спиннером: «залип».
      { at: 1200, pose: { ...lr, propRotR: 720 }, spring: { arm: brisk, face: { f: 2.5, zeta: 0.9 } } },
      { at: 1500, pose: { headRot: 3 }, mouth: 'o', emotion: 'surprise', spring: { head: { f: 0.8, zeta: 0.9 } } },
      spin(1900, 1440),
      { at: 2400, pose: { headRot: -3 } },
      spin(2600, 2160),
      { at: 3300, pose: { headRot: 0, gazeX: 0, gazeY: 0.1, propRotR: 2700 }, mouth: null, emotion: 'sly', spring: { head: brisk, face: { f: 2.5, zeta: 0.9 } } },
      { at: 3500, pose: {}, waitSpeech: true },
      { at: 3800, pose: { ...R_POCKET }, spring: { arm: brisk } },
      { at: 4200, pose: { rHandY: 368, propRotR: 0 }, props: { r: null } },
      { at: 4350, pose: { ...rr }, spring: { arm: brisk } },
    ],
    markers: [{ at: 3400, name: 'say' }],
  };

  /** Кубик Рубика: крутит грани обеими руками, всё быстрее, — «почти!» — и откладывает. Особая: игрок думает долго. */
  const twist = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { propRotR: 90 * k, lHandRot: -40 + 20 * (k % 2), rHandX: 236 + (k % 2) * 6 }, spring: { face: { f: 6, zeta: 0.8 }, arm: quick } });
  const cube: GestureDef = {
    id: 'scene:cube',
    duration: 7400,
    keys: [
      { at: 0, pose: { ...R_POCKET, gazeY: 0.8 }, spring: { arm: brisk } },
      { at: 450, pose: { rHandY: 352 }, props: { r: 'cube' } },
      { at: 700, pose: { rHandX: 236, rHandY: 270, rCtrlX: 322, rCtrlY: 330, rDX: -12, rDY: -8, rHandRot: -150, lHandX: 196, lHandY: 276, lCtrlX: 116, lCtrlY: 330, lDX: 12, lDY: -8, lHandRot: -40, gazeX: 0.05, gazeY: 0.75, headY: 3 }, emotion: 'think', spring: { arm: brisk } },
      twist(1100, 1), twist(1500, 2), twist(1900, 3), twist(2200, 4), twist(2500, 5), twist(2750, 6), twist(3000, 7), twist(3200, 8),
      { at: 3500, pose: { headY: 0, gazeY: 0.1, browLI: -10, browRI: -10 }, eyes: 'wide', emotion: 'azart' },
      { at: 3800, pose: {}, waitSpeech: true },
      { at: 4100, pose: { ...R_POCKET, ...lr, browLI: 0, browRI: 0 }, eyes: null, emotion: 'sly', spring: { arm: brisk } },
      { at: 4500, pose: { rHandY: 368, propRotR: 0 }, props: { r: null } },
      { at: 4650, pose: { ...rr }, spring: { arm: brisk } },
    ],
    markers: [{ at: 3700, name: 'say' }],
  };

  /** Уведомление: вздрагивает от вибрации, читает — мама; краснеет, быстро отвечает, прячет. */
  const notify: GestureDef = {
    id: 'scene:notification',
    duration: 6400,
    keys: [
      { at: 0, pose: { torsoY: -1.5, headRot: 3, gazeX: 0.3, gazeY: 0.9 }, eyes: 'wide', emotion: 'surprise', spring: { body: quick, head: brisk } },
      { at: 300, pose: { torsoY: 0, ...R_POCKET }, eyes: null, spring: { body: brisk, arm: brisk } },
      { at: 700, pose: { rHandY: 352 }, props: { r: 'phone' } },
      { at: 950, pose: { ...R_PHONE, headY: 3, headRot: 2, gazeX: 0.15, gazeY: 0.95 }, emotion: 'think', spring: { arm: brisk } },
      // Мама. Краснеет, отвечает быстро.
      { at: 1700, pose: { blush: 0.9, browLI: -8, browLO: 6, browRI: -8, browRO: 6 }, emotion: 'warm' },
      { at: 2000, pose: { rHandRot: -164 }, spring: { arm: quick } },
      { at: 2150, pose: { rHandRot: -172 } },
      { at: 2300, pose: { rHandRot: -164 } },
      { at: 2450, pose: { rHandRot: -172 } },
      { at: 2700, pose: { ...R_POCKET, headY: 0, headRot: 0, gazeX: 0, gazeY: 0.1 }, spring: { arm: brisk } },
      { at: 3100, pose: { rHandY: 368 }, props: { r: null } },
      { at: 3250, pose: { ...rr }, emotion: 'laugh', spring: { arm: brisk } },
      { at: 3450, pose: {}, waitSpeech: true },
      { at: 3800, pose: { blush: 0.35, browLI: 0, browLO: 1, browRI: 0, browRO: 1 } },
    ],
    markers: [{ at: 3350, name: 'say' }],
  };

  /** Бицепс: закатывает рукав, напрягает, любуется — «три раза в неделю». */
  const flex: GestureDef = {
    id: 'scene:flex',
    duration: 4800,
    keys: [
      { at: 0, pose: { lHandX: 300, lHandY: 300, lCtrlX: 200, lCtrlY: 340, lDX: 10, lDY: 0, lHandRot: 20, gazeX: 0.5, gazeY: 0.6 }, spring: { arm: brisk } },
      { at: 400, pose: { lHandX: 310, lHandY: 290 }, spring: { arm: quick } },
      { at: 700, pose: { ...lr, rHandX: 320, rHandY: 196, rCtrlX: 352, rCtrlY: 290, rDX: -6, rDY: -12, rHandRot: -60, rFist: 1, torsoRot: 2, headRot: 4, gazeX: 0.7, gazeY: 0.2 }, emotion: 'sly', spring: { arm: { f: 4, zeta: 0.65 }, body: brisk } },
      { at: 1100, pose: { rHandY: 188 }, spring: { arm: quick } },
      { at: 1300, pose: { rHandY: 196 } },
      { at: 1500, pose: { gazeX: 0, gazeY: 0.1, headRot: 0 }, emotion: 'azart' },
      { at: 1700, pose: {}, waitSpeech: true },
      { at: 2000, pose: { ...rr, rFist: 0, torsoRot: 0 }, emotion: 'warm', spring: { arm: brisk, body: brisk } },
    ],
    markers: [{ at: 1600, name: 'say' }],
  };

  /** Танец победы: плечи в ритм, пальцы-пистолеты, кивки. Когда Костян ведёт. */
  const groove = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { torsoRot: 3 * k, torsoY: k > 0 ? -1 : 1, headRot: -4 * k, lHandX: 150 + 14 * k, rHandX: 270 + 14 * k }, spring: { body: { f: 4, zeta: 0.55 }, head: brisk, arm: brisk } });
  const dance: GestureDef = {
    id: 'scene:dance',
    duration: 5000,
    keys: [
      { at: 0, pose: { lHandX: 150, lHandY: 280, lCtrlX: 100, lCtrlY: 320, lDX: 10, lDY: -8, lHandRot: -60, lFist: 1, rHandX: 270, rHandY: 280, rCtrlX: 320, rCtrlY: 320, rDX: -10, rDY: -8, rHandRot: 240, rFist: 1 }, eyes: 'happy', emotion: 'laugh', spring: { arm: brisk } },
      groove(300, 1), groove(600, -1), groove(900, 1), groove(1200, -1), groove(1500, 1), groove(1800, -1), groove(2100, 1),
      { at: 2400, pose: { ...lr, ...rr, lFist: 0, rFist: 0, torsoRot: 0, torsoY: 0, headRot: 0 }, eyes: null, emotion: 'sly', spring: { arm: brisk, body: brisk } },
      { at: 2600, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 300, name: 'say' }],
  };

  /** Игрок спешит: откидывается, показывает «класс» — уважает темп. */
  const fastPlayer: GestureDef = {
    id: 'scene:fastPlayer',
    duration: 3800,
    keys: [
      { at: 0, pose: { torsoY: -2, rHandX: 296, rHandY: 250, rCtrlX: 340, rCtrlY: 310, rDX: -6, rDY: -10, rHandRot: -90, rFist: 1, gazeY: 0.1 }, eyes: 'wide', emotion: 'surprise', spring: { arm: brisk, body: brisk } },
      { at: 500, pose: {}, eyes: null, emotion: 'laugh' },
      { at: 700, pose: {}, waitSpeech: true },
      { at: 1000, pose: { ...rr, rFist: 0, torsoY: 0 }, emotion: 'warm', spring: { arm: brisk, body: brisk } },
    ],
    markers: [{ at: 400, name: 'say' }],
  };

  /** Игрок думает очень долго: подпирает щёку кулаком, тяжело вздыхает, закатывает глаза. */
  const nudge: GestureDef = {
    id: 'scene:nudge',
    duration: 4600,
    keys: [
      { at: 0, pose: { rHandX: 252, rHandY: 236, rCtrlX: 320, rCtrlY: 320, rDX: -10, rDY: -8, rHandRot: -120, rFist: 1, headRot: 6, headX: 3, gazeX: 0.1, gazeY: 0.3 }, emotion: 'annoyed', spring: { arm: brisk, head: brisk } },
      { at: 800, pose: { torsoY: 2, gazeY: -0.9, gazeX: 0.4 }, spring: { body: { f: 1.6, zeta: 0.85 } } },
      { at: 1400, pose: { torsoY: 0, gazeY: 0.2, gazeX: 0 }, emotion: 'sly' },
      { at: 1600, pose: {}, waitSpeech: true },
      { at: 1900, pose: { ...rr, rFist: 0, headRot: 0, headX: 0 }, spring: { arm: brisk, head: brisk } },
    ],
    markers: [{ at: 1500, name: 'say' }],
  };

  /** Партия затянулась: смотрит на «часы» на запястье, присвистывает — но доволен. */
  const longGame: GestureDef = {
    id: 'scene:longGame',
    duration: 4200,
    keys: [
      { at: 0, pose: { lHandX: 200, lHandY: 270, lCtrlX: 110, lCtrlY: 330, lDX: 12, lDY: -6, lHandRot: -20, gazeX: -0.3, gazeY: 0.8, headY: 2 }, spring: { arm: brisk } },
      { at: 800, pose: { browLI: -10, browRI: -10 }, mouth: 'o', emotion: 'surprise' },
      { at: 1200, pose: { ...lr, headY: 0, gazeX: 0, gazeY: 0.1, browLI: 0, browRI: 0 }, mouth: null, emotion: 'laugh', spring: { arm: brisk } },
      { at: 1400, pose: {}, waitSpeech: true },
    ],
    markers: [{ at: 1300, name: 'say' }],
  };

  return [
    { id: 'phone', gesture: phone, weight: 1.4 },
    { id: 'selfie', gesture: selfie, moods: ['ahead', 'even'] },
    { id: 'airGuitar', gesture: airGuitar, minWaitMs: 12_000 },
    { id: 'yawn', gesture: yawn, tier: 'special', minWaitMs: 20_000, weight: 1.3 },
    { id: 'knuckles', gesture: knuckles, moods: ['ahead', 'even'], weight: 0.9 },
    { id: 'soda', gesture: soda, weight: 1.2 },
    { id: 'spinner', gesture: spinner },
    { id: 'cube', gesture: cube, tier: 'special', minWaitMs: 15_000, weight: 1.3 },
    { id: 'notification', gesture: notify, weight: 1.2 },
    { id: 'flex', gesture: flex, moods: ['ahead', 'even'] },
    { id: 'dance', gesture: dance, moods: ['ahead'], weight: 1.5 },
    { id: 'fastPlayer', gesture: fastPlayer, tag: 'playerFast' },
    { id: 'nudge', gesture: nudge, tag: 'playerSlow' },
    { id: 'longGame', gesture: longGame, tag: 'longGame', cooldownMs: 600_000 },
    ...kostyanHabits(rest),
  ];
}

/**
 * Привычки Костяна — без слов, быстрые: качает ногой (подпрыгивает корпус), сдувает чуб, трогает карман с телефоном,
 * подпирает щёку, оглядывается, коротко хрустит шеей.
 */
export function kostyanHabits(rest: Pose): SceneDef[] {
  const rr = only(rest, R);
  const h = (id: string, duration: number, keys: GestureDef['keys']): SceneDef => ({ id, tier: 'habit', gesture: { id: `habit:${id}`, duration, keys } });
  const bounce = (at: number, k: number): GestureDef['keys'][number] => ({ at, pose: { torsoY: k ? -1.2 : 0.4, headY: k ? -0.8 : 0.4 }, spring: { body: { f: 7, zeta: 0.5 }, head: { f: 7, zeta: 0.5 } } });
  return [
    h('legBounce', 1700, [bounce(0, 1), bounce(160, 0), bounce(320, 1), bounce(480, 0), bounce(640, 1), bounce(800, 0), bounce(960, 1), { at: 1120, pose: { torsoY: 0, headY: 0 } }]),
    h('blowFringe', 1400, [
      { at: 0, pose: { gazeY: -0.8, gazeX: 0.1 }, mouth: 'o', spring: { gaze: { f: 6, zeta: 0.9 } } },
      { at: 300, pose: { hatY: -5, hatRot: -3 }, spring: { face: { f: 5, zeta: 0.3 } } },
      { at: 600, pose: { hatY: 0, hatRot: 0, gazeY: 0.1, gazeX: 0 }, mouth: null },
    ]),
    h('pocketCheck', 1500, [
      { at: 0, pose: { ...R_POCKET, gazeX: 0.3, gazeY: 0.9 }, spring: { arm: brisk } },
      { at: 500, pose: { rHandY: 368 }, spring: { arm: quick } },
      { at: 750, pose: { ...rr, gazeX: 0, gazeY: 0.1 }, spring: { arm: brisk } },
    ]),
    h('cheekRest', 2400, [
      { at: 0, pose: { lHandX: 168, lHandY: 238, lCtrlX: 100, lCtrlY: 320, lDX: 10, lDY: -8, lHandRot: -60, lFist: 1, headRot: -5, headX: -2, gazeY: 0.2 }, spring: { arm: brisk, head: brisk } },
      { at: 1500, pose: { ...only(rest, L), lFist: 0, headRot: 0, headX: 0, gazeY: 0.1 }, spring: { arm: brisk, head: brisk } },
    ]),
    h('lookAround', 2000, [
      { at: 0, pose: { gazeX: 0.9, headRot: 5, headX: 2 }, spring: { head: brisk } },
      { at: 700, pose: { gazeX: -0.9, headRot: -5, headX: -2 } },
      { at: 1300, pose: { gazeX: 0, gazeY: 0.1, headRot: 0, headX: 0 } },
    ]),
    h('neckCrack', 1300, [
      { at: 0, pose: { headRot: 8, headX: 3 }, eyes: 'closed', spring: { head: { f: 5, zeta: 0.6 } } },
      { at: 400, pose: { headRot: -8, headX: -3 } },
      { at: 800, pose: { headRot: 0, headX: 0 }, eyes: null },
    ]),
  ];
}
