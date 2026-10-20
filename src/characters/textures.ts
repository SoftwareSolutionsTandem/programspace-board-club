// Текстуры персонажа: тело, головы по эмоциям, рты, веки, руки по позам и кисть веера.
// Рисуются из векторного контракта персонажа (src/characters/art.ts) под масштаб и плотность экрана.
import type { Texture } from 'pixi.js';
import { svgTexture } from '../render/svgTexture';
import type { CharacterArt } from './art';
import { EMOTIONS, POSES, type Emotion, type Pose } from './types';

export interface CharacterBank {
  readonly art: CharacterArt;
  readonly body: Texture;
  readonly heads: Record<Emotion, Texture>;
  readonly mouths: Readonly<Record<string, Texture>>;
  readonly blink: Texture;
  readonly arms: Record<Pose, Texture>;
  readonly fanHand: Texture | null;
}

export interface TextureJob {
  readonly key: string;
  readonly svg: string;
  readonly w: number;
  readonly h: number;
}

/** Задания на текстуры персонажа: res — пикселей экрана на единицу рига. */
export function characterJobs(art: CharacterArt, res: number): TextureJob[] {
  const jobs: TextureJob[] = [];
  const add = (key: string, svg: string, box: { w: number; h: number }) => jobs.push({ key: `${art.id}:${key}`, svg, w: box.w * res, h: box.h * res });
  add('body', art.bodySvg(), art.figureBox);
  for (const e of EMOTIONS) add(`head:${e}`, art.headSvg(e), art.headBox);
  for (const m of art.mouths) add(`mouth:${m}`, art.mouthSvg(m), art.mouthBox);
  add('blink', art.blinkSvg(), art.headBox);
  for (const p of POSES) add(`arms:${p}`, art.armsSvg(p), art.figureBox);
  if (art.fan) add('fanHand', art.fan.handSvg(), art.figureBox);
  return jobs;
}

/** Рисует задания небольшими пачками, чтобы не блокировать поток надолго. */
export async function renderJobs(jobs: readonly TextureJob[], onProgress?: (done: number, total: number) => void): Promise<Map<string, Texture>> {
  const out = new Map<string, Texture>();
  let done = 0;
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = jobs.slice(i, i + 8);
    const textures = await Promise.all(batch.map((j) => svgTexture(j.svg, j.w, j.h)));
    batch.forEach((j, k) => out.set(j.key, textures[k] as Texture));
    done += batch.length;
    onProgress?.(done, jobs.length);
  }
  return out;
}

export function takeTexture(map: ReadonlyMap<string, Texture>, key: string): Texture {
  const t = map.get(key);
  if (!t) throw new Error(`нет текстуры ${key}`);
  return t;
}

export function characterBank(art: CharacterArt, map: ReadonlyMap<string, Texture>): CharacterBank {
  const get = (k: string) => takeTexture(map, `${art.id}:${k}`);
  return {
    art,
    body: get('body'),
    heads: Object.fromEntries(EMOTIONS.map((e) => [e, get(`head:${e}`)])) as Record<Emotion, Texture>,
    mouths: Object.fromEntries(art.mouths.map((m) => [m, get(`mouth:${m}`)])),
    blink: get('blink'),
    arms: Object.fromEntries(POSES.map((p) => [p, get(`arms:${p}`)])) as Record<Pose, Texture>,
    fanHand: art.fan ? get('fanHand') : null,
  };
}

export function characterTextures(bank: CharacterBank): Texture[] {
  return [bank.body, bank.blink, ...(bank.fanHand ? [bank.fanHand] : []), ...Object.values(bank.heads), ...Object.values(bank.mouths), ...Object.values(bank.arms)];
}
