// Карта на сцене: лицо и рубашка, переворот, подъём и подсветка выбора; на столе — наклон к камере и тень.
import { Container, Graphics, Matrix, Sprite, type Texture } from 'pixi.js';

/** Сжатие по вертикали экрана у карты, лежащей на столе: стол виден под углом. */
export const TABLE_TILT = 0.8;

export class CardSprite extends Container {
  readonly code: string | null;
  private readonly face: Sprite;
  private readonly backSide: Sprite;
  private readonly glow = new Graphics();
  /** Тень на сукне и наклон к камере — внутренний слой, чтобы не мешать повороту и «прыжку» масштаба карты. */
  private readonly body = new Container();
  private readonly shade = new Graphics();
  private readonly tiltM = new Matrix();
  private shadeKey = '';
  private w = 48;
  private h = 68;
  /** 0 — рубашкой вверх, 1 — лицом. Промежуточные значения — переворот. */
  flip = 1;
  /** Подъём выбранной карты (доля высоты). */
  lift = 0;
  baseY = 0;
  /** 1 — карта в руке (без наклона); TABLE_TILT — лежит на столе. */
  tilt = 1;
  /** Прозрачность тени под картой: 0 — в руке, 1 — на столе. */
  shadow = 0;

  constructor(code: string | null, faceTex: Texture | null, backTex: Texture) {
    super();
    this.code = code;
    this.face = new Sprite(faceTex ?? backTex);
    this.backSide = new Sprite(backTex);
    for (const s of [this.face, this.backSide]) s.anchor.set(0.5);
    this.body.addChild(this.shade, this.glow, this.backSide, this.face);
    this.addChild(this.body);
    this.flip = faceTex ? 1 : 0;
    this.setCardSize(48, 68);
  }

  setCardSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.redrawGlow();
    this.shadeKey = '';
  }

  /** Тень чуть ниже и правее карты по экрану (при любом повороте): мягкий двойной край. */
  private redrawShade(): void {
    const key = `${this.w}:${this.h}:${this.rotation}`;
    if (key === this.shadeKey) return;
    this.shadeKey = key;
    const g = this.shade, w = this.w, h = this.h, r = w * 0.14;
    const c = Math.cos(this.rotation), sn = Math.sin(this.rotation);
    const sx = w * 0.05, sy = h * 0.05;
    const dx = sx * c + sy * sn, dy = -sx * sn + sy * c;
    g.clear();
    g.roundRect(-w / 2 + dx - w * 0.03, -h / 2 + dy - h * 0.01, w * 1.06, h * 1.03, r).fill({ color: 0x0e2420, alpha: 0.16 });
    g.roundRect(-w / 2 + dx, -h / 2 + dy, w, h, r).fill({ color: 0x0e2420, alpha: 0.24 });
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
    this.shade.visible = this.shadow > 0.01;
    if (this.shade.visible) this.redrawShade();
    this.shade.alpha = Math.min(1, this.shadow);
    // Наклон к камере: сжатие по вертикали экрана при любом повороте карты — R(−θ)·S(1, k)·R(θ) в осях карты.
    const k = this.tilt, c = Math.cos(this.rotation), sn = Math.sin(this.rotation);
    const off = c * sn * (k - 1);
    this.tiltM.set(c * c + k * sn * sn, off, off, sn * sn + k * c * c, 0, 0);
    this.body.setFromMatrix(this.tiltM);
  }
}
