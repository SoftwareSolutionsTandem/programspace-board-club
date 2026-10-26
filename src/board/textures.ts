// Текстуры партии на доске: персонаж (части марионетки), фигуры и фон кафе.
import type { Texture } from 'pixi.js';
import { renderJobs, takeTexture, type TextureJob } from '../characters/textures';
import { BG_DESIGN } from '../layout/layout';
import type { PuppetArt } from '../puppet/art';
import { puppetBank, puppetJobs, puppetTextures } from '../puppet/textures';
import { cafeBackgroundSvg } from '../render/cafe';
import type { BoardBank, PieceInfo } from './scene';

export interface PieceArt {
  readonly key: string;
  readonly svg: string;
  readonly info: PieceInfo;
}

/** pieceRes — пикселей на единицу рисунка фигуры. */
export async function buildBoardTextures(puppet: PuppetArt, pieces: readonly PieceArt[], figureRes: number, pieceRes: number, bgRes: number, onProgress?: (done: number, total: number) => void): Promise<BoardBank> {
  const jobs: TextureJob[] = puppetJobs(puppet, figureRes);
  for (const p of pieces) jobs.push({ key: `piece:${p.key}`, svg: p.svg, w: p.info.w * pieceRes, h: p.info.h * pieceRes });
  jobs.push({ key: 'bg', svg: cafeBackgroundSvg(), w: BG_DESIGN.width * bgRes, h: BG_DESIGN.height * bgRes });
  const out = await renderJobs(jobs, onProgress);
  const map = new Map<string, Texture>();
  const info: Record<string, PieceInfo> = {};
  for (const p of pieces) {
    map.set(p.key, takeTexture(out, `piece:${p.key}`));
    info[p.key] = p.info;
  }
  return { character: puppetBank(puppet, figureRes, out), pieces: map, info, background: takeTexture(out, 'bg') };
}

export function destroyBoardTextures(bank: BoardBank): void {
  for (const t of [bank.background, ...puppetTextures(bank.character), ...bank.pieces.values()]) t.destroy(true);
}
