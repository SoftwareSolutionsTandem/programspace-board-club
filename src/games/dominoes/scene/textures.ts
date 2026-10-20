// Набор текстур стола домино: Дед Матвей (общий контракт персонажа), 28 костей и рубашка, фон кафе.
import type { Texture } from 'pixi.js';
import { characterBank, characterJobs, characterTextures, renderJobs, takeTexture, type CharacterBank, type TextureJob } from '../../../characters/textures';
import { MATVEY_ART } from '../../../characters/matvey/art';
import { BG_DESIGN } from '../../../layout/layout';
import { cafeBackgroundSvg } from '../../../render/cafe';
import { boneCode, createSet } from '../rules/bones';
import { BONE_BOX, boneBackSvg, boneFaceSvg } from './boneArt';

export interface DominoTextureBank {
  readonly character: CharacterBank;
  readonly bones: Map<string, Texture>;
  readonly back: Texture;
  readonly background: Texture;
  readonly figureRes: number;
}

/** boneRes — пикселей на единицу рисунка кости (96 × 48). */
export async function buildDominoTextures(figureRes: number, boneRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<DominoTextureBank> {
  const jobs: TextureJob[] = characterJobs(MATVEY_ART, figureRes);
  const add = (key: string, svg: string, box: { w: number; h: number }, res: number) => jobs.push({ key, svg, w: box.w * res, h: box.h * res });
  for (const b of createSet()) add(`bone:${boneCode(b)}`, boneFaceSvg(b.hi, b.lo), BONE_BOX, boneRes);
  add('back', boneBackSvg(), BONE_BOX, boneRes);
  add('bg', cafeBackgroundSvg(), { w: BG_DESIGN.width, h: BG_DESIGN.height }, bgRes);
  const out = await renderJobs(jobs, onProgress);
  const bones = new Map<string, Texture>();
  for (const b of createSet()) bones.set(boneCode(b), takeTexture(out, `bone:${boneCode(b)}`));
  return { character: characterBank(MATVEY_ART, out), bones, back: takeTexture(out, 'back'), background: takeTexture(out, 'bg'), figureRes };
}

export function destroyDominoTextures(bank: DominoTextureBank): void {
  for (const t of [bank.back, bank.background, ...characterTextures(bank.character), ...bank.bones.values()]) t.destroy(true);
}
