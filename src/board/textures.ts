// Текстуры партии на доске: персонаж (части марионетки), фигуры, комната персонажа и её живые предметы.
import type { Texture } from 'pixi.js';
import { renderJobs, takeTexture, type TextureJob } from '../characters/textures';
import { BG_DESIGN } from '../layout/layout';
import type { PuppetArt } from '../puppet/art';
import { puppetBank, puppetJobs, puppetTextures } from '../puppet/textures';
import { ambientJobs, ambientTextures, type RoomArt } from '../render/ambient';
import type { BoardBank, PieceInfo } from './scene';

export interface PieceArt {
  readonly key: string;
  readonly svg: string;
  readonly info: PieceInfo;
}

/** pieceRes — пикселей на единицу рисунка фигуры. */
export async function buildBoardTextures(puppet: PuppetArt, room: RoomArt, pieces: readonly PieceArt[], figureRes: number, pieceRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<BoardBank> {
  const jobs: TextureJob[] = puppetJobs(puppet, figureRes);
  for (const p of pieces) jobs.push({ key: `piece:${p.key}`, svg: p.svg, w: p.info.w * pieceRes, h: p.info.h * pieceRes });
  jobs.push({ key: 'bg', svg: room.backgroundSvg(), w: BG_DESIGN.width * bgRes, h: BG_DESIGN.height * bgRes }, ...ambientJobs(room, bgRes));
  const out = await renderJobs(jobs, onProgress);
  const map = new Map<string, Texture>();
  const info: Record<string, PieceInfo> = {};
  for (const p of pieces) {
    map.set(p.key, takeTexture(out, `piece:${p.key}`));
    info[p.key] = p.info;
  }
  return { character: puppetBank(puppet, figureRes, out), pieces: map, info, background: takeTexture(out, 'bg'), room, ambient: ambientTextures(room, out) };
}

export function destroyBoardTextures(bank: BoardBank): void {
  for (const t of [bank.background, ...puppetTextures(bank.character), ...bank.pieces.values(), ...bank.ambient.values()]) t.destroy(true);
}
