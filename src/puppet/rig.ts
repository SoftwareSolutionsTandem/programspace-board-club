// Риг-марионетка: собирает персонажа из частей рисунка и каждый кадр расставляет их по значениям каналов «мозга».
// Рукава рисуются заново каждый кадр той же «трубкой», что в рисунке (контур, заливка, круглые концы), — изгиб без швов.
// Внешний интерфейс совместим со старым ригом (src/characters/rig.ts) плюс throwCard() для броска, привязанного к карте.
import { Container, Graphics, RenderLayer, Sprite, type Texture } from 'pixi.js';
import type { Emotion, Pose as RigPose } from '../characters/types';
import type { PartSpec, PivotPart, Point, PuppetArt } from './art';
import { PuppetBrain } from './brain';
import { clamp, lerp, Spring } from './motion';
import { SpeechMouth } from './speech';
import type { PuppetBank } from './textures';
import type { GestureDef, MotionStyle, SceneDef } from './types';

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
  /**
   * Слой руки, тянущейся над столом: сцена ставит его над предметами на столе (у Агаты не используется).
   * Порядок внутри: рукав, манжета, предмет в руке, выпущенный предмет (zIndex 3), кисть.
   */
  readonly overLayer = new RenderLayer({ sortableChildren: true });
  private over: 'l' | 'r' | null = null;
  private heldGrace = false;
  private freeWaiters: (() => void)[] = [];
  readonly brain: PuppetBrain;
  private bank: PuppetBank | null = null;
  private art: PuppetArt | null = null;
  // Корпус и голова.
  private readonly torsoC = new Container();
  private readonly torso = new Sprite();
  /** Бахрома шали — рисуется каждый кадр, качается на пружине. */
  private readonly fringe = new Graphics();
  private fringeDrawn = NaN;
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
  private readonly eyeS: [Sprite, Sprite] = [new Sprite(), new Sprite()];
  private readonly pupils: [Sprite, Sprite] = [new Sprite(), new Sprite()];
  private readonly lids = new Graphics();
  private readonly glasses = new Sprite();
  private readonly brows = new Graphics();
  private readonly bangsC = new Container();
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
  /** Реквизит сценок в левой и правой кисти (платочек, часы, телефон): появляется и исчезает плавно. */
  private readonly props: [Sprite, Sprite] = [new Sprite(), new Sprite()];
  private readonly propShown: [string | null, string | null] = [null, null];
  private readonly joints = new Graphics();
  private fanCount = 6;
  private fanBack: Texture | null = null;
  private heldTex: Texture | null = null;
  private speechLevel = 0;
  private speech: SpeechMouth | null = null;
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
    this.torsoC.addChild(this.torso, this.fringe);
    this.bunC.addChild(this.bun);
    this.bangsC.addChild(this.bangs);
    this.earC.forEach((c, i) => c.addChild(this.ears[i]!));
    // Рот — над слоем «над глазами»: у Матвея усы лежат поверх носа; у Агаты очки и рот не пересекаются.
    this.head.addChild(this.bunC, this.hair, ...this.earC, this.face, this.blush, this.details, ...this.eyeS, ...this.pupils, this.lids, this.glasses, this.mouth, this.brows, this.bangsC);
    this.back.addChild(this.torsoC, this.head);
    // Левая рука держит веер (кисть поверх карт); правая — поверх всего: тянется к вееру за картой.
    this.front.addChild(this.armL, this.cuffL, this.fan, this.handL, this.armR, this.cuffR, this.held, this.releaseLayer, this.handR, this.joints);
    this.front.addChild(...this.props);
    for (const s of [...this.pupils, ...this.eyeS, this.handL, this.handR, this.cuffL, this.cuffR, this.held, ...this.props]) s.anchor.set(0.5);
    for (const s of this.props) {
      s.visible = false;
      s.alpha = 0;
    }
    this.armL.zIndex = this.armR.zIndex = 0;
    this.cuffL.zIndex = this.cuffR.zIndex = 1;
    this.held.zIndex = 2;
    this.handL.zIndex = this.handR.zIndex = 4;
  }

  set reducedMotion(v: boolean) {
    this.brain.reduced = v;
  }

  get reducedMotion(): boolean {
    return this.brain.reduced;
  }

  /** Сценки персонажа (MotionStyle.scenes). */
  get scenes(): readonly SceneDef[] {
    return this.style.scenes ?? [];
  }

  get blinks(): number {
    return this.brain.blinks;
  }

  /** fanBack — рубашка карт веера; held — предмет в руке (по умолчанию та же рубашка). */
  setTextures(bank: PuppetBank, fanBack: Texture | null = null, held: Texture | null = fanBack): void {
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
    for (const [s, p] of [[this.hair, h.back], [this.face, h.face], [this.blush, h.blush], [this.details, h.details]] as const) {
      s.texture = tex(p);
      placeSprite(s, p.box);
    }
    this.glasses.visible = !!h.glasses;
    if (h.glasses) {
      this.glasses.texture = tex(h.glasses);
      placeSprite(this.glasses, h.glasses.box);
    }
    // Чёлка — вокруг своей точки на макушке.
    this.bangs.texture = tex(h.bangs);
    placeSprite(this.bangs, { ...h.bangs.box, x: h.bangs.box.x - h.bangsPivot.x, y: h.bangs.box.y - h.bangsPivot.y });
    this.bangsC.position.set(h.bangsPivot.x, h.bangsPivot.y);
    this.speech = new SpeechMouth(art.speech);
    this.fringeDrawn = NaN;
    // Пучок и серьги вращаются вокруг своих точек.
    const pivoted = (c: Container, s: Sprite, p: PivotPart | undefined) => {
      c.visible = !!p;
      if (!p) return;
      s.texture = tex(p);
      placeSprite(s, { ...p.box, x: p.box.x - p.pivot.x, y: p.box.y - p.pivot.y });
      c.position.set(p.pivot.x, p.pivot.y);
    };
    pivoted(this.bunC, this.bun, h.bun);
    this.earC.forEach((c, i) => pivoted(c, this.ears[i]!, h.earrings?.[i]));
    art.eyesAt.forEach((e, i) => this.eyeS[i]!.position.set(e.x, e.y));
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
    // Правая кисть — зеркальная левой: большой палец у обеих с внутренней стороны.
    if (art.mirrorHandR) this.handR.scale.y = -Math.abs(this.handR.scale.y);
    for (const s of [this.cuffL, this.cuffR]) {
      s.texture = tex(art.cuff);
      s.width = art.cuff.box.w;
      s.height = art.cuff.box.h;
    }
    this.fanBack = art.fanOffset ? fanBack : null;
    this.heldTex = held;
    if (held) {
      this.held.texture = held;
      this.held.width = art.heldCard.w ?? CARD_W * 0.82;
      this.held.height = art.heldCard.h ?? CARD_H * 0.82;
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
  throwCard(target: { x: number; y: number }, onPick?: () => void): Promise<Release> {
    return new Promise((resolve) => {
      if (!this.art) {
        const p = this.fanPoint();
        onPick?.();
        resolve({ x: p.x, y: p.y, rotation: 0, w: 0, h: 0 });
        return;
      }
      const t = this.front.toLocal(target);
      this.pendingRelease.push(resolve);
      this.brain.play(this.style.throwCard(t), (name) => {
        if (name === 'pick') onPick?.();
        if (name === 'release') this.releaseNow = true;
      });
      // Без движения (или прерванный жест) событие приходит сразу — отдаём текущее положение руки.
      if (this.releaseNow && !this.inUpdate) this.flushRelease();
    });
  }

  /**
   * Сгрести карты со стола (точка сцены) в свой веер. Промис разрешается, когда кисть коснулась карт:
   * сцена запускает их полёт в веер — карты уходят вместе с рукой.
   */
  takeCards(target: { x: number; y: number }): Promise<void> {
    return new Promise((resolve) => {
      if (!this.art) {
        resolve();
        return;
      }
      this.brain.play(this.style.takeCards(this.front.toLocal(target)), (name) => {
        if (name === 'grab') resolve();
      });
    });
  }

  /**
   * Жест персонажа по имени (MotionStyle.gestures): target — точка сцены. Промис разрешается на событии marker
   * (например, release — предмет лёг на место) или по окончании жеста; без движения и без такого жеста — сразу.
   */
  gesture(id: string, target?: { x: number; y: number }, marker?: string): Promise<void> {
    return new Promise((resolve) => {
      const make = this.style.gestures?.[id];
      if (!make || !this.art) {
        resolve();
        return;
      }
      const def = make(target ? this.front.toLocal(target) : undefined);
      const wait = marker ?? 'end';
      const markers = marker ? def.markers : [...(def.markers ?? []), { at: def.duration, name: 'end' }];
      this.brain.play({ ...def, markers }, (name) => {
        if (name !== wait) return;
        // Предмет из руки занимает место в сцене после этого кадра — он остаётся в руке ещё на кадр.
        if (name === 'release') this.heldGrace = true;
        resolve();
      });
    });
  }

  /**
   * Сценка (MotionStyle.scenes): жест с событиями. onMarker получает только события, до которых сценка дошла сама, —
   * прерванная (реакцией на ход, итогом партии) не «договаривает» реплику. Промис — конец или прерывание.
   */
  playScene(def: GestureDef, onMarker: (name: string) => void): Promise<void> {
    return new Promise((resolve) => {
      if (!this.art || this.brain.reduced) {
        resolve();
        return;
      }
      const markers = [...(def.markers ?? []), { at: def.duration, name: 'end' }];
      this.brain.play({ ...def, markers }, (name) => {
        if (name === 'end') resolve();
        else if (this.brain.gestureId === def.id) onMarker(name);
      });
    });
  }

  /** Дождаться конца текущего жеста (мелкие действия не ждут): реакция начнётся, когда рука вернулась. */
  whenFree(): Promise<void> {
    if (!this.brain.busy || !this.art) return Promise.resolve();
    return new Promise((resolve) => this.freeWaiters.push(resolve));
  }

  /** Какая рука тянется над предметами на столе (жест), или null. */
  get armsFront(): 'l' | 'r' | null {
    return this.brain.armsFront;
  }

  /** Какая рука сейчас рисуется в overLayer. */
  get armOver(): 'l' | 'r' | null {
    return this.over;
  }

  private armParts(side: 'l' | 'r'): Container[] {
    return side === 'l' ? [this.armL, this.cuffL, this.handL] : [this.armR, this.cuffR, this.handR];
  }

  /**
   * Перенести руку (рукав, манжету, кисть и предмет в ней) в overLayer — над тем, что лежит на столе, — или вернуть.
   * Когда переключать, решает сцена: только когда кисть не перекрывает предметы на столе.
   */
  setArmOver(side: 'l' | 'r' | null): void {
    if (side === this.over) return;
    if (this.over) for (const p of this.armParts(this.over)) this.overLayer.detach(p);
    this.over = side;
    if (side) this.overLayer.attach(...this.armParts(side));
    this.syncHeldOver();
  }

  private syncHeldOver(): void {
    const want = !!this.over && this.brain.holdHand === this.over;
    const has = this.held.parentRenderLayer === this.overLayer;
    if (want && !has) this.overLayer.attach(this.held);
    else if (!want && has) this.overLayer.detach(this.held);
  }

  /** Глобальные рамки кисти, манжеты и предмета в этой руке — сцена проверяет, не перекрывают ли они кости. */
  handBounds(side: 'l' | 'r'): { x: number; y: number; width: number; height: number }[] {
    const parts: Sprite[] = side === 'l' ? [this.handL, this.cuffL] : [this.handR, this.cuffR];
    if (this.held.visible && this.brain.holdHand === side) parts.push(this.held);
    return parts.map((s) => s.getBounds());
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
    if (this.freeWaiters.length && !this.brain.busy) {
      const w = this.freeWaiters;
      this.freeWaiters = [];
      for (const f of w) f();
    }
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
    const rest = b.rest;
    // Корпус.
    this.torsoC.position.set(art.hip.x + v.torsoX, art.hip.y + v.torsoY);
    this.torsoC.rotation = v.torsoRot * DEG;
    this.torsoC.scale.y = 1 + b.breath;
    // Голова на шее.
    const neck = this.torsoPoint(art.neck);
    this.head.position.set(neck.x + v.headX, neck.y + v.headY);
    this.head.rotation = (v.torsoRot + v.headRot) * DEG;
    this.bunC.rotation = b.bun * DEG;
    // Передняя деталь: инерция (чёлка) и жесты (кепку приподнять, сдвинуть набок).
    this.bangsC.rotation = (b.bangsRot + v.hatRot) * DEG;
    this.bangsC.x = art.head.bangsPivot.x + v.hatX;
    this.bangsC.y = art.head.bangsPivot.y + b.bangsY + v.hatY;
    this.drawFringe(b.fringe);
    this.earC[0].rotation = clamp(b.earL, -40, 40) * DEG;
    this.earC[1].rotation = clamp(b.earR, -40, 40) * DEG;
    this.blush.alpha = clamp(v.blush, 0, 1);
    // Очки сняты — их держит рука (реквизит), на лице их нет.
    if (art.head.glasses) this.glasses.visible = v.glassesOff < 0.5;
    // Рот: при речи — по уровню голоса (форма держится, между слогами губы смыкаются), иначе — форма эмоции.
    const face = this.style.faces[b.currentEmotion];
    const m = this.speech?.step(this.speechLevel, dtMs, face.speechMax) ?? b.mouthOverride ?? art.emotionMouth(b.currentEmotion);
    const mt = bank.mouths.get(m);
    if (mt && this.mouth.texture !== mt) this.mouth.texture = mt;
    placeSprite(this.mouth, art.head.mouthBox);
    // Глаза: форма раскрывается вокруг центра каждого глаза; зрачки — по взгляду и смещению эмоции.
    const eyePart = art.head.eyes[b.eyes];
    const eyeTex = bank.parts.get(eyePart.key)!;
    for (const s of this.eyeS) {
      if (s.texture !== eyeTex) s.texture = eyeTex;
      s.width = eyePart.box.w * b.eyeScaleX;
      s.height = eyePart.box.h * b.eyeScaleY;
    }
    const dt = dtMs / 1000;
    const lx = dt > 0 ? this.lookX.step(face.look[0], dt) : this.lookX.y;
    const ly = dt > 0 ? this.lookY.step(face.look[1], dt) : this.lookY.y;
    const hasPupils = b.eyes === 'ball' || b.eyes === 'wide' || b.eyes === 'star';
    const starTex = bank.parts.get(art.head.pupilStar.key)!;
    const pupilTex = bank.parts.get(art.head.pupil.key)!;
    art.eyesAt.forEach((e, i) => {
      const s = this.pupils[i]!;
      // Зрачок остаётся внутри белка: смещение ограничено эллипсом.
      let ox = lx + v.gazeX * art.pupilRange.x;
      let oy = ly + v.gazeY * art.pupilRange.y;
      const pc = art.pupilClamp ?? { x: 6.5, y: 8 };
      const k = Math.hypot(ox / pc.x, oy / pc.y);
      if (k > 1) {
        ox /= k;
        oy /= k;
      }
      s.position.set(e.x + ox * b.eyeScaleX, e.y + oy * b.eyeScaleY);
      s.texture = b.eyes === 'star' ? starTex : pupilTex;
      s.width = art.head.pupil.box.w * v.pupil * b.eyeScaleY;
      s.height = art.head.pupil.box.h * v.pupil * b.eyeScaleY;
      s.visible = hasPupils;
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
    // Кулак — своя кисть, если она есть в рисунке.
    const handTex = bank.parts.get(art.hand.key)!;
    const fistTex = art.handFist ? bank.parts.get(art.handFist.key)! : handTex;
    this.handL.texture = v.lFist > 0.5 ? fistTex : handTex;
    this.handR.texture = v.rFist > 0.5 ? fistTex : handTex;
    // Веер — в левой кисти, поворачивается вместе с ней.
    const lr = (v.lHandRot - rest.lHandRot) * DEG;
    const fo = art.fanOffset;
    if (fo) {
      this.fan.position.set(this.handL.x + fo.x * Math.cos(lr) - fo.y * Math.sin(lr), this.handL.y + fo.x * Math.sin(lr) + fo.y * Math.cos(lr));
      this.fan.rotation = lr + v.fanRot * DEG;
      this.fan.alpha = clamp(v.fanAlpha, 0, 1);
    }
    this.fan.visible = !!fo && this.fan.alpha > 0.01;
    // Предмет в кисти (карта, кость): правой по умолчанию; у левой — зеркально по x.
    const left = b.holdHand === 'l';
    const hk = left ? this.handL : this.handR;
    const hr = left ? (v.lHandRot - rest.lHandRot) * DEG : (v.rHandRot - rest.rHandRot) * DEG;
    const hc = art.heldCard;
    const hx = left ? -hc.x : hc.x;
    this.held.visible = (b.holdCard || this.heldGrace) && !!this.heldTex;
    this.held.position.set(hk.x + hx * Math.cos(hr) - hc.y * Math.sin(hr), hk.y + hx * Math.sin(hr) + hc.y * Math.cos(hr));
    this.held.rotation = hr + (left ? -hc.rot : hc.rot) * DEG;
    // Предмет — в слое той руки, что держит: над рукавом, под пальцами.
    const slot = left ? this.handL : this.handR;
    if (this.front.getChildIndex(this.held) !== this.front.getChildIndex(slot) - 2) {
      this.front.removeChild(this.held, this.releaseLayer);
      const at = this.front.getChildIndex(slot);
      this.front.addChildAt(this.releaseLayer, at);
      this.front.addChildAt(this.held, at);
    }
    this.layoutProps(dtMs);
    this.syncHeldOver();
    this.drawJoints();
  }

  /** Реквизит сценок: в кисти со своим хватом (у левой — зеркально), под пальцами или поверх; появляется за 120 мс. */
  private layoutProps(dtMs: number): void {
    const art = this.art!;
    const bank = this.bank!;
    const b = this.brain;
    const v = b.values;
    const rest = b.rest;
    const want = [b.propL, b.propR] as const;
    for (const i of [0, 1] as const) {
      const s = this.props[i];
      const left = i === 0;
      const name = want[i];
      // Новый предмет сменяет прежний сразу; исчезающий — гаснет на месте.
      if (name && name !== this.propShown[i]) {
        const spec = art.props?.[name];
        if (!spec) continue;
        this.propShown[i] = name;
        s.texture = bank.parts.get(spec.key)!;
        s.width = spec.box.w;
        s.height = spec.box.h;
        if (left) s.scale.x = -Math.abs(s.scale.x);
      }
      const target = name ? 1 : 0;
      s.alpha = b.reduced ? target : clamp(s.alpha + Math.sign(target - s.alpha) * (dtMs / 120), 0, 1);
      s.visible = s.alpha > 0.01 && !!this.propShown[i];
      if (!s.visible) {
        if (!name) this.propShown[i] = null;
        continue;
      }
      const spec = art.props?.[this.propShown[i]!];
      if (!spec) continue;
      const hand = left ? this.handL : this.handR;
      const hr = left ? (v.lHandRot - rest.lHandRot) * DEG : (v.rHandRot - rest.rHandRot) * DEG;
      const gx = left ? -spec.grip.x : spec.grip.x;
      s.position.set(hand.x + gx * Math.cos(hr) - spec.grip.y * Math.sin(hr), hand.y + gx * Math.sin(hr) + spec.grip.y * Math.cos(hr));
      // Свой поворот предмета в пальцах (спиннер, фигурка) — поверх поворота кисти.
      const spin = left ? -v.propRotL : v.propRotR;
      s.rotation = hr + ((left ? -spec.rot : spec.rot) + spin) * DEG;
      // Под пальцами своей кисти — между манжетой и кистью (там же карта в руке); above — поверх кисти.
      s.zIndex = spec.above ? 5 : 3;
      const hi = this.front.getChildIndex(hand);
      const ci = this.front.getChildIndex(left ? this.cuffL : this.cuffR);
      const si = this.front.getChildIndex(s);
      const ok = spec.above ? si > hi : si > ci && si < hi;
      if (!ok) {
        this.front.removeChild(s);
        const h2 = this.front.getChildIndex(hand);
        this.front.addChildAt(s, spec.above ? h2 + 1 : h2);
      }
    }
  }

  /** Бахрома шали: пряди поворачиваются вокруг начала, сильнее к острию шали; контур нижних краёв — поверх прядей. */
  private drawFringe(angle: number): void {
    if (Math.abs(angle - this.fringeDrawn) < 0.05) return;
    this.fringeDrawn = angle;
    const f = this.art!.fringe;
    const g = this.fringe;
    if (!f) {
      g.clear();
      return;
    }
    g.clear();
    const half = f.strands.length / 2;
    f.strands.forEach((p, i) => {
      // Пряди у острия (середина каждого края по порядку — ближе к концу) длиннее качаются; правый край зеркален.
      const k = 0.55 + 0.9 * ((i % half) / half);
      const a = angle * k * DEG;
      const dx = p.dx * Math.cos(a) - p.dy * Math.sin(a), dy = p.dx * Math.sin(a) + p.dy * Math.cos(a);
      g.moveTo(p.x, p.y).lineTo(p.x + dx, p.y + dy);
    });
    g.stroke({ width: f.width, color: f.color, cap: 'round' });
    const [start, ...curves] = f.edge;
    g.moveTo(start![0]!, start![1]!);
    for (const c of curves) g.bezierCurveTo(c[0]!, c[1]!, c[2]!, c[3]!, c[4]!, c[5]!);
    g.stroke({ width: f.outlineWidth, color: f.outline, cap: 'round', join: 'round' });
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
    const closed = b.eyes === 'wide' ? (L.closed?.wide ?? 18) : (L.closed?.ball ?? 14);
    const hidden = L.hiddenAt ?? -16.5;
    const params: [number, number][] = [[b.lid(v.lidLI, closed), b.lid(v.lidLO, closed)], [b.lid(v.lidRI, closed), b.lid(v.lidRO, closed)]];
    art.eyesAt.forEach((e, i) => {
      const [iy, oy] = params[i]!;
      if (iy <= hidden && oy <= hidden) return;
      const side = i === 0 ? -1 : 1;
      const inner = e.x - side * L.halfW, outer = e.x + side * L.halfW;
      const top = e.y - L.top;
      const mid = e.y + Math.min(iy, oy) - (L.bulge ?? 2);
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
      const inner = e.x - side * B.halfW, outer = e.x + side * (B.halfOut ?? B.halfW);
      const curve = () => g.moveTo(outer, cy + oy).quadraticCurveTo(e.x, cy + my, inner, cy + iy);
      // Брови-щётки: толстый контур снизу, поверх — сама бровь и волоски.
      if (B.under) curve().stroke({ width: B.under, color: B.outline, cap: 'round' });
      curve().stroke({ width: B.width, color: B.color, cap: 'round' });
      if (B.tufts) {
        const T = B.tufts;
        for (let k = 0; k <= T.count; k++) {
          const t = k / T.count;
          const x = outer + (inner - outer) * t;
          const y = (1 - t) * (1 - t) * (cy + oy) + 2 * t * (1 - t) * (cy + my) + t * t * (cy + iy);
          g.moveTo(x, y - 3).lineTo(x - side * T.dx, y - 3 + T.dy);
        }
        g.stroke({ width: T.width, color: T.color, cap: 'round' });
      }
      if (B.line > 0) curve().stroke({ width: B.line, color: B.outline, alpha: B.lineAlpha, cap: 'round' });
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
    for (const p of [art.head.bun, ...(art.head.earrings ?? [])]) if (p) dot(hg(p.pivot), 0x8e2236);
  }
}
