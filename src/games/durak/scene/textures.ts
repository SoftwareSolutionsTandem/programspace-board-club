// Набор текстур партии: Агата (части марионетки, src/characters/agata/puppet.ts), карты, её комната и живые предметы.
// Текстуры генерируются из векторного рисунка под текущий масштаб и плотность экрана.
import type { Texture } from 'pixi.js';
import { AGATA_PUPPET } from '../../../characters/agata/puppet';
import { AGATA_ROOM } from '../../../characters/agata/room';
import { puppetBank, puppetJobs, puppetTextures, type PuppetBank } from '../../../puppet/textures';
import { renderJobs, takeTexture, type TextureJob } from '../../../characters/textures';
import { BG_DESIGN } from '../../../layout/layout';
import { ambientJobs, ambientTextures, type RoomArt } from '../../../render/ambient';
import { cardCode, createDeck } from '../rules/cards';
import { CARD_BOX, cardBackSvg, cardFaceSvg } from './cardArt';

export interface TextureBank {
  readonly puppet: PuppetBank;
  readonly cards: Map<string, Texture>;
  readonly back: Texture;
  readonly background: Texture;
  readonly room: RoomArt;
  readonly ambient: Map<string, Texture>;
  /** Масштабы, под которые нарисованы текстуры (пикселей на единицу рисунка). */
  readonly figureRes: number;
  readonly cardRes: number;
}

/** figureRes — пикселей экрана на единицу рига, cardRes — пикселей на единицу карты (48×68). */
export async function buildTextures(figureRes: number, cardRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<TextureBank> {
  const jobs: TextureJob[] = puppetJobs(AGATA_PUPPET, figureRes);
  const add = (key: string, svg: string, box: { w: number; h: number }, res: number) => jobs.push({ key, svg, w: box.w * res, h: box.h * res });
  for (const c of createDeck()) add(`card:${cardCode(c)}`, cardFaceSvg(c.suit, c.rank), CARD_BOX, cardRes);
  add('back', cardBackSvg(), CARD_BOX, cardRes);
  add('bg', AGATA_ROOM.backgroundSvg(), { w: BG_DESIGN.width, h: BG_DESIGN.height }, bgRes);
  jobs.push(...ambientJobs(AGATA_ROOM, bgRes));
  const out = await renderJobs(jobs, onProgress);
  const cards = new Map<string, Texture>();
  for (const c of createDeck()) cards.set(cardCode(c), takeTexture(out, `card:${cardCode(c)}`));
  return {
    puppet: puppetBank(AGATA_PUPPET, figureRes, out),
    cards,
    back: takeTexture(out, 'back'),
    background: takeTexture(out, 'bg'),
    room: AGATA_ROOM,
    ambient: ambientTextures(AGATA_ROOM, out),
    figureRes,
    cardRes,
  };
}

export function destroyTextures(bank: TextureBank): void {
  for (const t of [bank.back, bank.background, ...puppetTextures(bank.puppet), ...bank.cards.values(), ...bank.ambient.values()]) t.destroy(true);
}
