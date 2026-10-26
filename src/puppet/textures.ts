// Текстуры частей марионетки: рисуются из SVG частей под масштаб и плотность экрана.
// Частей больше, чем слоёв старого рига, но они маленькие: нет пяти полноразмерных картинок рук и восьми голов.
import type { Texture } from 'pixi.js';
import { takeTexture, type TextureJob } from '../characters/textures';
import type { PartSpec, PuppetArt } from './art';
import type { EyeStyle } from './types';

export interface PuppetBank {
  readonly art: PuppetArt;
  readonly res: number;
  readonly parts: ReadonlyMap<string, Texture>;
  readonly mouths: ReadonlyMap<string, Texture>;
}

const EYE_STYLES: readonly EyeStyle[] = ['ball', 'wide', 'star', 'happy', 'closed'];

export function puppetParts(art: PuppetArt): PartSpec[] {
  const h = art.head;
  return [
    art.torso, h.bun, h.back, ...(h.earrings ?? []), h.face, h.blush, h.details, h.glasses, h.bangs,
    ...EYE_STYLES.map((s) => h.eyes[s]), h.pupil, h.pupilStar,
    ...(Object.values(h.extras) as PartSpec[]),
    art.hand, art.handFist, art.cuff,
  ].filter((p): p is PartSpec => !!p);
}

/** Задания на текстуры: res — пикселей экрана на единицу рига. */
export function puppetJobs(art: PuppetArt, res: number): TextureJob[] {
  const jobs: TextureJob[] = puppetParts(art).map((p) => ({ key: `${art.id}:part:${p.key}`, svg: p.svg(), w: p.box.w * res, h: p.box.h * res }));
  for (const m of art.head.mouths) jobs.push({ key: `${art.id}:mouth:${m}`, svg: art.head.mouthSvg(m), w: art.head.mouthBox.w * res, h: art.head.mouthBox.h * res });
  return jobs;
}

export function puppetBank(art: PuppetArt, res: number, map: ReadonlyMap<string, Texture>): PuppetBank {
  const parts = new Map<string, Texture>();
  for (const p of puppetParts(art)) parts.set(p.key, takeTexture(map, `${art.id}:part:${p.key}`));
  const mouths = new Map<string, Texture>();
  for (const m of art.head.mouths) mouths.set(m, takeTexture(map, `${art.id}:mouth:${m}`));
  return { art, res, parts, mouths };
}

export function puppetTextures(bank: PuppetBank): Texture[] {
  return [...bank.parts.values(), ...bank.mouths.values()];
}

