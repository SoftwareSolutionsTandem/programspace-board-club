// Набор текстур партии: Агата (тело, головы по эмоциям, рты, веки, руки по позам), карты, фон.
// Текстуры генерируются из векторного рисунка под текущий масштаб и плотность экрана.
import type { Texture } from 'pixi.js';
import { armsSvg, blinkSvg, fanHandSvg, bodySvg, CARD_BOX, cardBackSvg, cardFaceSvg, cafeBackgroundSvg, FIGURE_BOX, HEAD_BOX, headSvg, MOUTH_BOX, MOUTHS, mouthSvg, type MouthShape } from '../../../characters/agata/art';
import { EMOTIONS, POSES, type Emotion, type Pose } from '../../../characters/types';
import { svgTexture } from '../../../render/svgTexture';
import { cardCode, createDeck } from '../rules/cards';

export interface TextureBank {
  readonly body: Texture;
  readonly heads: Record<Emotion, Texture>;
  readonly mouths: Record<MouthShape, Texture>;
  readonly blink: Texture;
  readonly arms: Record<Pose, Texture>;
  readonly fanHand: Texture;
  readonly cards: Map<string, Texture>;
  readonly back: Texture;
  readonly background: Texture;
  /** Масштабы, под которые нарисованы текстуры (пикселей на единицу рисунка). */
  readonly figureRes: number;
  readonly cardRes: number;
}

/** figureRes — пикселей экрана на единицу рига, cardRes — пикселей на единицу карты (48×68). */
export async function buildTextures(figureRes: number, cardRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<TextureBank> {
  const jobs: { key: string; svg: string; w: number; h: number }[] = [];
  const add = (key: string, svg: string, box: { w: number; h: number }, res: number) => jobs.push({ key, svg, w: box.w * res, h: box.h * res });
  add('body', bodySvg(), FIGURE_BOX, figureRes);
  for (const e of EMOTIONS) add(`head:${e}`, headSvg(e), HEAD_BOX, figureRes);
  for (const m of MOUTHS) add(`mouth:${m}`, mouthSvg(m), MOUTH_BOX, figureRes);
  add('blink', blinkSvg(), HEAD_BOX, figureRes);
  for (const p of POSES) add(`arms:${p}`, armsSvg(p), FIGURE_BOX, figureRes);
  add('fanHand', fanHandSvg(), FIGURE_BOX, figureRes);
  for (const c of createDeck()) add(`card:${cardCode(c)}`, cardFaceSvg(c.suit, c.rank), CARD_BOX, cardRes);
  add('back', cardBackSvg(), CARD_BOX, cardRes);
  add('bg', cafeBackgroundSvg(), { w: 2400, h: 900 }, bgRes);
  const out = new Map<string, Texture>();
  let done = 0;
  // Небольшими пачками: не блокируем поток надолго.
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = jobs.slice(i, i + 8);
    const textures = await Promise.all(batch.map((j) => svgTexture(j.svg, j.w, j.h)));
    batch.forEach((j, k) => out.set(j.key, textures[k] as Texture));
    done += batch.length;
    onProgress?.(done, jobs.length);
  }
  const get = (k: string) => {
    const t = out.get(k);
    if (!t) throw new Error(`нет текстуры ${k}`);
    return t;
  };
  const cards = new Map<string, Texture>();
  for (const c of createDeck()) cards.set(cardCode(c), get(`card:${cardCode(c)}`));
  return {
    body: get('body'),
    heads: Object.fromEntries(EMOTIONS.map((e) => [e, get(`head:${e}`)])) as Record<Emotion, Texture>,
    mouths: Object.fromEntries(MOUTHS.map((m) => [m, get(`mouth:${m}`)])) as Record<MouthShape, Texture>,
    blink: get('blink'),
    arms: Object.fromEntries(POSES.map((p) => [p, get(`arms:${p}`)])) as Record<Pose, Texture>,
    fanHand: get('fanHand'),
    cards,
    back: get('back'),
    background: get('bg'),
    figureRes,
    cardRes,
  };
}

export function destroyTextures(bank: TextureBank): void {
  const all = [bank.body, bank.blink, bank.fanHand, bank.back, bank.background, ...Object.values(bank.heads), ...Object.values(bank.mouths), ...Object.values(bank.arms), ...bank.cards.values()];
  for (const t of all) t.destroy(true);
}
