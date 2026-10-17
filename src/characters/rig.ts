// Риг сидящего персонажа (docs/ART_STYLE.md §5): слои тела, головы, рта, век и рук, веер своих карт.
// Анимации — дыхание, моргание, смена эмоции и позы, рот по уровню голоса. Состояние игры от рига не зависит.
import { Container, Sprite, type Texture } from 'pixi.js';
import { EXPR, emotionMouth, FAN_ANCHOR, FIGURE_BOX, HEAD_BOX, LID_TOP, MOUTH_BOX, poseHoldsFan, type MouthShape } from './agata/art';

// Моргание: веко опускается, держится и поднимается (мс).
const BLINK_CLOSE = 70, BLINK_HOLD = 50, BLINK_OPEN = 80;
// Глаза, которые не моргают: уже закрытые от смеха, «звёздочки» азарта, широко раскрытые от удивления.
const NO_BLINK_EYES = new Set(['happy', 'star', 'wide']);
import type { Emotion, Pose } from './types';
import type { TextureBank } from '../games/durak/scene/textures';

const place = (s: Sprite, box: { x: number; y: number; w: number; h: number }) => {
  s.position.set(box.x, box.y);
  s.width = box.w;
  s.height = box.h;
};

export class CharacterRig {
  /** Слой за столом: кресло, тело, голова. */
  readonly back = new Container();
  /** Слой над краем стола: веер карт и руки. */
  readonly front = new Container();
  private readonly body = new Sprite();
  private readonly headPivot = new Container();
  private readonly head = new Sprite();
  private readonly headOld = new Sprite();
  private readonly mouth = new Sprite();
  private readonly blink = new Sprite();
  private readonly arms = new Sprite();
  private readonly armsOld = new Sprite();
  private readonly fanHand = new Sprite();
  readonly fan = new Container();
  private bank: TextureBank | null = null;
  private emotion: Emotion = 'warm';
  private pose: Pose = 'idle';
  private poseUntil = 0;
  private time = 0;
  private nextBlink = 2500;
  private blinkStart = -Infinity;
  private blinkScaleY = 1;
  /** Сколько раз моргнула (для e2e). */
  blinks = 0;
  private crossHead = 1;
  private crossArms = 1;
  private speaking = 0;
  private fanCount = 6;
  private fanBack: Texture | null = null;
  reducedMotion = false;

  constructor() {
    this.back.addChild(this.body, this.headPivot);
    // Голова качается вокруг шеи (точка в единицах рига).
    this.headPivot.pivot.set(210, 225);
    this.headPivot.position.set(210, 225);
    this.headPivot.addChild(this.headOld, this.head, this.mouth, this.blink);
    // Порядок: руки (предплечья) → веер карт → кисть, держащая веер.
    this.front.addChild(this.armsOld, this.arms, this.fan, this.fanHand);
    this.fan.position.set(FAN_ANCHOR.x, FAN_ANCHOR.y);
  }

  setTextures(bank: TextureBank): void {
    this.bank = bank;
    this.body.texture = bank.body;
    place(this.body, FIGURE_BOX);
    for (const s of [this.head, this.headOld]) place(s, HEAD_BOX);
    this.blink.texture = bank.blink;
    place(this.blink, HEAD_BOX);
    // Точка опоры — верхний край век: масштаб по вертикали опускает веко сверху вниз.
    this.blinkScaleY = this.blink.scale.y;
    this.blink.anchor.set(0, (LID_TOP - HEAD_BOX.y) / HEAD_BOX.h);
    this.blink.y = LID_TOP;
    this.blink.visible = false;
    for (const s of [this.arms, this.armsOld, this.fanHand]) place(s, FIGURE_BOX);
    this.fanHand.texture = bank.fanHand;
    this.fanBack = bank.back;
    this.applyEmotion(true);
    this.applyPose(true);
    this.rebuildFan();
  }

  /** Положение и масштаб в координатах сцены: (x, y) — точка рига (originX, originY). */
  setTransform(x: number, y: number, scale: number): void {
    for (const c of [this.back, this.front]) {
      c.position.set(x, y);
      c.scale.set(scale);
    }
  }

  setEmotion(e: Emotion): void {
    if (e === this.emotion) return;
    this.emotion = e;
    this.applyEmotion(false);
  }

  /** Поза на время holdMs (0 — до следующей смены). */
  setPose(p: Pose, holdMs = 0): void {
    this.poseUntil = holdMs > 0 ? this.time + holdMs : 0;
    if (p === this.pose) return;
    this.pose = p;
    this.applyPose(false);
  }

  get currentPose(): Pose {
    return this.pose;
  }

  get currentEmotion(): Emotion {
    return this.emotion;
  }

  /** Уровень голоса 0…1: открытие рта во время реплики. */
  setSpeaking(level: number): void {
    this.speaking = level;
  }

  setFanCount(n: number): void {
    if (n === this.fanCount) return;
    this.fanCount = n;
    this.rebuildFan();
  }

  /** Точка веера в координатах родителя (куда «улетают» и откуда «прилетают» её карты). */
  fanPoint(): { x: number; y: number } {
    return this.front.toGlobal({ x: FAN_ANCHOR.x, y: FAN_ANCHOR.y - 20 });
  }

  private applyEmotion(instant: boolean): void {
    if (!this.bank) return;
    this.headOld.texture = this.head.texture;
    this.head.texture = this.bank.heads[this.emotion];
    this.crossHead = instant || this.reducedMotion ? 1 : 0;
    this.updateMouth();
  }

  private applyPose(instant: boolean): void {
    if (!this.bank) return;
    this.armsOld.texture = this.arms.texture;
    this.arms.texture = this.bank.arms[this.pose];
    this.crossArms = instant || this.reducedMotion ? 1 : 0;
    this.fan.visible = poseHoldsFan(this.pose);
    this.fanHand.visible = this.fan.visible;
  }

  private rebuildFan(): void {
    const tex = this.fanBack;
    this.fan.removeChildren().forEach((c) => c.destroy());
    if (!tex) return;
    // Показываем до 12 карт; угол и плотность веера зависят от числа карт.
    const n = Math.min(this.fanCount, 12);
    const spread = Math.min(80, 20 + n * 10);
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.85);
      s.width = 46;
      s.height = 66;
      s.rotation = (t * spread * Math.PI) / 180;
      s.position.set(t * 18, Math.abs(t) * 6);
      this.fan.addChild(s);
    }
  }

  private mouthShape(): MouthShape {
    if (this.speaking > 0.08) {
      const shapes: MouthShape[] = ['vB', 'vC', 'vE', 'vD'];
      return shapes[Math.min(shapes.length - 1, Math.floor(this.speaking * shapes.length))] as MouthShape;
    }
    return emotionMouth(this.emotion);
  }

  private updateMouth(): void {
    if (!this.bank) return;
    this.mouth.texture = this.bank.mouths[this.mouthShape()];
    place(this.mouth, MOUTH_BOX);
  }

  update(dtMs: number): void {
    this.time += dtMs;
    if (this.poseUntil > 0 && this.time >= this.poseUntil) {
      this.poseUntil = 0;
      this.setPose('idle');
    }
    // Плавная смена эмоции и позы (~150 и ~220 мс).
    if (this.crossHead < 1) this.crossHead = Math.min(1, this.crossHead + dtMs / 150);
    if (this.crossArms < 1) this.crossArms = Math.min(1, this.crossArms + dtMs / 220);
    this.head.alpha = this.crossHead;
    this.headOld.alpha = 1 - this.crossHead;
    this.headOld.visible = this.crossHead < 1;
    this.arms.alpha = this.crossArms;
    this.armsOld.alpha = 1 - this.crossArms;
    this.armsOld.visible = this.crossArms < 1;
    // Моргание каждые 2–6 с (детерминированно по времени, без Math.random).
    if (this.time >= this.nextBlink) {
      this.blinkStart = this.time;
      if (!NO_BLINK_EYES.has(EXPR[this.emotion].eyes)) this.blinks++;
      this.nextBlink = this.time + 2000 + ((this.time * 7919) % 4000);
    }
    const lid = NO_BLINK_EYES.has(EXPR[this.emotion].eyes) ? 0 : blinkAmount(this.time - this.blinkStart, this.reducedMotion);
    this.blink.visible = lid > 0;
    this.blink.scale.y = this.blinkScaleY * Math.max(lid, 0.001);
    if (!this.reducedMotion) {
      const breath = Math.sin(this.time / 900) * 0.008;
      this.headPivot.rotation = Math.sin(this.time / 1700) * 0.02;
      this.headPivot.y = 225 + breath * 300;
    }
    this.updateMouth();
  }
}

/** Насколько опущено веко (0 — открыт, 1 — закрыт) через `t` мс после начала моргания. Без движения — сразу закрыто на время моргания. */
export function blinkAmount(t: number, reducedMotion = false): number {
  if (t < 0 || t >= BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN) return 0;
  if (reducedMotion) return t < BLINK_CLOSE + BLINK_HOLD ? 1 : 0;
  if (t < BLINK_CLOSE) return t / BLINK_CLOSE;
  if (t < BLINK_CLOSE + BLINK_HOLD) return 1;
  return 1 - (t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN;
}
