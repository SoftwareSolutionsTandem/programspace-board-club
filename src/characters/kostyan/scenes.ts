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

  return [
    { id: 'phone', gesture: phone, weight: 1.4 },
    { id: 'selfie', gesture: selfie, moods: ['ahead', 'even'] },
    { id: 'airGuitar', gesture: airGuitar, minWaitMs: 12_000 },
    { id: 'yawn', gesture: yawn, minWaitMs: 20_000, weight: 1.3 },
    { id: 'knuckles', gesture: knuckles, moods: ['ahead', 'even'], weight: 0.9 },
  ];
}
