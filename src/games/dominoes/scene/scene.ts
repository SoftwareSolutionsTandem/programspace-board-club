// Сцена домино: кафе, общий стол, Дед Матвей напротив, его кости рубашкой к игроку, базар, цепочка-«змейка», рука.
// Рисует PlayerView и анимирует переходы по событиям. Правила здесь не проверяются: сцена показывает и сообщает о касаниях.
import { Container, Graphics, Sprite, Text, type FederatedPointerEvent } from 'pixi.js';
import { MATVEY_MOTION } from '../../../characters/matvey/motions';
import { dominoHandSlots, endAt, fitChain, opponentBoneSlots, type ChainPlan, type DominoLayout } from '../../../layout/dominoes';
import { BG_DESIGN, FIGURE } from '../../../layout/layout';
import { drawCafeTable } from '../../../render/table';
import { easeOutBack, Tweener } from '../../../render/tween';
import { PuppetRig } from '../../../puppet/rig';
import { sortBones } from '../interaction';
import { boneCode, type Bone } from '../rules/bones';
import type { DominoEvent } from '../rules/engine';
import type { End } from '../rules/state';
import type { PlayerView } from '../view';
import { BoneSprite } from './boneSprite';
import type { DominoTextureBank } from './textures';
import { AmbientLayer } from '../../../render/ambient';

export interface DominoSceneInput {
  onBoneTap(code: string): void;
  onEndTap(end: End): void;
  /** Кость отпущена: у конца цепочки (end) или просто над столом (null). */
  onDrop(code: string, end: End | null): void;
  onBazaarTap(): void;
}

export interface DominoHighlights {
  readonly playable: ReadonlySet<string>;
  /** Кость, для которой выбирается конец, и доступные концы. */
  readonly picking: { readonly code: string; readonly ends: readonly End[] } | null;
  /** Кость под клавиатурным курсором. */
  readonly cursor: string | null;
  /** Базар можно нажать (нужно брать). */
  readonly bazaar: boolean;
}

/** Стоящая кость: старшая половина сверху. */
const UPRIGHT = Math.PI / 2;
const NO_HIGHLIGHTS: DominoHighlights = { playable: new Set(), picking: null, cursor: null, bazaar: false };

/** Цель поворота, ближайшая к текущему углу (кость не крутится лишний оборот). */
const nearAngle = (from: number, to: number) => {
  let t = to;
  while (t - from > Math.PI) t -= Math.PI * 2;
  while (from - t > Math.PI) t += Math.PI * 2;
  return t;
};

export class DominoScene {
  readonly root = new Container();
  readonly rig = new PuppetRig(MATVEY_MOTION, 23);

  private readonly bg = new Sprite();
  /** Живые предметы комнаты персонажа — над фоном, под персонажем и столом. */
  readonly ambient = new AmbientLayer();
  private readonly table = new Graphics();
  private readonly oppLayer = new Container();
  private readonly bazaarLayer = new Container();
  private readonly chainLayer = new Container();
  private readonly markerLayer = new Container();
  private readonly handLayer = new Container();
  private readonly flyLayer = new Container();
  private readonly bazaarBadge = new Container();
  private readonly bazaarBadgeBg = new Graphics();
  private readonly bazaarCount = new Text({ text: '', style: { fontFamily: 'Nunito, Trebuchet MS, sans-serif', fontSize: 16, fontWeight: '800', fill: 0xfff8ee } });
  private bank: DominoTextureBank | null = null;
  private layout: DominoLayout | null = null;
  private view: PlayerView | null = null;
  /** Индекс первой выложенной кости в цепочке: она остаётся в центре поля. */
  private origin = 0;
  private plan: ChainPlan | null = null;
  /** Кости с известным лицом: рука игрока, цепочка, открытые кости Матвея. */
  private readonly sprites = new Map<string, BoneSprite>();
  private oppBacks: BoneSprite[] = [];
  private highlights: DominoHighlights = NO_HIGHLIGHTS;
  private drag: { code: string; sprite: BoneSprite; startX: number; startY: number; moved: boolean; offX: number; offY: number } | null = null;
  private pulse = 0;
  inputEnabled = false;

  constructor(private readonly tweens: Tweener, private readonly input: DominoSceneInput) {
    // Глубина: кости Матвея стоят на ребре перед его руками — в покое кисти за ними. Рука, которая тянется через его кости
    // к цепочке или к базару, рисуется в rig.overLayer — над всем, что на столе (syncArmsLayer). Рука игрока и летящие кости — сверху.
    this.root.addChild(this.bg, this.ambient.root, this.rig.back, this.table, this.rig.front, this.oppLayer, this.bazaarLayer, this.bazaarBadge, this.chainLayer, this.markerLayer, this.rig.overLayer, this.handLayer, this.flyLayer);
    this.bazaarBadge.addChild(this.bazaarBadgeBg, this.bazaarCount);
    this.bazaarLayer.eventMode = 'static';
    this.bazaarLayer.cursor = 'pointer';
    this.bazaarLayer.on('pointertap', () => {
      if (this.inputEnabled && this.highlights.bazaar) this.input.onBazaarTap();
    });
    this.root.eventMode = 'static';
    this.root.on('globalpointermove', (e: FederatedPointerEvent) => this.onDragMove(e));
    this.root.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
    this.root.on('pointerupoutside', (e: FederatedPointerEvent) => this.onDragEnd(e));
  }

  /** Убрать кость со сцены: сначала её анимации, затем сам спрайт. */
  private kill(sp: BoneSprite): void {
    this.tweens.cancel(sp);
    this.tweens.cancel(sp.scale);
    sp.destroy();
  }

  setTextures(bank: DominoTextureBank): void {
    this.bank = bank;
    this.bg.texture = bank.background;
    this.ambient.setRoom(bank.room, bank.ambient);
    this.rig.setTextures(bank.character, null, bank.back);
    for (const s of this.sprites.values()) this.kill(s);
    this.sprites.clear();
    for (const s of this.oppBacks) this.kill(s);
    this.oppBacks = [];
    if (this.view && this.layout) void this.place(this.view, true);
  }

  setLayout(spec: DominoLayout): void {
    this.layout = spec;
    this.tweens.finishAll();
    const bgs = spec.background.scale;
    this.bg.position.set(spec.background.x, spec.background.y);
    this.bg.width = BG_DESIGN.width * bgs;
    this.bg.height = BG_DESIGN.height * bgs;
    this.ambient.setTransform(spec.background);
    const c = spec.character;
    const anchorY = c.crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
    this.rig.setTransform(c.x - FIGURE.centerX * c.scale, c.y - anchorY * c.scale, c.scale);
    drawCafeTable(this.table, spec);
    if (this.view) void this.place(this.view, true);
  }

  // ---------- спрайты ----------

  private makeSprite(code: string | null): BoneSprite {
    const bank = this.bank!;
    const s = new BoneSprite(code, code ? (bank.bones.get(code) ?? null) : null, bank.back);
    if (code) this.bindInput(s);
    return s;
  }

  private ensure(code: string, x: number, y: number, rot = UPRIGHT, flip = 1): BoneSprite {
    let sp = this.sprites.get(code);
    if (!sp) {
      sp = this.makeSprite(code);
      sp.position.set(x, y);
      sp.rotation = rot;
      sp.flip = flip;
      this.sprites.set(code, sp);
    }
    return sp;
  }

  private bindInput(s: BoneSprite): void {
    s.eventMode = 'static';
    s.cursor = 'pointer';
    s.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!this.inputEnabled || !s.code || !this.inHand(s.code)) return;
      const local = this.root.toLocal(e.global);
      this.drag = { code: s.code, sprite: s, startX: local.x, startY: local.y, moved: false, offX: s.x - local.x, offY: s.y - local.y };
    });
  }

  private inHand(code: string): boolean {
    return !!this.view?.hand.some((b) => boneCode(b) === code);
  }

  private onDragMove(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d) return;
    const p = this.root.toLocal(e.global);
    if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) > 10) {
      d.moved = true;
      this.tweens.cancel(d.sprite);
      this.flyLayer.addChild(d.sprite);
    }
    if (d.moved) d.sprite.position.set(p.x + d.offX, p.y + d.offY);
  }

  private onDragEnd(e: FederatedPointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (!d.moved) {
      this.input.onBoneTap(d.code);
      return;
    }
    const p = this.root.toLocal(e.global);
    this.handLayer.addChild(d.sprite);
    const s = this.layout;
    const overTable = !!s && p.y > s.domino.chain.area.y - 10 && p.y < s.domino.chain.area.y + s.domino.chain.area.h + 10;
    const end = this.plan ? endAt(this.plan, p) : null;
    if (end || overTable) this.input.onDrop(d.code, end);
    // Если ход не состоялся, кость вернётся на место.
    if (this.view) void this.place(this.view, false);
  }

  // ---------- раскладка ----------

  /** Целевые позиции всех костей по проекции; instant — сразу на места. */
  private place(view: PlayerView, instant: boolean): Promise<void> {
    const s = this.layout;
    if (!s || !this.bank) return Promise.resolve();
    const ms = instant ? 0 : 300;
    const jobs: Promise<void>[] = [];
    const seen = new Set<string>();
    // Цепочка.
    const plan = fitChain(view.chain.map((p) => ({ hi: p.bone.hi, lo: p.bone.lo, left: p.left, right: p.right })), Math.min(this.origin, Math.max(0, view.chain.length - 1)), s);
    this.plan = plan;
    view.chain.forEach((p, i) => {
      const code = boneCode(p.bone);
      seen.add(code);
      const pose = plan.poses[i]!;
      const sp = this.ensure(code, pose.x, pose.y, pose.rot);
      if (sp.parent !== this.chainLayer) this.chainLayer.addChild(sp);
      sp.setGlow('none');
      jobs.push(this.tweens.to(sp, { x: pose.x, y: pose.y, rotation: nearAngle(sp.rotation, pose.rot), flip: 1, lift: 0 }, ms));
      jobs.push(this.tweens.to(sp, { half: plan.half }, ms));
    });
    // Рука игрока: по старшей половине, стоймя.
    const hand = sortBones(view.hand);
    const slots = dominoHandSlots(s, hand.length);
    hand.forEach((b, i) => {
      const code = boneCode(b);
      seen.add(code);
      const slot = slots[i]!;
      const sp = this.ensure(code, s.domino.bazaar.x, s.domino.bazaar.y, 0, 0);
      if (sp.parent !== this.handLayer) this.handLayer.addChild(sp);
      const picking = this.highlights.picking?.code === code || this.highlights.cursor === code;
      const playable = this.highlights.playable.has(code);
      sp.setGlow(picking ? 'selected' : playable ? 'playable' : 'none');
      sp.alpha = this.highlights.playable.size > 0 && !playable && !picking ? 0.82 : 1;
      jobs.push(this.tweens.to(sp, { x: slot.x, y: slot.y, rotation: nearAngle(sp.rotation, UPRIGHT), flip: 1, lift: picking ? 0.14 : playable ? 0.06 : 0 }, ms));
      jobs.push(this.tweens.to(sp, { half: slot.half }, ms));
    });
    // Кости Матвея: рубашкой к игроку; после раздачи — лицом.
    const revealed = view.opponentRevealed;
    const oppSlots = opponentBoneSlots(s, revealed ? revealed.length : view.opponentHandCount);
    if (revealed) {
      for (const b of this.oppBacks) this.kill(b);
      this.oppBacks = [];
      revealed.forEach((b, i) => {
        const code = boneCode(b);
        seen.add(code);
        const slot = oppSlots[i]!;
        const sp = this.ensure(code, slot.x, slot.y, UPRIGHT, 0);
        if (sp.parent !== this.oppLayer) this.oppLayer.addChild(sp);
        sp.setGlow('none');
        jobs.push(this.tweens.to(sp, { x: slot.x, y: slot.y, rotation: nearAngle(sp.rotation, UPRIGHT), flip: 1, lift: 0 }, instant ? 0 : 420, { delay: instant ? 0 : i * 60 }));
        jobs.push(this.tweens.to(sp, { half: slot.half }, ms));
      });
    } else {
      while (this.oppBacks.length > oppSlots.length) this.kill(this.oppBacks.pop()!);
      while (this.oppBacks.length < oppSlots.length) {
        const b = this.makeSprite(null);
        const last = oppSlots[this.oppBacks.length]!;
        b.position.set(last.x, last.y);
        b.rotation = UPRIGHT;
        this.oppBacks.push(b);
        this.oppLayer.addChild(b);
      }
      this.oppBacks.forEach((b, i) => {
        const slot = oppSlots[i]!;
        b.flip = 0;
        jobs.push(this.tweens.to(b, { x: slot.x, y: slot.y }, ms));
        jobs.push(this.tweens.to(b, { half: slot.half }, ms));
      });
    }
    for (const [code, sp] of [...this.sprites]) {
      if (seen.has(code) || sp.parent === this.flyLayer) continue;
      this.kill(sp);
      this.sprites.delete(code);
    }
    this.drawBazaar(view, s);
    this.drawMarkers();
    return Promise.all(jobs).then(() => undefined);
  }

  private drawBazaar(view: PlayerView, s: DominoLayout): void {
    const bank = this.bank!;
    this.bazaarLayer.removeChildren().forEach((c) => c.destroy());
    const { x, y, half } = s.domino.bazaar;
    const n = view.bazaarCount;
    // Стопка: две колонки по три ряда рубашек, сверху — сколько осталось.
    const shown = Math.min(6, Math.ceil(n / 2));
    for (let i = 0; i < shown; i++) {
      const b = new BoneSprite(null, null, bank.back);
      b.setHalf(half);
      b.flip = 0;
      const col = i % 2, row = Math.floor(i / 2);
      b.position.set(x + (col - 0.5) * half * 0.5 + (row % 2) * 2, y + (row - 1) * half * 1.15);
      b.rotation = UPRIGHT + (col ? 0.06 : -0.05);
      b.sync();
      this.bazaarLayer.addChild(b);
    }
    if (this.highlights.bazaar && shown > 0) {
      const g = new Graphics();
      g.roundRect(x - half * 1.4, y - half * 2.6, half * 2.8, half * 5.2, half * 0.5).stroke({ color: 0xf4c542, width: 3, alpha: 0.9 });
      this.bazaarLayer.addChildAt(g, 0);
    }
    this.bazaarCount.text = n > 0 ? String(n) : '';
    this.bazaarCount.style.fontSize = Math.round(Math.max(13, Math.min(20, half * 0.9)));
    this.bazaarCount.anchor.set(0.5);
    const bw = Math.max(this.bazaarCount.width + 14, this.bazaarCount.height + 4);
    const bh = this.bazaarCount.height + 2;
    this.bazaarBadgeBg.clear();
    if (n > 0) this.bazaarBadgeBg.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2).fill({ color: 0x1c2b28, alpha: 0.82 }).stroke({ color: 0xfff8ee, width: 1.5, alpha: 0.8 });
    // Число — сразу под нижним рядом стопки.
    const rows = Math.max(1, Math.ceil(shown / 2));
    this.bazaarBadge.position.set(x, y + (rows - 2) * half * 1.15 + half * 1.7 + bh / 2);
  }

  /** Метки концов цепочки, когда кость подходит к обоим: контур будущей кости, по касанию — ход. */
  private drawMarkers(): void {
    this.markerLayer.removeChildren().forEach((c) => c.destroy());
    const pick = this.highlights.picking;
    const plan = this.plan;
    if (!pick || !plan?.ends) return;
    for (const end of pick.ends) {
      const pose = plan.ends[end];
      const g = new Graphics();
      const w = plan.half * 2, h = plan.half;
      g.roundRect(-w / 2, -h / 2, w, h, h * 0.3).fill({ color: 0xf4c542, alpha: 0.22 }).stroke({ color: 0xf4c542, width: 3 });
      // Область касания крупнее метки: не меньше 44 px.
      g.hitArea = { contains: (px: number, py: number) => Math.abs(px) <= Math.max(w, 44) / 2 + 6 && Math.abs(py) <= Math.max(h, 44) / 2 + 6 };
      g.position.set(pose.x, pose.y);
      g.rotation = pose.rot;
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.label = `end-${end}`;
      g.on('pointertap', () => {
        if (this.inputEnabled) this.input.onEndTap(end);
      });
      this.markerLayer.addChild(g);
    }
  }

  // ---------- подсветка ----------

  setHighlights(h: DominoHighlights): void {
    this.highlights = h;
    if (this.view && !this.drag) void this.place(this.view, false);
  }

  // ---------- переходы ----------

  /** Мгновенно показать проекцию (начало раздачи, ресайз). */
  reset(view: PlayerView): void {
    this.tweens.finishAll();
    for (const s of this.sprites.values()) this.kill(s);
    this.sprites.clear();
    for (const s of this.oppBacks) this.kill(s);
    this.oppBacks = [];
    this.flyLayer.removeChildren().forEach((c) => c.destroy());
    this.origin = 0;
    this.view = view;
    void this.place(view, true);
  }

  /** Анимировать переход к новой проекции по событиям действия. */
  async show(view: PlayerView, events: readonly DominoEvent[]): Promise<void> {
    const s = this.layout;
    const prev = this.view;
    if (!s || !this.bank || !prev) {
      this.view = view;
      return;
    }
    const prevHand = new Set(prev.hand.map(boneCode));
    const prevChain = new Set(prev.chain.map((p) => boneCode(p.bone)));
    const jobs: Promise<void>[] = [];
    // Первая кость стоит в центре; каждая кость слева сдвигает начало цепочки в массиве.
    if (prev.chain.length === 0) this.origin = 0;
    else for (const e of events) if (e.type === 'played' && e.end === 'left') this.origin++;
    // Кость Матвея: он берёт её из своего ряда, тянется к цепочке и кладёт — настоящая кость сцены вылетает из его руки
    // рубашкой вверх в момент, когда кисть её отпускает (PuppetRig.throwCard), и переворачивается на столе.
    const released: BoneSprite[] = [];
    const newOpp = view.chain.findIndex((p) => {
      const code = boneCode(p.bone);
      return !prevChain.has(code) && !prevHand.has(code) && !this.sprites.has(code);
    });
    if (newOpp >= 0) {
      const code = boneCode(view.chain[newOpp]!.bone);
      const plan = fitChain(view.chain.map((p) => ({ hi: p.bone.hi, lo: p.bone.lo, left: p.left, right: p.right })), Math.min(this.origin, Math.max(0, view.chain.length - 1)), s);
      const pose = plan.poses[newOpp]!;
      const rel = await this.rig.throwCard(this.root.toGlobal(pose), () => {
        const back = this.oppBacks.pop();
        if (back) this.kill(back);
      });
      if (!this.layout || this.view !== prev) return;
      const m = this.root.worldTransform;
      const k = Math.hypot(m.a, m.b);
      const from = this.root.toLocal({ x: rel.x, y: rel.y });
      const sp = this.makeSprite(code);
      sp.position.set(from.x, from.y);
      sp.rotation = rel.rotation;
      sp.setHalf(rel.w > 0 ? rel.w / k / 2 : plan.half);
      sp.flip = 0;
      this.sprites.set(code, sp);
      this.chainLayer.addChild(sp);
      // На вылете кость рисуется там же, где была в руке (над рукавом, под пальцами), а легла — со всеми костями стола.
      sp.zIndex = 3;
      (this.rig.armOver ? this.rig.overLayer : this.rig.releaseLayer).attach(sp);
      released.push(sp);
    }
    // Добор Матвея: тянется к базару, берёт кость и ставит в свой ряд (ряд растёт, когда кость встала).
    for (const e of events) {
      if (e.type !== 'drew' || e.seat === view.seat) continue;
      await this.rig.gesture('draw', this.root.toGlobal({ x: s.domino.bazaar.x, y: s.domino.bazaar.y }), 'release');
      if (!this.layout || this.view !== prev) return;
    }
    // Стук: Матвей стучит костяшками по столу — ряд вздрагивает в момент удара.
    const oppKnock = events.some((e) => e.type === 'knocked' && e.seat !== view.seat);
    if (oppKnock) {
      await this.rig.gesture('knock', undefined, 'tap');
      if (!this.layout || this.view !== prev) return;
    }
    // Добор игрока: кость появляется рубашкой у базара и переворачивается в руке.
    for (const b of view.hand) {
      const code = boneCode(b);
      if (prevHand.has(code)) continue;
      const sp = this.makeSprite(code);
      sp.position.set(s.domino.bazaar.x, s.domino.bazaar.y);
      sp.rotation = UPRIGHT;
      sp.setHalf(s.domino.bazaar.half);
      sp.flip = 0;
      this.sprites.set(code, sp);
      this.handLayer.addChild(sp);
    }
    this.view = view;
    jobs.push(this.place(view, false));
    if (released.length) jobs.push(this.tweens.wait(300).then(() => released.forEach((sp) => sp.parentRenderLayer?.detach(sp))));
    // Удар костью о стол: короткий «прыжок» масштаба у новой кости Матвея.
    const played = events.find((e) => e.type === 'played');
    if (played && played.type === 'played' && played.seat !== view.seat) {
      const sp = this.sprites.get(boneCode(played.bone));
      if (sp) {
        sp.scale.set(1.15);
        jobs.push(this.tweens.to(sp.scale, { x: 1, y: 1 }, 240, { delay: 260, ease: easeOutBack }));
      }
    }
    // Стук: ряд костей вздрагивает.
    const knock = events.find((e) => e.type === 'knocked');
    if (knock && knock.type === 'knocked') {
      const targets = knock.seat === view.seat ? [...this.handLayer.children] : [...this.oppLayer.children];
      for (const c of targets) {
        const y = c.y;
        jobs.push(this.tweens.to(c, { y: y - 4 }, 70).then(() => this.tweens.to(c, { y }, 110)));
      }
    }
    await Promise.all(jobs);
  }

  /**
   * Рука, которая тянется через свои кости (PuppetRig.armsFront), — над костями стола (rig.overLayer), остальное — за ними.
   * Переключение — только когда кисть этой руки не перекрывает кости Матвея: иначе кость «прыгнула» бы с одной стороны
   * руки на другую. Вторая, лежащая рука не мешает: она остаётся за костями.
   */
  private syncArmsLayer(): void {
    const want = this.rig.armsFront;
    const cur = this.rig.armOver;
    if (want === cur) return;
    const clear = (side: 'l' | 'r') => {
      if (!this.oppLayer.children.length) return true;
      const row = this.oppLayer.getBounds();
      return !this.rig.handBounds(side).some((h) => h.x < row.x + row.width && h.x + h.width > row.x && h.y < row.y + row.height && h.y + h.height > row.y);
    };
    if (cur && !clear(cur)) return;
    if (want && !clear(want)) {
      if (cur) this.rig.setArmOver(null);
      return;
    }
    this.rig.setArmOver(want);
  }

  /** Отладка и e2e: руки Матвея над костями стола или за своими костями, и чего хочет текущий жест. */
  armsLayer(): { over: 'l' | 'r' | null; want: 'l' | 'r' | null } {
    return { over: this.rig.armOver, want: this.rig.armsFront };
  }

  /** Встряхнуть кость (не подходит). */
  shake(code: string): void {
    const sp = this.sprites.get(code);
    if (!sp) return;
    const x = sp.x;
    void this.tweens.to(sp, { x: x - 7 }, 60).then(() => this.tweens.to(sp, { x: x + 7 }, 90)).then(() => this.tweens.to(sp, { x }, 70));
  }

  update(dtMs: number): void {
    this.tweens.update(dtMs);
    this.rig.update(dtMs);
    this.ambient.update(dtMs);
    this.syncArmsLayer();
    for (const sp of this.sprites.values()) sp.sync();
    for (const c of [...this.oppLayer.children, ...this.flyLayer.children]) if (c instanceof BoneSprite) c.sync();
    // Метки концов мягко пульсируют.
    this.pulse += dtMs;
    this.markerLayer.alpha = 0.75 + Math.sin(this.pulse / 220) * 0.25;
  }

  /** Отладка и e2e: экранные точки костей руки, меток концов и базара. */
  debugPositions(): { hand: Record<string, { x: number; y: number }>; ends: Partial<Record<End, { x: number; y: number }>>; bazaar: { x: number; y: number } | null; chainHalf: number | null } {
    const hand: Record<string, { x: number; y: number }> = {};
    for (const b of this.view?.hand ?? []) {
      const sp = this.sprites.get(boneCode(b));
      if (sp) {
        const g = sp.toGlobal({ x: 0, y: 0 });
        hand[boneCode(b)] = { x: g.x, y: g.y };
      }
    }
    const ends: Partial<Record<End, { x: number; y: number }>> = {};
    for (const m of this.markerLayer.children) {
      const end = m.label === 'end-left' ? 'left' : m.label === 'end-right' ? 'right' : null;
      if (end) ends[end] = { x: m.x, y: m.y };
    }
    const bz = this.layout?.domino.bazaar;
    return { hand, ends, bazaar: bz ? { x: bz.x, y: bz.y } : null, chainHalf: this.plan?.half ?? null };
  }

  /** Кости, которые видны лицом (для проверки честности сцены в e2e). */
  visibleFaces(): string[] {
    return [...this.sprites.values()].filter((s) => s.flip >= 0.5 && s.code).map((s) => s.code!);
  }
}

export type { Bone };
