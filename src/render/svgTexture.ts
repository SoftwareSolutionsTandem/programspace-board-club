// SVG-строка → текстура Pixi заданного размера в пикселях (с учётом плотности экрана).
import { Texture } from 'pixi.js';

export async function svgTexture(svg: string, pxW: number, pxH: number): Promise<Texture> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(pxW));
    canvas.height = Math.max(1, Math.ceil(pxH));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d недоступен');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return Texture.from(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
