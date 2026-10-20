// Сцена партии: кафе, общий стол, Агата напротив, карты. Рисует PlayerView и анимирует переходы по событиям.
// Правила здесь не проверяются: сцена только показывает состояние и сообщает о касаниях.
import { Container, Graphics, Sprite, Text, type FederatedPointerEvent } from 'pixi.js';
import { CharacterRig } from '../../../characters/rig';
import { FIGURE, defenseOffset, handSlots, pairSlot, type LayoutSpec, BG_DESIGN } from '../../../layout/layout';
import { drawCafeTable } from '../../../render/table';
import { easeInOutQuad, easeOutBack, Tweener } from '../../../render/tween';
import { cardCode, type Card } from '../rules/cards';
import type { DurakEvent } from '../rules/engine';
import type { PlayerView } from '../view';
import { CardSprite } from './cardSprite';
import type { TextureBank } from './textures';

export type DropTarget = { kind: 'pair'; index: number } | { kind: 'table' } | null;

export interface SceneInput {
  onCardTap(code: string): void;
  onPairTap(index: number): void;
  onTableTap(): void;
  onDrop(code: string, target: DropTarget): void;
}

export interface Highlights {
  readonly selected: ReadonlySet<string>;
  readonly playable: ReadonlySet<string>;
  readonly targets: ReadonlySet<number>;
}

const SUIT_ORDER = { S: 0, C: 1, D: 2, H: 3 } as const;
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Порядок карт в руке: по мастям, козыри справа, внутри масти по возрастанию. */
export function sortHand(cards: readonly Card[], trump: Card['suit']): Card[] {
  return [...cards].sort((a, b) => {
    const ta = a.suit === trump ? 1 : 0;
    const tb = b.suit === trump ? 1 : 0;
    if (ta !== tb) return ta - tb;
    if (a.suit !== b.suit) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    return a.rank - b.rank;
  });
}

export class DurakScene {
  readonly root = new Container();
  readonly rig = new CharacterRig();
  private readonly bg = new Sprite();
  private readonly table = new Graphics();
  private readonly deckLayer = new Container();
  private readonly discardLayer = new Container();
  private readonly tableLayer = new Container();
  private readonly handLayer = new Container();
  private readonly flyLayer = new Container();
  // Число карт в колоде — плашкой на самой колоде (её не закрывает отбой и не путают с ним).
  private readonly deckBadge = new Container();
  private readonly deckBadgeBg = new Graphics();
  private readonly deckCount = new Text({ text: '', style: { fontFamily: 'Nunito, Trebuchet MS, sans-serif', fontSize: 16, fontWeight: '800', fill: 0xfff8ee } });
  private bank: TextureBank | null = null;
  private layout: LayoutSpec | null = null;
  private view: PlayerView | null = null;
  /** Карты с известным лицом: рука игрока и стол. */
  private readonly sprites = new Map<string, CardSprite>();
  private discardCount = 0;
  private highlights: Highlights = { selected: new Set(), playable: new Set(), targets: new Set() };
  private drag: { code: string; sprite: CardSprite; startX: number; startY: number; moved: boolean; offX: number; offY: number } | null = null;
  inputEnabled = false;

  constructor(private readonly tweens: Tweener, private readonly input: SceneInput) {
    this.root.addChild(this.bg, this.rig.back, this.table, this.rig.front, this.deckLayer, this.deckBadge, this.discardLayer, this.tableLayer, this.handLayer, this.flyLayer);
    this.deckBadge.addChild(this.deckBadgeBg, this.deckCount);
    this.table.eventMode = 'static';
    this.table.on('pointertap', () => {
      if (this.inputEnabled && !this.drag) this.input.onTableTap();
    });
    this.root.eventMode = 'static';
    this.root.on('globalpointermove', (e: FederatedPointerEvent) => this.onDragMove(e));
    this.root.on('pointerup', (e: FederatedPointerEvent) => this.onDragEnd(e));
    this.root.on('pointerupoutside', (e: FederatedPointerEvent) => this.onDragEnd(e));
  }

  setTextures(bank: TextureBank): void {
    this.bank = bank;
    this.bg.texture = bank.background;
    this.rig.setTextures(bank.character, bank.back);
    // Пересоздать спрайты с новыми текстурами.
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    if (this.view && this.layout) this.place(this.view, true);
  }

  // ---------- раскладка ----------

  setLayout(spec: LayoutSpec): void {
    this.layout = spec;
    this.tweens.finishAll();
    const bgs = spec.background.scale;
    this.bg.position.set(spec.background.x, spec.background.y);
    this.bg.width = BG_DESIGN.width * bgs;
    this.bg.height = BG_DESIGN.height * bgs;
    const c = spec.character;
    const anchorY = c.crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
    this.rig.setTransform(c.x - FIGURE.centerX * c.scale, c.y - anchorY * c.scale, c.scale);
    drawCafeTable(this.table, spec);
    if (this.view) this.place(this.view, true);
  }

  // ---------- состояние без анимации ----------

  private makeSprite(code: string | null): CardSprite {
    const bank = this.bank!;
    const s = new CardSprite(code, code ? (bank.cards.get(code) ?? null) : null, bank.back);
    if (code) this.bindInput(s);
    return s;
  }

  private bindInput(s: CardSprite): void {
    s.eventMode = 'static';
    s.cursor = 'pointer';
    s.on('pointerdown', (e: FederatedPointerEvent) => {
      if (!this.inputEnabled || !s.code) return;
      const local = this.root.toLocal(e.global);
      this.drag = { code: s.code, sprite: s, startX: local.x, startY: local.y, moved: false, offX: s.x - local.x, offY: s.y - local.y };
    });
  }

  private inHand(code: string): boolean {
    return !!this.view?.hand.some((c) => cardCode(c) === code);
  }

  private onDragMove(e: FederatedPointerEvent): void {
    const d = this.drag;
    if (!d || !this.inHand(d.code)) return;
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
      // Касание без перетаскивания: карта руки или атакующая карта на столе.
      const pair = this.pairIndexOf(d.code);
      if (pair !== null && this.highlights.targets.has(pair)) this.input.onPairTap(pair);
      else if (this.inHand(d.code)) this.input.onCardTap(d.code);
      else if (pair !== null) this.input.onPairTap(pair);
      return;
    }
    const p = this.root.toLocal(e.global);
    this.handLayer.addChild(d.sprite);
    this.input.onDrop(d.code, this.dropTargetAt(p.x, p.y));
    // Если ход не состоялся, карта вернётся на место при следующем show()/refresh().
    if (this.view) this.place(this.view, false);
  }

  private pairIndexOf(code: string): number | null {
    const t = this.view?.table ?? [];
    const i = t.findIndex((p) => cardCode(p.attack) === code);
    return i >= 0 ? i : null;
  }

  dropTargetAt(x: number, y: number): DropTarget {
    const s = this.layout;
    const v = this.view;
    if (!s || !v) return null;
    for (let i = 0; i < v.table.length; i++) {
      const p = pairSlot(s, i, v.table.length);
      if (Math.abs(x - p.x) < s.tableCard.w * 0.75 && Math.abs(y - p.y) < s.tableCard.h * 0.75 && v.table[i]!.defense === null) return { kind: 'pair', index: i };
    }
    const handTop = s.hand.bottom - s.hand.cardH - s.hand.lift;
    if (y > s.table.farY && y < handTop) return { kind: 'table' };
    return null;
  }

  /** Целевые позиции всех карт по проекции; animate=false — сразу на места. */
  private place(view: PlayerView, instant: boolean): Promise<void> {
    const s = this.layout;
    if (!s || !this.bank) return Promise.resolve();
    const jobs: Promise<void>[] = [];
    const ms = instant ? 0 : 280;
    const seen = new Set<string>();
    // Стол.
    const off = defenseOffset(s);
    view.table.forEach((pair, i) => {
      const slot = pairSlot(s, i, view.table.length);
      for (const [card, dx, dy] of [[pair.attack, 0, 0], ...(pair.defense ? [[pair.defense, off.x, off.y]] : [])] as [Card, number, number][]) {
        const code = cardCode(card);
        seen.add(code);
        const sp = this.ensure(code, slot.x, slot.y);
        sp.setCardSize(s.tableCard.w, s.tableCard.h);
        this.tableLayer.addChild(sp);
        const rot = (((hash(code) % 13) - 6) * Math.PI) / 180;
        jobs.push(this.tweens.to(sp, { x: slot.x + dx, y: slot.y + dy, rotation: rot, flip: 1, lift: 0 }, ms));
      }
    });
    // Рука игрока.
    const hand = sortHand(view.hand, view.trumpSuit);
    const slots = handSlots(s, hand.length);
    hand.forEach((card, i) => {
      const code = cardCode(card);
      seen.add(code);
      const slot = slots[i]!;
      const sp = this.ensure(code, s.deck.x, s.deck.y);
      sp.setCardSize(s.hand.cardW, s.hand.cardH);
      if (sp.parent !== this.handLayer || this.handLayer.getChildIndex(sp) !== i) this.handLayer.addChildAt(sp, Math.min(i, this.handLayer.children.length));
      const lifted = this.highlights.selected.has(code) ? 0.16 : 0;
      jobs.push(this.tweens.to(sp, { x: slot.x, y: slot.y, rotation: slot.rot, flip: 1, lift: lifted }, ms));
    });
    for (const [code, sp] of [...this.sprites]) if (!seen.has(code)) {
      sp.destroy();
      this.sprites.delete(code);
    }
    this.rig.setFanCount(view.opponentHandCount);
    this.drawDeck(view, s);
    this.drawDiscard(s, view.discard.length);
    this.applyHighlights();
    return Promise.all(jobs).then(() => undefined);
  }

  private ensure(code: string, x: number, y: number): CardSprite {
    let sp = this.sprites.get(code);
    if (!sp) {
      sp = this.makeSprite(code);
      sp.position.set(x, y);
      this.sprites.set(code, sp);
    }
    return sp;
  }

  private drawDeck(view: PlayerView, s: LayoutSpec): void {
    const bank = this.bank!;
    this.deckLayer.removeChildren().forEach((c) => c.destroy());
    const { w, h } = s.tableCard;
    if (view.trumpInDeck) {
      const trump = new CardSprite(cardCode(view.trumpCard), bank.cards.get(cardCode(view.trumpCard)) ?? null, bank.back);
      trump.setCardSize(w, h);
      trump.rotation = Math.PI / 2;
      trump.position.set(s.deck.x + w * 0.42, s.deck.y);
      trump.sync();
      this.deckLayer.addChild(trump);
    }
    const closed = Math.max(0, view.deckCount - (view.trumpInDeck ? 1 : 0));
    for (let i = 0; i < Math.min(4, Math.ceil(closed / 6)); i++) {
      const b = new CardSprite(null, null, bank.back);
      b.setCardSize(w, h);
      b.position.set(s.deck.x - i * 1.5, s.deck.y - i * 1.5);
      b.rotation = -0.06;
      b.sync();
      this.deckLayer.addChild(b);
    }
    this.deckCount.text = view.deckCount > 0 ? String(view.deckCount) : '';
    this.deckCount.style.fontSize = Math.round(Math.max(13, Math.min(20, w * 0.3)));
    this.deckCount.anchor.set(0.5);
    const bw = Math.max(this.deckCount.width + 14, this.deckCount.height + 4);
    const bh = this.deckCount.height + 2;
    this.deckBadgeBg.clear();
    if (view.deckCount > 0) this.deckBadgeBg.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2).fill({ color: 0x1c2b28, alpha: 0.82 }).stroke({ color: 0xfff8ee, width: 1.5, alpha: 0.8 });
    this.deckBadge.position.set(s.deckLabel.x, s.deckLabel.y);
  }

  private drawDiscard(s: LayoutSpec, count: number): void {
    const bank = this.bank!;
    this.discardCount = count;
    this.discardLayer.removeChildren().forEach((c) => c.destroy());
    const { w, h } = s.tableCard;
    const n = Math.min(6, Math.ceil(count / 4));
    for (let i = 0; i < n; i++) {
      const b = new CardSprite(null, null, bank.back);
      b.setCardSize(w, h);
      b.position.set(s.discard.x + ((i * 7) % 5) - 2, s.discard.y + ((i * 3) % 4) - 2);
      b.rotation = ((((i * 37) % 30) - 15) * Math.PI) / 180;
      b.sync();
      this.discardLayer.addChild(b);
    }
  }

  // ---------- подсветка ----------

  setHighlights(h: Highlights): void {
    this.highlights = h;
    this.applyHighlights();
    if (this.view && !this.drag) void this.place(this.view, false);
  }

  private applyHighlights(): void {
    for (const [code, sp] of this.sprites) {
      if (this.highlights.selected.has(code)) sp.setGlow('selected');
      else if (this.highlights.playable.has(code) && this.inHand(code)) sp.setGlow('playable');
      else {
        const pair = this.pairIndexOf(code);
        sp.setGlow(pair !== null && this.highlights.targets.has(pair) ? 'target' : 'none');
      }
    }
  }

  // ---------- переходы ----------

  /** Мгновенно показать проекцию (начало партии, ресайз). */
  reset(view: PlayerView): void {
    this.tweens.finishAll();
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    this.flyLayer.removeChildren().forEach((c) => c.destroy());
    this.view = view;
    void this.place(view, true);
  }

  /** Анимировать переход к новой проекции по событиям действия. */
  async show(view: PlayerView, events: readonly DurakEvent[]): Promise<void> {
    const s = this.layout;
    const prev = this.view;
    if (!s || !this.bank || !prev) {
      this.view = view;
      return;
    }
    const tableCodes = (v: PlayerView) => new Set(v.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack])).map(cardCode));
    const prevTable = tableCodes(prev);
    const prevHand = new Set(prev.hand.map(cardCode));
    const newHand = new Set(view.hand.map(cardCode));
    const fan = this.root.toLocal(this.rig.fanPoint());
    const jobs: Promise<void>[] = [];
    // Карты, впервые появившиеся на столе не из руки игрока, — от Агаты: вылетают из её веера рубашкой и переворачиваются.
    for (const code of tableCodes(view)) {
      if (prevTable.has(code) || prevHand.has(code) || this.sprites.has(code)) continue;
      const sp = this.makeSprite(code);
      sp.setCardSize(s.tableCard.w * 0.7, s.tableCard.h * 0.7);
      sp.position.set(fan.x, fan.y);
      sp.flip = 0;
      this.sprites.set(code, sp);
      this.tableLayer.addChild(sp);
    }
    // Карты, ушедшие со стола: в отбой или Агате.
    const gone = [...prevTable].filter((c) => !tableCodes(view).has(c) && !newHand.has(c));
    const tookByOpp = events.some((e) => e.type === 'took' && e.seat !== view.seat);
    for (const code of gone) {
      const sp = this.sprites.get(code);
      if (!sp) continue;
      this.sprites.delete(code);
      this.flyLayer.addChild(sp);
      const target = tookByOpp ? fan : s.discard;
      const flipTo = tookByOpp ? 0 : 0;
      jobs.push(this.tweens.to(sp, { x: target.x, y: target.y, flip: flipTo, rotation: sp.rotation + 0.6, alpha: tookByOpp ? 0.2 : 1 }, 380, { ease: easeInOutQuad }).then(() => sp.destroy()));
    }
    // Добор Агаты: рубашки летят из колоды в её веер.
    let delay = 0;
    for (const e of events) {
      if (e.type !== 'drew' || e.seat === view.seat) continue;
      for (let i = 0; i < e.cards.length; i++) {
        const b = new CardSprite(null, null, this.bank.back);
        b.setCardSize(s.tableCard.w * 0.8, s.tableCard.h * 0.8);
        b.position.set(s.deck.x, s.deck.y);
        b.sync();
        this.flyLayer.addChild(b);
        jobs.push(this.tweens.to(b, { x: fan.x, y: fan.y, rotation: -0.3, alpha: 0.3 }, 340, { delay: delay += 60 }).then(() => b.destroy()));
      }
    }
    // Новые карты в руке игрока не со стола — из колоды: появляются рубашкой у колоды.
    for (const code of newHand) {
      if (prevHand.has(code) || prevTable.has(code)) continue;
      const sp = this.makeSprite(code);
      sp.position.set(s.deck.x, s.deck.y);
      sp.flip = 0;
      sp.setCardSize(s.tableCard.w, s.tableCard.h);
      this.sprites.set(code, sp);
      this.handLayer.addChild(sp);
    }
    this.view = view;
    jobs.push(this.place(view, false));
    // Удар картой о стол: короткое «прыжок» масштаба у новой карты Агаты.
    if (events.some((e) => (e.type === 'attacked' || e.type === 'thrownIn' || e.type === 'defended') && e.seat !== view.seat)) {
      const last = view.table.at(-1);
      const code = last ? cardCode(last.defense ?? last.attack) : null;
      const sp = code ? this.sprites.get(code) : undefined;
      if (sp) {
        sp.scale.set(1.12);
        jobs.push(this.tweens.to(sp.scale, { x: 1, y: 1 }, 260, { delay: 220, ease: easeOutBack }));
      }
    }
    await Promise.all(jobs);
  }

  /** Встряхнуть карту (недопустимый ход). */
  shake(code: string): void {
    const sp = this.sprites.get(code);
    if (!sp) return;
    const x = sp.x;
    void this.tweens.to(sp, { x: x - 8 }, 60).then(() => this.tweens.to(sp, { x: x + 8 }, 90)).then(() => this.tweens.to(sp, { x }, 70));
  }

  update(dtMs: number): void {
    this.tweens.update(dtMs);
    this.rig.update(dtMs);
    for (const sp of this.sprites.values()) sp.sync();
    for (const c of this.flyLayer.children) if (c instanceof CardSprite) c.sync();
  }

  /**
   * Отладка и e2e: экранные точки касания карт руки и центры атакующих карт стола.
   * Точка карты руки — на её видимой части: в большой руке центр бывает закрыт соседними картами.
   */
  debugPositions(): { hand: Record<string, { x: number; y: number }>; table: { x: number; y: number }[] } {
    const hand: Record<string, { x: number; y: number }> = {};
    const order = this.handLayer.children.filter((c): c is CardSprite => c instanceof CardSprite);
    for (const c of this.view?.hand ?? []) {
      const sp = this.sprites.get(cardCode(c));
      if (sp) hand[cardCode(c)] = visiblePoint(sp, order.slice(order.indexOf(sp) + 1));
    }
    const s = this.layout;
    const n = this.view?.table.length ?? 0;
    const table = s ? (this.view?.table ?? []).map((_, i) => pairSlot(s, i, n)) : [];
    return { hand, table };
  }

  get discardShown(): number {
    return this.discardCount;
  }
}

// Точки-кандидаты в долях карты: центр, затем верх и левый край (в веере их перекрывают соседи справа и ряды ниже).
const TAP_FRACTIONS: readonly (readonly [number, number])[] = [
  [0, 0], [0, -0.3], [-0.3, 0], [-0.3, -0.3], [-0.4, -0.4], [0.3, -0.3], [-0.4, 0.3], [0, 0.35],
];

/** Первая точка карты, не закрытая картами `above` (те, что рисуются поверх); иначе — центр. */
function visiblePoint(sp: CardSprite, above: readonly CardSprite[]): { x: number; y: number } {
  const w = sp.cardW;
  const h = sp.cardH;
  const covered = (g: { x: number; y: number }) =>
    above.some((o) => {
      const l = o.toLocal(g);
      return Math.abs(l.x) <= o.cardW / 2 && Math.abs(l.y) <= o.cardH / 2;
    });
  for (const [fx, fy] of TAP_FRACTIONS) {
    const g = sp.toGlobal({ x: fx * w, y: fy * h });
    if (!covered(g)) return { x: g.x, y: g.y };
  }
  const c = sp.toGlobal({ x: 0, y: 0 });
  return { x: c.x, y: c.y };
}
