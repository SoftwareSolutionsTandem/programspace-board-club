// Карта на сцене: лицо и рубашка, переворот, подъём и подсветка выбора.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

export class CardSprite extends Container {
  readonly code: string | null;
  private readonly face: Sprite;
  private readonly backSide: Sprite;
  private readonly glow = new Graphics();
  private w = 48;
  private h = 68;
  /** 0 — рубашкой вверх, 1 — лицом. Промежуточные значения — переворот. */
  flip = 1;
  /** Подъём выбранной карты (доля высоты). */
  lift = 0;
  baseY = 0;

  constructor(code: string | null, faceTex: Texture | null, backTex: Texture) {
    super();
    this.code = code;
    this.face = new Sprite(faceTex ?? backTex);
    this.backSide = new Sprite(backTex);
    for (const s of [this.face, this.backSide]) s.anchor.set(0.5);
    this.addChild(this.glow, this.backSide, this.face);
    this.flip = faceTex ? 1 : 0;
    this.setCardSize(48, 68);
  }

  setCardSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.redrawGlow();
  }

  get cardW(): number {
    return this.w;
  }

  get cardH(): number {
    return this.h;
  }

  private glowState: 'none' | 'selected' | 'playable' | 'target' = 'none';

  setGlow(state: 'none' | 'selected' | 'playable' | 'target'): void {
    if (state === this.glowState) return;
    this.glowState = state;
    this.redrawGlow();
  }

  private redrawGlow(): void {
    const g = this.glow;
    g.clear();
    if (this.glowState === 'none') return;
    const pad = this.glowState === 'selected' ? 5 : 3;
    const color = this.glowState === 'target' ? 0x7fd3c2 : 0xf4c542;
    g.roundRect(-this.w / 2 - pad, -this.h / 2 - pad, this.w + pad * 2, this.h + pad * 2, this.w * 0.16).stroke({ color, width: this.glowState === 'selected' ? 4 : 3, alpha: this.glowState === 'playable' ? 0.75 : 1 });
  }

  /** Применить flip/lift к спрайтам; вызывается каждый кадр. */
  sync(): void {
    const f = Math.min(1, Math.max(0, this.flip));
    const showFace = f >= 0.5;
    const sx = Math.abs(f - 0.5) * 2;
    this.face.visible = showFace;
    this.backSide.visible = !showFace;
    for (const s of [this.face, this.backSide]) {
      s.width = this.w * Math.max(0.02, sx);
      s.height = this.h;
    }
    this.glow.visible = showFace;
    this.pivot.y = this.lift * this.h;
  }
}
