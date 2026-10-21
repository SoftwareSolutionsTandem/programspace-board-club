// Риг-марионетка: собирает персонажа из частей рисунка и каждый кадр расставляет их по значениям каналов «мозга».
// Рукава рисуются заново каждый кадр той же «трубкой», что в рисунке (контур, заливка, круглые концы), — изгиб без швов.
// Внешний интерфейс совместим со старым ригом (src/characters/rig.ts) плюс throwCard() для броска, привязанного к карте.
import { Container, Graphics, RenderLayer, Sprite, type Texture } from 'pixi.js';
import type { Emotion, Pose as RigPose } from '../characters/types';
import type { PartSpec, Point, PuppetArt } from './art';
import { PuppetBrain } from './brain';
import { clamp, lerp, Spring } from './motion';
import type { PuppetBank } from './textures';
import type { MotionStyle } from './types';

const DEG = Math.PI / 180;
const CARD_W = 46, CARD_H = 66;

/** Где и как повернута карта в руке в момент броска (глобальные координаты) и её размер на экране. */
export interface Release {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly w: number;
  readonly h: number;
}

const placeSprite = (s: Sprite, box: { x: number; y: number; w: number; h: number }) => {
  s.position.set(box.x, box.y);
  s.width = box.w;
  s.height = box.h;
};

export class PuppetRig {
  /** Слой за столом: корпус и голова. */
  readonly back = new Container();
  /** Слой над краем стола: руки, веер, карта в руке. */
  readonly front = new Container();
  /** Порядок отрисовки карты, только что выпущенной из руки: над рукавом, под пальцами — как карта в руке.
   * Сцена прикрепляет сюда спрайт своей карты на время вылета (attach/detach), сам спрайт остаётся в её слое. */
  readonly releaseLayer = new RenderLayer();
  private heldGrace = false;
  readonly brain: PuppetBrain;
  private bank: PuppetBank | null = null;
  private art: PuppetArt | null = null;
  // Корпус и голова.
  private readonly torsoC = new Container();
  private readonly torso = new Sprite();
  private readonly head = new Container();
  private readonly bunC = new Container();
  private readonly bun = new Sprite();
  private readonly hair = new Sprite();
  private readonly earC: [Container, Container] = [new Container(), new Container()];
  private readonly ears: [Sprite, Sprite] = [new Sprite(), new Sprite()];
  private readonly face = new Sprite();
  private readonly blush = new Sprite();
  private readonly details = new Sprite();
  private readonly mouth = new Sprite();
  private readonly eyesPrev = new Sprite();
  private readonly eyes = new Sprite();
  private readonly pupils: [Sprite, Sprite] = [new Sprite(), new Sprite()];
  private readonly lids = new Graphics();
  private readonly glasses = new Sprite();
  private readonly brows = new Graphics();
  private readonly bangs = new Sprite();
  private readonly extras = new Map<Emotion, Sprite>();
  // Руки.
  private readonly armL = new Graphics();
  private readonly armR = new Graphics();
  private readonly cuffL = new Sprite();
  private readonly cuffR = new Sprite();
  private readonly handL = new Sprite();
  private readonly handR = new Sprite();
  readonly fan = new Container();
  private readonly held = new Sprite();
  private readonly joints = new Graphics();
  private fanCount = 6;
  private fanBack: Texture | null = null;
  private speechLevel = 0;
  private readonly lookX: Spring;
  private readonly lookY: Spring;
  private pendingRelease: ((r: Release) => void)[] = [];
  private releaseNow = false;
  private inUpdate = false;
  /** Показывать шарниры и скелет (демо-страница). */
  showJoints = false;
  /** Замедление времени (демо-страница): 1 — обычная скорость. */
  timeScale = 1;

  constructor(private readonly style: MotionStyle, seed = 1) {
    this.brain = new PuppetBrain(style, seed);
    // Персонаж — только картинка: руки над картами стола не перехватывают касания карт.
    this.back.eventMode = this.front.eventMode = 'none';
    this.lookX = new Spring(0, { f: 5, zeta: 0.9 });
    this.lookY = new Spring(2, { f: 5, zeta: 0.9 });
    this.torsoC.addChild(this.torso);
    this.bunC.addChild(this.bun);
    this.earC.forEach((c, i) => c.addChild(this.ears[i]!));
    this.head.addChild(this.bunC, this.hair, ...this.earC, this.face, this.blush, this.details, this.mouth, this.eyesPrev, this.eyes, ...this.pupils, this.lids, this.glasses, this.brows, this.bangs);
    this.back.addChild(this.torsoC, this.head);
    // Левая рука держит веер (кисть поверх карт); правая — поверх всего: тянется к вееру за картой.
    this.front.addChild(this.armL, this.cuffL, this.fan, this.handL, this.armR, this.cuffR, this.held, this.releaseLayer, this.handR, this.joints);
    for (const s of [...this.pupils, this.handL, this.handR, this.cuffL, this.cuffR, this.held]) s.anchor.set(0.5);
  }

  set reducedMotion(v: boolean) {
    this.brain.reduced = v;
  }

  get reducedMotion(): boolean {
    return this.brain.reduced;
  }

  get blinks(): number {
    return this.brain.blinks;
  }

  setTextures(bank: PuppetBank, fanBack: Texture | null = null): void {
    this.bank = bank;
    const art = bank.art;
    this.art = art;
    const tex = (p: PartSpec) => bank.parts.get(p.key)!;
    const h = art.head;
    this.torso.texture = tex(art.torso);
    placeSprite(this.torso, art.torso.box);
    this.torsoC.pivot.set(art.hip.x, art.hip.y);
    this.head.pivot.set(art.headPivot.x, art.headPivot.y);
    // Части головы — в своих областях (координаты головы).
    for (const [s, p] of [[this.hair, h.back], [this.face, h.face], [this.blush, h.blush], [this.details, h.details], [this.glasses, h.glasses], [this.bangs, h.bangs]] as const) {
      s.texture = tex(p);
      placeSprite(s, p.box);
    }
    // Пучок и серьги вращаются вокруг своих точек.
    const pivoted = (c: Container, s: Sprite, p: typeof h.bun) => {
      s.texture = tex(p);
      placeSprite(s, { ...p.box, x: p.box.x - p.pivot.x, y: p.box.y - p.pivot.y });
      c.position.set(p.pivot.x, p.pivot.y);
    };
    pivoted(this.bunC, this.bun, h.bun);
    h.earrings.forEach((p, i) => pivoted(this.earC[i]!, this.ears[i]!, p));
    placeSprite(this.eyes, h.eyes.ball.box);
    placeSprite(this.eyesPrev, h.eyes.ball.box);
    for (const s of this.pupils) {
      s.texture = tex(h.pupil);
      s.width = h.pupil.box.w;
      s.height = h.pupil.box.h;
    }
    for (const s of this.extras.values()) s.destroy();
    this.extras.clear();
    for (const [e, p] of Object.entries(h.extras) as [Emotion, PartSpec][]) {
      const s = new Sprite(tex(p));
      placeSprite(s, p.box);
      s.alpha = 0;
      this.extras.set(e, s);
      this.head.addChild(s);
    }
    for (const s of [this.handL, this.handR]) {
      s.texture = tex(art.hand);
      s.width = art.hand.box.w;
      s.height = art.hand.box.h;
    }
    for (const s of [this.cuffL, this.cuffR]) {
      s.texture = tex(art.cuff);
      s.width = art.cuff.box.w;
      s.height = art.cuff.box.h;
    }
    this.fanBack = fanBack;
    if (fanBack) {
      this.held.texture = fanBack;
      this.held.width = CARD_W * 0.82;
      this.held.height = CARD_H * 0.82;
    }
    this.held.visible = false;
    this.rebuildFan();
    this.layout();
  }

  setTransform(x: number, y: number, scale: number): void {
    for (const c of [this.back, this.front]) {
      c.position.set(x, y);
      c.scale.set(scale);
    }
  }

  setEmotion(e: Emotion): void {
    this.brain.setEmotion(e);
  }

  /** Совместимость со старым ригом: позы — базовые состояния; бросок ведёт сцена через throwCard(). */
  setPose(p: RigPose, holdMs = 0): void {
    if (p === 'throw') return;
    this.brain.setState(p, holdMs);
  }

  get currentPose(): RigPose {
    return this.brain.gestureId === 'throwCard' ? 'throw' : this.brain.currentState;
  }

  get currentEmotion(): Emotion {
    return this.brain.currentEmotion;
  }

  setSpeaking(level: number): void {
    // Огибающая уровня голоса: быстро открывается, мягче закрывается — рот не мерцает от кадра к кадру.
    this.speechLevel = level > this.speechLevel ? lerp(this.speechLevel, level, 0.55) : lerp(this.speechLevel, level, 0.2);
    this.brain.setSpeech(this.speechLevel);
  }

  setFanCount(n: number): void {
    if (n === this.fanCount) return;
    this.fanCount = n;
    this.rebuildFan();
  }

  /** Точка веера в координатах сцены. */
  fanPoint(): { x: number; y: number } {
    return this.front.toGlobal({ x: this.fan.x, y: this.fan.y - 20 });
  }

  /**
   * Бросок карты к точке сцены. Промис разрешается в момент, когда кисть отпускает карту:
   * сцена запускает полёт настоящей карты из положения карты в руке — рука и карта двигаются как одно целое.
   */
  throwCard(target: { x: number; y: number }): Promise<Release> {
    return new Promise((resolve) => {
      if (!this.art) {
        const p = this.fanPoint();
        resolve({ x: p.x, y: p.y, rotation: 0, w: 0, h: 0 });
        return;
      }
      const t = this.front.toLocal(target);
      this.pendingRelease.push(resolve);
      this.brain.play(this.style.throwCard(t), (name) => {
        if (name === 'release') this.releaseNow = true;
      });
      // Без движения (или прерванный жест) событие приходит сразу — отдаём текущее положение руки.
      if (this.releaseNow && !this.inUpdate) this.flushRelease();
    });
  }

  private flushRelease(): void {
    this.releaseNow = false;
    if (!this.pendingRelease.length) return;
    // Карта остаётся в руке ещё на этот кадр: спрайт сцены появится после ожидания промиса, уже после отрисовки,
    // и без этого на кадр карта пропадает совсем. Со следующим update её место займёт карта сцены.
    this.heldGrace = true;
    this.layout();
    const g = this.held.getGlobalPosition();
    const rot = this.held.rotation + this.front.rotation;
    const all = this.pendingRelease;
    this.pendingRelease = [];
    const m = this.front.worldTransform;
    const k = Math.hypot(m.a, m.b);
    for (const r of all) r({ x: g.x, y: g.y, rotation: rot, w: this.held.width * k, h: this.held.height * k });
  }

  private rebuildFan(): void {
    const tex = this.fanBack;
    this.fan.removeChildren().forEach((c) => c.destroy());
    if (!tex) return;
    const n = Math.min(this.fanCount, 12);
    const spread = Math.min(80, 20 + n * 10);
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.85);
      s.width = CARD_W;
      s.height = CARD_H;
      s.rotation = (t * spread * Math.PI) / 180;
      s.position.set(t * 18, Math.abs(t) * 6);
      this.fan.addChild(s);
    }
  }

  update(dtMs: number): void {
    const dt = dtMs * this.timeScale;
    this.heldGrace = false;
    this.inUpdate = true;
    this.brain.step(dt);
    this.inUpdate = false;
    this.layout(dt);
    if (this.releaseNow) this.flushRelease();
  }

  // ---------- расстановка частей ----------

  /** Точка корпуса после его поворота, сдвига и дыхания. */
  private torsoPoint(p: Point): Point {
    const art = this.art!;
    const v = this.brain.values;
    const a = v.torsoRot * DEG;
    const dx = p.x - art.hip.x;
    const dy = (p.y - art.hip.y) * (1 + this.brain.breath);
    return { x: art.hip.x + dx * Math.cos(a) - dy * Math.sin(a) + v.torsoX, y: art.hip.y + dx * Math.sin(a) + dy * Math.cos(a) + v.torsoY };
  }

  private layout(dtMs = 0): void {
    const art = this.art;
    const bank = this.bank;
    if (!art || !bank) return;
    const b = this.brain;
    const v = b.values;
    const rest = this.style.rest;
    // Корпус.
    this.torsoC.position.set(art.hip.x + v.torsoX, art.hip.y + v.torsoY);
    this.torsoC.rotation = v.torsoRot * DEG;
    this.torsoC.scale.y = 1 + b.breath;
    // Голова на шее.
    const neck = this.torsoPoint(art.neck);
    this.head.position.set(neck.x + v.headX, neck.y + v.headY);
    this.head.rotation = (v.torsoRot + v.headRot) * DEG;
    this.bunC.rotation = b.bun * DEG;
    this.earC[0].rotation = clamp(b.earL, -40, 40) * DEG;
    this.earC[1].rotation = clamp(b.earR, -40, 40) * DEG;
    this.blush.alpha = clamp(v.blush, 0, 1);
    // Рот: речь по уровню голоса, иначе — форма эмоции.
    const shapes = art.speechMouths;
    const m = this.speechLevel > 0.08 ? shapes[Math.min(shapes.length - 1, Math.floor(this.speechLevel * shapes.length))]! : art.emotionMouth(b.currentEmotion);
    const mt = bank.mouths.get(m);
    if (mt && this.mouth.texture !== mt) this.mouth.texture = mt;
    placeSprite(this.mouth, art.head.mouthBox);
    // Глаза: стиль со смешиванием; зрачки — по взгляду и смещению эмоции.
    const eyeTex = (s: typeof b.eyes) => bank.parts.get(art.head.eyes[s].key)!;
    this.eyes.texture = eyeTex(b.eyes);
    this.eyes.alpha = b.eyesMix;
    this.eyesPrev.visible = b.eyesMix < 1;
    this.eyesPrev.texture = eyeTex(b.eyesPrev);
    this.eyesPrev.alpha = 1 - b.eyesMix;
    const face = this.style.faces[b.currentEmotion];
    const dt = dtMs / 1000;
    const lx = dt > 0 ? this.lookX.step(face.look[0], dt) : this.lookX.y;
    const ly = dt > 0 ? this.lookY.step(face.look[1], dt) : this.lookY.y;
    const hasPupils = (s: typeof b.eyes) => s === 'ball' || s === 'wide' || s === 'star';
    const pupilAlpha = (hasPupils(b.eyes) ? b.eyesMix : 0) + (hasPupils(b.eyesPrev) ? 1 - b.eyesMix : 0);
    const starTex = bank.parts.get(art.head.pupilStar.key)!;
    const pupilTex = bank.parts.get(art.head.pupil.key)!;
    art.eyesAt.forEach((e, i) => {
      const s = this.pupils[i]!;
      // Зрачок остаётся внутри белка: смещение ограничено эллипсом.
      let ox = lx + v.gazeX * art.pupilRange.x;
      let oy = ly + v.gazeY * art.pupilRange.y;
      const k = Math.hypot(ox / 6.5, oy / 8);
      if (k > 1) {
        ox /= k;
        oy /= k;
      }
      s.position.set(e.x + ox, e.y + oy);
      s.texture = b.eyes === 'star' ? starTex : pupilTex;
      s.width = art.head.pupil.box.w * v.pupil;
      s.height = art.head.pupil.box.h * v.pupil;
      s.alpha = pupilAlpha;
      s.visible = pupilAlpha > 0.01;
    });
    this.drawLids();
    this.drawBrows();
    for (const [e, s] of this.extras) {
      const want = e === b.currentEmotion && this.style.faces[e].extras ? 1 : 0;
      s.alpha = b.reduced ? want : clamp(s.alpha + Math.sign(want - s.alpha) * (dtMs / 160), 0, 1);
      s.visible = s.alpha > 0.01;
    }
    // Руки.
    this.drawArm(this.armL, this.cuffL, this.handL, art.shoulders[0], v.lHandX, v.lHandY, v.lCtrlX, v.lCtrlY, v.lDX, v.lDY, v.lHandRot);
    this.drawArm(this.armR, this.cuffR, this.handR, art.shoulders[1], v.rHandX, v.rHandY, v.rCtrlX, v.rCtrlY, v.rDX, v.rDY, v.rHandRot);
    // Веер — в левой кисти, поворачивается вместе с ней.
    const lr = (v.lHandRot - rest.lHandRot) * DEG;
    const fo = art.fanOffset;
    this.fan.position.set(this.handL.x + fo.x * Math.cos(lr) - fo.y * Math.sin(lr), this.handL.y + fo.x * Math.sin(lr) + fo.y * Math.cos(lr));
    this.fan.rotation = lr + v.fanRot * DEG;
    this.fan.alpha = clamp(v.fanAlpha, 0, 1);
    this.fan.visible = this.fan.alpha > 0.01;
    // Карта в правой кисти.
    const rr = (v.rHandRot - rest.rHandRot) * DEG;
    const hc = art.heldCard;
    this.held.visible = (b.holdCard || this.heldGrace) && !!this.fanBack;
    this.held.position.set(this.handR.x + hc.x * Math.cos(rr) - hc.y * Math.sin(rr), this.handR.y + hc.x * Math.sin(rr) + hc.y * Math.cos(rr));
    this.held.rotation = rr + hc.rot * DEG;
    this.drawJoints();
  }

  /** Рукав от плеча через изгиб к запястью (квадратичная кривая, как tube() в рисунке), манжета и кисть. */
  private drawArm(g: Graphics, cuff: Sprite, hand: Sprite, shoulder: Point, ex: number, ey: number, cx: number, cy: number, hdx: number, hdy: number, rot: number): void {
    const art = this.art!;
    const s = this.torsoPoint(shoulder);
    // Изгиб следует за плечом наполовину: корпус наклоняется — локоть сдвигается вместе с ним.
    const c = { x: cx + (s.x - shoulder.x) * 0.5, y: cy + (s.y - shoulder.y) * 0.5 };
    const dx = ex - c.x, dy = ey - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const sl = art.sleeve;
    g.clear();
    g.moveTo(s.x, s.y).quadraticCurveTo(c.x, c.y, ex, ey).stroke({ width: sl.width + sl.outline, color: sl.line, cap: 'round', join: 'round' });
    g.moveTo(s.x, s.y).quadraticCurveTo(c.x, c.y, ex, ey).stroke({ width: sl.width, color: sl.fill, cap: 'round', join: 'round' });
    cuff.position.set(ex - ux * 5, ey - uy * 5);
    cuff.rotation = Math.atan2(uy, ux) + Math.PI / 2;
    hand.position.set(ex + hdx, ey + hdy);
    hand.rotation = rot * DEG;
  }

  /** Веки — по геометрии рисунка (art.ts, eye() → lid()), с морганием поверх. */
  private drawLids(): void {
    const art = this.art!;
    const b = this.brain;
    const v = b.values;
    const g = this.lids;
    g.clear();
    if (b.eyes === 'happy' || b.eyes === 'closed') return;
    const L = art.lid;
    const closed = b.eyes === 'wide' ? 18 : 14;
    const params: [number, number][] = [[b.lid(v.lidLI, closed), b.lid(v.lidLO, closed)], [b.lid(v.lidRI, closed), b.lid(v.lidRO, closed)]];
    art.eyesAt.forEach((e, i) => {
      const [iy, oy] = params[i]!;
      if (iy <= -16.5 && oy <= -16.5) return;
      const side = i === 0 ? -1 : 1;
      const inner = e.x - side * L.halfW, outer = e.x + side * L.halfW;
      const top = e.y - L.top;
      const mid = e.y + Math.min(iy, oy) - 2;
      g.moveTo(inner, e.y + iy).quadraticCurveTo(e.x, mid, outer, e.y + oy).lineTo(outer, top).lineTo(inner, top).closePath().fill(L.skin);
      g.moveTo(inner, e.y + iy).quadraticCurveTo(e.x, mid, outer, e.y + oy).stroke({ width: L.line, color: L.outline, cap: 'round', join: 'round' });
    });
  }

  /** Брови — по геометрии рисунка (art.ts, brow()): концы и середина плавно движутся. */
  private drawBrows(): void {
    const art = this.art!;
    const v = this.brain.values;
    const B = art.brow;
    const g = this.brows;
    g.clear();
    const sides: [number, number, number][] = [[v.browLI, v.browLO, v.browLM], [v.browRI, v.browRO, v.browRM]];
    art.eyesAt.forEach((e, i) => {
      const [iy, oy, my] = sides[i]!;
      const side = i === 0 ? -1 : 1;
      const cy = e.y + B.dy;
      const inner = e.x - side * B.halfW, outer = e.x + side * B.halfW;
      g.moveTo(outer, cy + oy).quadraticCurveTo(e.x, cy + my, inner, cy + iy).stroke({ width: B.width, color: B.color, cap: 'round' });
      g.moveTo(outer, cy + oy).quadraticCurveTo(e.x, cy + my, inner, cy + iy).stroke({ width: B.line, color: B.outline, alpha: B.lineAlpha, cap: 'round' });
    });
  }

  /** Шарниры и скелет поверх рисунка (демо-страница). */
  private drawJoints(): void {
    const g = this.joints;
    g.clear();
    if (!this.showJoints || !this.art) return;
    const art = this.art;
    const v = this.brain.values;
    const dot = (p: Point, color: number) => g.circle(p.x, p.y, 5).fill(color).stroke({ width: 1.5, color: 0xffffff });
    const hip = { x: art.hip.x + v.torsoX, y: art.hip.y + v.torsoY };
    const neck = { x: this.head.x, y: this.head.y };
    const sl = this.torsoPoint(art.shoulders[0]), sr = this.torsoPoint(art.shoulders[1]);
    const line = (a: Point, c: Point) => g.moveTo(a.x, a.y).lineTo(c.x, c.y).stroke({ width: 2, color: 0x2f7a72, alpha: 0.9 });
    line(hip, neck);
    line(sl, sr);
    line(sl, { x: v.lCtrlX, y: v.lCtrlY });
    line({ x: v.lCtrlX, y: v.lCtrlY }, this.handL);
    line(sr, { x: v.rCtrlX, y: v.rCtrlY });
    line({ x: v.rCtrlX, y: v.rCtrlY }, this.handR);
    for (const p of [hip, neck, sl, sr]) dot(p, 0x2f7a72);
    for (const p of [{ x: v.lCtrlX, y: v.lCtrlY }, { x: v.rCtrlX, y: v.rCtrlY }]) dot(p, 0xf4c542);
    for (const p of [this.handL, this.handR]) dot(p, 0xc8263a);
    const hg = (p: Point) => this.front.toLocal(this.head.toGlobal(p));
    for (const p of [art.head.bun.pivot, ...art.head.earrings.map((e) => e.pivot)]) dot(hg(p), 0x8e2236);
  }
}
