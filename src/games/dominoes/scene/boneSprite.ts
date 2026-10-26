// Кость на сцене: лицо и рубашка, переворот, подсветка. Сама кость горизонтальна (2 × 1), поворот — у контейнера.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

export type BoneGlow = 'none' | 'playable' | 'selected';

export class BoneSprite extends Container {
  readonly code: string | null;
  private readonly face: Sprite;
  private readonly backSide: Sprite;
  private readonly glow = new Graphics();
  /** Короткая сторона кости в пикселях сцены (анимируется твинами). */
  half = 24;
  private glowHalf = -1;
  private glowState: BoneGlow = 'none';
  /** 0 — рубашкой вверх, 1 — лицом. Промежуточные значения — переворот. */
  flip = 1;
  /** Подъём кости руки (доля длины кости) — подсветка допустимого хода. */
  lift = 0;

  constructor(code: string | null, faceTex: Texture | null, backTex: Texture) {
    super();
    this.code = code;
    this.face = new Sprite(faceTex ?? backTex);
    this.backSide = new Sprite(backTex);
    for (const s of [this.face, this.backSide]) s.anchor.set(0.5);
    this.addChild(this.glow, this.backSide, this.face);
    this.flip = faceTex ? 1 : 0;
    this.sync();
  }

  setTextures(faceTex: Texture | null, backTex: Texture): void {
    this.face.texture = faceTex ?? backTex;
    this.backSide.texture = backTex;
    this.sync();
  }

  setHalf(half: number): void {
    this.half = half;
    this.sync();
  }

  setGlow(state: BoneGlow): void {
    if (state === this.glowState) return;
    this.glowState = state;
    this.redrawGlow();
  }

  private redrawGlow(): void {
    this.glowHalf = this.half;
    const g = this.glow;
    g.clear();
    if (this.glowState === 'none') return;
    const w = this.half * 2, h = this.half;
    const pad = this.glowState === 'selected' ? 5 : 3;
    g.roundRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, h * 0.3).stroke({ color: 0xf4c542, width: this.glowState === 'selected' ? 4 : 3, alpha: this.glowState === 'playable' ? 0.8 : 1 });
  }

  /** Применить flip и lift; вызывается каждый кадр. */
  sync(): void {
    const f = Math.min(1, Math.max(0, this.flip));
    const showFace = f >= 0.5;
    const k = Math.abs(f - 0.5) * 2;
    this.face.visible = showFace;
    this.backSide.visible = !showFace;
    for (const s of [this.face, this.backSide]) {
      s.width = this.half * 2;
      s.height = this.half * Math.max(0.03, k);
    }
    if (this.glowHalf !== this.half) this.redrawGlow();
    this.glow.visible = showFace;
    // Подъём — вдоль длинной стороны (в руке кость стоит вертикально, подъём — вверх по экрану).
    this.pivot.x = this.lift * this.half * 2;
  }
}
