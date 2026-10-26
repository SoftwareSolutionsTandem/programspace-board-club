// Набор текстур стола домино: Дед Матвей (части марионетки), 28 костей и рубашка, его веранда и живые предметы.
import type { Texture } from 'pixi.js';
import { renderJobs, takeTexture, type TextureJob } from '../../../characters/textures';
import { MATVEY_PUPPET } from '../../../characters/matvey/puppet';
import { MATVEY_ROOM } from '../../../characters/matvey/room';
import { puppetBank, puppetJobs, puppetTextures, type PuppetBank } from '../../../puppet/textures';
import { BG_DESIGN } from '../../../layout/layout';
import { ambientJobs, ambientTextures, type RoomArt } from '../../../render/ambient';
import { boneCode, createSet } from '../rules/bones';
import { BONE_BOX, boneBackSvg, boneFaceSvg } from './boneArt';

export interface DominoTextureBank {
  readonly character: PuppetBank;
  readonly bones: Map<string, Texture>;
  readonly back: Texture;
  readonly background: Texture;
  readonly room: RoomArt;
  readonly ambient: Map<string, Texture>;
  readonly figureRes: number;
}

/** boneRes — пикселей на единицу рисунка кости (96 × 48). */
export async function buildDominoTextures(figureRes: number, boneRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<DominoTextureBank> {
  const jobs: TextureJob[] = puppetJobs(MATVEY_PUPPET, figureRes);
  const add = (key: string, svg: string, box: { w: number; h: number }, res: number) => jobs.push({ key, svg, w: box.w * res, h: box.h * res });
  for (const b of createSet()) add(`bone:${boneCode(b)}`, boneFaceSvg(b.hi, b.lo), BONE_BOX, boneRes);
  add('back', boneBackSvg(), BONE_BOX, boneRes);
  add('bg', MATVEY_ROOM.backgroundSvg(), { w: BG_DESIGN.width, h: BG_DESIGN.height }, bgRes);
  jobs.push(...ambientJobs(MATVEY_ROOM, bgRes));
  const out = await renderJobs(jobs, onProgress);
  const bones = new Map<string, Texture>();
  for (const b of createSet()) bones.set(boneCode(b), takeTexture(out, `bone:${boneCode(b)}`));
  return { character: puppetBank(MATVEY_PUPPET, figureRes, out), bones, back: takeTexture(out, 'back'), background: takeTexture(out, 'bg'), room: MATVEY_ROOM, ambient: ambientTextures(MATVEY_ROOM, out), figureRes };
}

export function destroyDominoTextures(bank: DominoTextureBank): void {
  for (const t of [bank.back, bank.background, ...puppetTextures(bank.character), ...bank.bones.values(), ...bank.ambient.values()]) t.destroy(true);
}
