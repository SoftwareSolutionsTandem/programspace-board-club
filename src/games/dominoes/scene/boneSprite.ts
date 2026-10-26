// Кость на сцене: лицо и рубашка, переворот, подсветка. Сама кость горизонтальна (2 × 1), поворот — у контейнера.
// На столе — наклон к камере и тень (как у карт дурака).
import { Container, Graphics, Matrix, Sprite, type Texture } from 'pixi.js';

/** Сжатие по вертикали экрана у кости, лежащей на столе. */
export const TABLE_TILT = 0.8;

export type BoneGlow = 'none' | 'playable' | 'selected';

export class BoneSprite extends Container {
  readonly code: string | null;
  private readonly face: Sprite;
  private readonly backSide: Sprite;
  private readonly glow = new Graphics();
  /** Тень и наклон — внутренний слой: поворот и подъём остаются у контейнера. */
  private readonly body = new Container();
  private readonly shade = new Graphics();
  private readonly tiltM = new Matrix();
  private shadeHalf = -1;
  private shadeRot = NaN;
  /** 1 — без наклона (рука игрока); TABLE_TILT — лежит на столе. */
  tilt = 1;
  /** Прозрачность тени: 0 — в руке, 1 — на столе. */
  shadow = 0;
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
    this.body.addChild(this.shade, this.glow, this.backSide, this.face);
    this.addChild(this.body);
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
    if (this.shadow > 0.01 && (this.shadeHalf !== this.half || this.shadeRot !== this.rotation)) this.redrawShade();
    this.shade.visible = this.shadow > 0.01;
    this.shade.alpha = Math.min(1, this.shadow);
    // Наклон к камере: сжатие по вертикали экрана при любом повороте кости — R(−θ)·S(1, t)·R(θ) в осях кости.
    const t = this.tilt, c = Math.cos(this.rotation), sn = Math.sin(this.rotation);
    const off = c * sn * (t - 1);
    this.tiltM.set(c * c + t * sn * sn, off, off, sn * sn + t * c * c, 0, 0);
    this.body.setFromMatrix(this.tiltM);
  }

  /** Тень на сукне — со сдвигом вниз по экрану при любом повороте кости. */
  private redrawShade(): void {
    this.shadeHalf = this.half;
    this.shadeRot = this.rotation;
    const g = this.shade, w = this.half * 2, h = this.half, r = h * 0.28;
    // Сдвиг тени задаём в экранных осях и переводим в оси кости.
    const c = Math.cos(this.rotation), sn = Math.sin(this.rotation);
    const sx = h * 0.08, sy = h * 0.16;
    const dx = sx * c + sy * sn, dy = -sx * sn + sy * c;
    g.clear();
    g.roundRect(-w / 2 + dx - h * 0.04, -h / 2 + dy - h * 0.02, w + h * 0.08, h + h * 0.06, r).fill({ color: 0x0e2420, alpha: 0.16 });
    g.roundRect(-w / 2 + dx, -h / 2 + dy, w, h, r).fill({ color: 0x0e2420, alpha: 0.26 });
  }
}
