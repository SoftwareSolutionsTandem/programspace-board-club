// Набор текстур партии: Агата (через общий контракт персонажа), карты, фон кафе.
// Текстуры генерируются из векторного рисунка под текущий масштаб и плотность экрана.
import type { Texture } from 'pixi.js';
import { AGATA_ART } from '../../../characters/agata/art';
import { characterBank, characterJobs, characterTextures, renderJobs, takeTexture, type CharacterBank, type TextureJob } from '../../../characters/textures';
import { BG_DESIGN } from '../../../layout/layout';
import { cafeBackgroundSvg } from '../../../render/cafe';
import { cardCode, createDeck } from '../rules/cards';
import { CARD_BOX, cardBackSvg, cardFaceSvg } from './cardArt';

export interface TextureBank {
  readonly character: CharacterBank;
  readonly cards: Map<string, Texture>;
  readonly back: Texture;
  readonly background: Texture;
  /** Масштабы, под которые нарисованы текстуры (пикселей на единицу рисунка). */
  readonly figureRes: number;
  readonly cardRes: number;
}

/** figureRes — пикселей экрана на единицу рига, cardRes — пикселей на единицу карты (48×68). */
export async function buildTextures(figureRes: number, cardRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<TextureBank> {
  const jobs: TextureJob[] = characterJobs(AGATA_ART, figureRes);
  const add = (key: string, svg: string, box: { w: number; h: number }, res: number) => jobs.push({ key, svg, w: box.w * res, h: box.h * res });
  for (const c of createDeck()) add(`card:${cardCode(c)}`, cardFaceSvg(c.suit, c.rank), CARD_BOX, cardRes);
  add('back', cardBackSvg(), CARD_BOX, cardRes);
  add('bg', cafeBackgroundSvg(), { w: BG_DESIGN.width, h: BG_DESIGN.height }, bgRes);
  const out = await renderJobs(jobs, onProgress);
  const cards = new Map<string, Texture>();
  for (const c of createDeck()) cards.set(cardCode(c), takeTexture(out, `card:${cardCode(c)}`));
  return {
    character: characterBank(AGATA_ART, out),
    cards,
    back: takeTexture(out, 'back'),
    background: takeTexture(out, 'bg'),
    figureRes,
    cardRes,
  };
}

export function destroyTextures(bank: TextureBank): void {
  for (const t of [bank.back, bank.background, ...characterTextures(bank.character), ...bank.cards.values()]) t.destroy(true);
}
