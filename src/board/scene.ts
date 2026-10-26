// Сцена партии на доске (шахматы, шашки; docs/ART_STYLE.md §11): кафе, стол, персонаж напротив, доска прямо во взгляде
// сверху-сбоку — рамка и передняя грань, объёмные фигуры с тенями, подсветка ходов и взятые фигуры рядом с доской.
// Сцена рисует то, что ей передали, и сообщает о касаниях клеток; правил она не знает.
import { Container, Graphics, Sprite, Text, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { FRAME, cellCenter, cellCorners, cellOfSquare, isoPoint, pickCell, scaleAtY, squareOfCell, type Cell, type IsoBoard } from '../layout/iso';
import { traySlot, type BoardLayout } from '../layout/board';
import { BG_DESIGN, FIGURE, type Point } from '../layout/layout';
import { drawCafeTable } from '../render/table';
import { easeInOutQuad, easeOutBack, type Tweener } from '../render/tween';
import { PuppetRig } from '../puppet/rig';
import type { PuppetBank } from '../puppet/textures';
import type { MotionStyle } from '../puppet/types';
import { AmbientLayer, type RoomArt } from '../render/ambient';

/** Рисунок фигуры: размер текстуры в единицах рисунка, точка опоры (центр основания) и ширина на доске в клетках. */
export interface PieceInfo {
  readonly w: number;
  readonly h: number;
  readonly footY: number;
  readonly cells: number;
}

export interface BoardBank {
  readonly character: PuppetBank;
  readonly pieces: ReadonlyMap<string, Texture>;
  readonly info: Readonly<Record<string, PieceInfo>>;
  readonly background: Texture;
  readonly room: RoomArt;
  readonly ambient: ReadonlyMap<string, Texture>;
}

/** Цвета доски: клетки, рамка, грани и подписи. */
export interface BoardSkin {
  readonly light: number;
  readonly dark: number;
  readonly frame: number;
  readonly frameHi: number;
  readonly sideL: number;
  readonly sideR: number;
  readonly label: number;
  /** Подписи вертикалей и горизонталей на рамке. */
  readonly labels: boolean;
}

export interface BoardMarks {
  readonly selected: number | null;
  /** Куда можно пойти выбранной фигурой; captures — поля, где ход берёт фигуру. */
  readonly targets: readonly number[];
  readonly captures: readonly number[];
  /** Поля, с которых можно ходить (обязательное взятие в шашках, обучение). */
  readonly movable: readonly number[];
  /** Последний ход: поля пути. */
  readonly last: readonly number[];
  /** Король под шахом. */
  readonly check: number | null;
  /** Клавиатурный курсор. */
  readonly cursor: number | null;
}

export const NO_MARKS: BoardMarks = { selected: null, targets: [], captures: [], movable: [], last: [], check: null, cursor: null };

/** Анимация хода: путь фигуры по полям, сбитые фигуры, ход ладьи при рокировке, превращение. */
export interface MoveAnim {
  readonly path: readonly number[];
  readonly captures: readonly number[];
  readonly rook?: { readonly from: number; readonly to: number };
  /** Новая фигура после превращения (ключ текстуры). */
  readonly promoteTo?: string;
  /** Сбитые фигуры снимаются после всего хода (шашки, «турецкий удар»), а не сразу. */
  readonly removeAfter?: boolean;
  /** Кто сбил: фигуры уходят в его ряд у края доски. */
  readonly capturer: 'human' | 'opponent';
}

export interface BoardSceneInput {
  onSquare(square: number): void;
}

/** Фигура на доске: точка опоры на плоскости доски (x, y) и подъём над ней (lift) для прыжка. */
class PieceSprite {
  readonly body = new Sprite();
  readonly shadow = new Graphics();
  x = 0;
  y = 0;
  lift = 0;
  alpha = 1;
  pop = 1;
  destroyed = false;
  /** Масштаб по глубине: фигуры у дальнего края чуть меньше (перспектива доски). */
  depthScale: (y: number) => number = () => 1;
  constructor(public key: string, private width: number) {
    this.body.anchor.set(0.5, 1);
  }

  setTexture(tex: Texture, info: PieceInfo, tileW: number): void {
    this.body.texture = tex;
    this.body.anchor.set(0.5, info.footY / info.h);
    this.width = tileW * info.cells;
    this.body.width = this.width;
    this.body.height = (this.width * info.h) / info.w;
    this.shadow.clear();
    const rx = this.width * 0.42;
    this.shadow.ellipse(0, 0, rx, rx * 0.6).fill({ color: 0x2a1408, alpha: 0.32 });
    this.shadow.ellipse(0, 0, rx * 0.72, rx * 0.42).fill({ color: 0x2a1408, alpha: 0.18 });
  }

  sync(): void {
    if (this.destroyed) return;
    const sw = this.body.texture.width ? this.width / this.body.texture.width : 1;
    const ds = Math.min(1.12, this.depthScale(this.y));
    this.body.position.set(this.x, this.y - this.lift * ds);
    this.body.scale.set(sw * this.pop * ds);
    this.body.alpha = this.alpha;
    // Порядок отрисовки — по точке опоры: дальние фигуры (выше на экране) раньше ближних.
    this.body.zIndex = this.y + (this.lift > 0 ? 0.5 : 0);
    this.shadow.position.set(this.x, this.y);
    const k = Math.max(0.45, 1 - this.lift / (this.width * 2.2));
    this.shadow.scale.set(k * ds);
    this.shadow.alpha = this.alpha * k;
  }

  destroy(): void {
    this.destroyed = true;
    this.body.destroy();
    this.shadow.destroy();
  }
}

export class BoardScene {
  readonly root = new Container();
  readonly rig: PuppetRig;
  private readonly bg = new Sprite();
  /** Живые предметы комнаты персонажа — над фоном, под персонажем и столом. */
  readonly ambient = new AmbientLayer();
  private readonly table = new Graphics();
  private readonly boardG = new Graphics();
  private readonly labels = new Container();
  private readonly marksG = new Graphics();
  private readonly shadowLayer = new Container();
  private readonly pieceLayer = new Container({ sortableChildren: true });
  private readonly trayLayer = new Container({ sortableChildren: true });
  private readonly flyLayer = new Container();
  private bank: BoardBank | null = null;
  private layout: BoardLayout | null = null;
  private human: 'w' | 'b' = 'w';
  private keys: readonly (string | null)[] = new Array(64).fill(null);
  private readonly pieces = new Map<number, PieceSprite>();
  private marks: BoardMarks = NO_MARKS;
  private trays: { human: readonly string[]; opponent: readonly string[] } = { human: [], opponent: [] };
  private hover: number | null = null;
  private pulse = 0;
  private animating = 0;
  private rigT = { x: 0, y: 0, s: 1 };
  inputEnabled = false;

  constructor(private readonly tweens: Tweener, private readonly input: BoardSceneInput, motion: MotionStyle, private readonly skin: BoardSkin, seed = 31) {
    this.rig = new PuppetRig(motion, seed);
    // В покое руки персонажа лежат на столе за доской — доска и фигуры перед ними. Рука, которая тянется к фигуре,
    // на время хода переходит в rig.overLayer — над фигурами (syncArms), и возвращается, когда снова не над полем.
    this.root.addChild(this.bg, this.ambient.root, this.rig.back, this.table, this.rig.front, this.boardG, this.labels, this.marksG, this.shadowLayer, this.pieceLayer, this.rig.overLayer, this.trayLayer, this.flyLayer);
    this.labels.eventMode = 'none';
    this.root.eventMode = 'static';
    this.root.on('pointertap', (e: FederatedPointerEvent) => this.onTap(e));
    this.root.on('pointermove', (e: FederatedPointerEvent) => this.onHover(e));
  }

  // ---------- настройка ----------

  setTextures(bank: BoardBank): void {
    this.bank = bank;
    this.bg.texture = bank.background;
    this.ambient.setRoom(bank.room, bank.ambient);
    this.rig.setTextures(bank.character, null, null);
    this.rebuild();
  }

  setLayout(spec: BoardLayout): void {
    this.layout = spec;
    this.tweens.finishAll();
    const bgs = spec.background.scale;
    this.bg.position.set(spec.background.x, spec.background.y);
    this.bg.width = BG_DESIGN.width * bgs;
    this.bg.height = BG_DESIGN.height * bgs;
    this.ambient.setTransform(spec.background);
    const c = spec.character;
    const anchorY = c.crop === 'bust' ? FIGURE.bustY : FIGURE.waistY;
    this.rigT = { x: c.x - FIGURE.centerX * c.scale, y: c.y - anchorY * c.scale, s: c.scale };
    this.rig.setTransform(this.rigT.x, this.rigT.y, c.scale);
    drawCafeTable(this.table, spec);
    this.drawBoard();
    this.rebuild();
  }

  /** Сторона игрока: доска поворачивается к нему его фигурами. */
  setPerspective(human: 'w' | 'b'): void {
    if (this.human === human) return;
    this.human = human;
    this.drawBoard();
    this.rebuild();
  }

  /** Расставить фигуры по полям (ключи текстур, null — пусто) без анимации. */
  sync(keys: readonly (string | null)[]): void {
    this.keys = keys.slice();
    this.rebuild();
  }

  setMarks(m: BoardMarks): void {
    this.marks = m;
    this.drawMarks();
  }

  setTrays(human: readonly string[], opponent: readonly string[]): void {
    this.trays = { human: [...human], opponent: [...opponent] };
    this.drawTrays();
  }

  get busy(): boolean {
    return this.animating > 0;
  }

  private get board(): IsoBoard | null {
    return this.layout?.board ?? null;
  }

  private cell(square: number): Cell {
    return cellOfSquare(square, this.human);
  }

  /** Центр поля на экране (координаты сцены). */
  squarePoint(square: number): Point {
    const b = this.board;
    return b ? cellCenter(b, this.cell(square)) : { x: 0, y: 0 };
  }

  /** Точка сцены в единицах рига (для жестов персонажа). */
  toRig(p: Point): Point {
    return { x: (p.x - this.rigT.x) / this.rigT.s, y: (p.y - this.rigT.y) / this.rigT.s };
  }

  // ---------- доска ----------

  private drawBoard(): void {
    const b = this.board;
    const g = this.boardG;
    g.clear();
    this.labels.removeChildren().forEach((c) => c.destroy());
    if (!b) return;
    const s = this.skin;
    const n = FRAME;
    // Углы рамки: ближний левый и правый, дальний правый и левый. Доска стоит прямо, дальний край чуть уже.
    const NL = isoPoint(b, -n, -n), NR = isoPoint(b, 8 + n, -n), FR = isoPoint(b, 8 + n, 8 + n), FL = isoPoint(b, -n, 8 + n);
    const d = b.depth;
    const line = Math.max(2, b.tileW * 0.05);
    const outline = { color: 0x3b2418, width: line, join: 'round' as const };
    // Тень доски на столе — мягкая, со смещением к игроку и вправо (свет слева сверху).
    const sh = b.tileW * 0.18;
    g.poly([FL.x + sh, FL.y + sh, FR.x + sh, FR.y + sh, NR.x + sh * 1.6, NR.y + d + sh, NL.x + sh * 1.6, NL.y + d + sh]).fill({ color: 0x163f3a, alpha: 0.35 });
    // Передняя грань (толщина доски) и её нижнее ребро.
    g.poly([NL.x, NL.y, NR.x, NR.y, NR.x, NR.y + d, NL.x, NL.y + d]).fill(s.sideL).stroke(outline);
    g.moveTo(NL.x + line, NL.y + d * 0.62).lineTo(NR.x - line, NR.y + d * 0.62).stroke({ color: s.sideR, width: Math.max(1.5, d * 0.22), alpha: 0.6 });
    // Рамка (верхняя грань доски вокруг поля).
    g.poly([NL.x, NL.y, NR.x, NR.y, FR.x, FR.y, FL.x, FL.y]).fill(s.frame).stroke(outline);
    // Клетки.
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        const sq = squareOfCell({ u, v }, this.human);
        const dark = ((sq & 7) + (sq >> 3)) % 2 === 0;
        const [p0, p1, p2, p3] = cellCorners(b, { u, v });
        g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill(dark ? s.dark : s.light);
      }
    }
    // Контур игрового поля; блик по дальнему и левому краю рамки (свет слева сверху).
    const a0 = isoPoint(b, 0, 0), a1 = isoPoint(b, 8, 0), a2 = isoPoint(b, 8, 8), a3 = isoPoint(b, 0, 8);
    g.poly([a0.x, a0.y, a1.x, a1.y, a2.x, a2.y, a3.x, a3.y]).stroke({ color: 0x3b2418, width: line * 0.7, join: 'round' });
    g.moveTo(FL.x + line * 1.5, FL.y + line).lineTo(FR.x - line * 1.5, FR.y + line).stroke({ color: s.frameHi, width: line * 0.7, alpha: 0.5 });
    g.moveTo(FL.x + line, FL.y + line * 1.5).lineTo(NL.x + line, NL.y - line * 1.2).stroke({ color: s.frameHi, width: line * 0.7, alpha: 0.4 });
    if (s.labels) this.drawLabels(b);
  }

  /** Подписи: буквы вертикалей — на ближнем крае рамки (у игрока), цифры горизонталей — на левом. */
  private drawLabels(b: IsoBoard): void {
    const size = Math.max(9, Math.min(18, b.tileW * 0.24));
    const style = { fontFamily: 'Nunito, Trebuchet MS, sans-serif', fontSize: size, fontWeight: '800' as const, fill: this.skin.label };
    for (let i = 0; i < 8; i++) {
      const file = this.human === 'w' ? i : 7 - i;
      const f = new Text({ text: 'abcdefgh'[file]!, style });
      f.anchor.set(0.5);
      const p = isoPoint(b, i + 0.5, -FRAME / 2);
      f.position.set(p.x, p.y);
      this.labels.addChild(f);
      const rank = this.human === 'w' ? i : 7 - i;
      const r = new Text({ text: String(rank + 1), style });
      r.anchor.set(0.5);
      const q = isoPoint(b, -FRAME / 2, i + 0.5);
      r.position.set(q.x, q.y);
      r.scale.set(scaleAtY(b, q.y));
      this.labels.addChild(r);
    }
  }

  // ---------- подсветка ----------

  private drawMarks(): void {
    const b = this.board;
    const g = this.marksG;
    g.clear();
    if (!b) return;
    const m = this.marks;
    const poly = (sq: number) => {
      const [p0, p1, p2, p3] = cellCorners(b, this.cell(sq));
      return [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
    };
    const inset = (sq: number, k: number) => {
      const c = cellCenter(b, this.cell(sq));
      const pts = poly(sq);
      return pts.map((v, i) => (i % 2 === 0 ? c.x + (v - c.x) * k : c.y + (v - c.y) * k));
    };
    const glow = 0.5 + 0.5 * Math.sin(this.pulse * 4);
    for (const sq of m.last) g.poly(poly(sq)).fill({ color: 0xf2b84b, alpha: 0.38 });
    if (m.check !== null) {
      g.poly(poly(m.check)).fill({ color: 0xe0453a, alpha: 0.45 + 0.2 * glow });
      g.poly(inset(m.check, 0.8)).stroke({ color: 0xffd9c9, width: 2, alpha: 0.8 });
    }
    for (const sq of m.movable) if (sq !== m.selected) g.poly(inset(sq, 0.86)).stroke({ color: 0xf4c542, width: Math.max(2, b.tileW * 0.045), alpha: 0.55 + 0.35 * glow });
    if (m.selected !== null) {
      g.poly(poly(m.selected)).fill({ color: 0xf4c542, alpha: 0.5 });
      g.poly(inset(m.selected, 0.9)).stroke({ color: 0xfff1c9, width: Math.max(2, b.tileW * 0.05) });
    }
    const caps = new Set(m.captures);
    for (const sq of m.targets) {
      const c = cellCenter(b, this.cell(sq));
      if (caps.has(sq)) {
        g.poly(inset(sq, 0.82)).stroke({ color: 0xe0453a, width: Math.max(2.5, b.tileW * 0.06), alpha: 0.85 });
      } else {
        const r = b.tileW * 0.13;
        // Кремовая точка с тёмным контуром видна и на светлых, и на тёмных (в том числе зелёных) полях.
        g.ellipse(c.x, c.y, r * scaleAtY(b, c.y), r * scaleAtY(b, c.y) * b.tilt).fill({ color: 0xfff1c9, alpha: 0.95 }).stroke({ color: 0x3b2418, width: Math.max(1.5, b.tileW * 0.03), alpha: 0.85 });
      }
    }
    const outline = (sq: number, color: number) => g.poly(inset(sq, 0.94)).stroke({ color, width: Math.max(2, b.tileW * 0.04), alpha: 0.9 });
    if (this.hover !== null && this.inputEnabled) outline(this.hover, 0xfff8ee);
    if (m.cursor !== null) outline(m.cursor, 0x5fb3a3);
  }

  // ---------- фигуры ----------

  private makePiece(key: string): PieceSprite | null {
    const bank = this.bank, b = this.board;
    const tex = bank?.pieces.get(key);
    const info = bank?.info[key];
    if (!bank || !b || !tex || !info) return null;
    const p = new PieceSprite(key, b.tileW * info.cells);
    p.setTexture(tex, info, b.tileW);
    p.depthScale = (y) => scaleAtY(b, y);
    this.shadowLayer.addChild(p.shadow);
    this.pieceLayer.addChild(p.body);
    return p;
  }

  private kill(p: PieceSprite): void {
    this.tweens.cancel(p);
    p.destroy();
  }

  /** Пересобрать фигуры по ключам полей — мгновенно. */
  private rebuild(): void {
    this.tweens.finishAll();
    for (const p of this.pieces.values()) this.kill(p);
    this.pieces.clear();
    const b = this.board;
    if (!b || !this.bank) return;
    this.keys.forEach((key, sq) => {
      if (!key) return;
      const p = this.makePiece(key);
      if (!p) return;
      const c = cellCenter(b, this.cell(sq));
      p.x = c.x;
      p.y = c.y;
      p.sync();
      this.pieces.set(sq, p);
    });
    this.drawMarks();
    this.drawTrays();
  }

  private drawTrays(): void {
    this.trayLayer.removeChildren().forEach((c) => c.destroy());
    const s = this.layout, bank = this.bank;
    if (!s || !bank) return;
    const put = (keys: readonly string[], tray: BoardLayout['board']['trays']['human']) => {
      keys.forEach((key, k) => {
        const tex = bank.pieces.get(key), info = bank.info[key];
        if (!tex || !info) return;
        const sp = new Sprite(tex);
        sp.anchor.set(0.5, info.footY / info.h);
        const w = tray.size * Math.min(1, info.cells / 0.78);
        sp.width = w;
        sp.height = (w * info.h) / info.w;
        const p = traySlot(tray, k);
        sp.position.set(p.x, p.y);
        sp.zIndex = p.y;
        this.trayLayer.addChild(sp);
      });
    };
    put(this.trays.human, s.board.trays.human);
    put(this.trays.opponent, s.board.trays.opponent);
  }

  /** Прыжок фигуры с поля на поле: дуга, приземление с лёгким «пружинным» сжатием. */
  private async hop(p: PieceSprite, to: Point, ms: number, height: number): Promise<void> {
    const from = { x: p.x, y: p.y };
    const t = { k: 0 };
    const step = () => {
      p.x = from.x + (to.x - from.x) * t.k;
      p.y = from.y + (to.y - from.y) * t.k;
      p.lift = Math.sin(Math.PI * t.k) * height;
      p.sync();
    };
    const tick = { get k() { return t.k; }, set k(v: number) { t.k = v; step(); } };
    await this.tweens.to(tick, { k: 1 }, ms, { ease: easeInOutQuad });
    p.lift = 0;
    p.x = to.x;
    p.y = to.y;
    p.pop = 0.92;
    p.sync();
    await this.tweens.to(p, { pop: 1 }, 160, { ease: easeOutBack });
    p.sync();
  }

  /** Сбитая фигура уходит в ряд взявшего. */
  private async capture(p: PieceSprite, side: 'human' | 'opponent'): Promise<void> {
    const s = this.layout;
    if (!s) return this.kill(p);
    const tray = s.board.trays[side];
    const slot = traySlot(tray, this.trays[side].length);
    this.flyLayer.addChild(p.body);
    const target = { x: slot.x, y: slot.y };
    await this.hop(p, target, 380, (s.board.tileW) * 0.8);
    this.kill(p);
  }

  /** Сыграть ход: фигура идёт по пути, сбитые уходят к краю. Состояние доски после — через sync(). */
  async animate(a: MoveAnim, after: readonly (string | null)[]): Promise<void> {
    const b = this.board;
    const from = a.path[0];
    const mover = from === undefined ? undefined : this.pieces.get(from);
    if (!b || !mover) {
      this.sync(after);
      return;
    }
    this.animating++;
    try {
      this.pieces.delete(from!);
      const hopH = b.tileW * 0.55;
      const victims = a.captures.map((sq) => ({ sq, p: this.pieces.get(sq) }));
      for (const v of victims) this.pieces.delete(v.sq);
      for (let i = 1; i < a.path.length; i++) {
        const sq = a.path[i]!;
        const c0 = this.cell(a.path[i - 1]!), c1 = this.cell(sq);
        const dist = Math.hypot(c1.u - c0.u, c1.v - c0.v);
        await this.hop(mover, cellCenter(b, this.cell(sq)), 260 + dist * 60, hopH * Math.min(1.6, 0.7 + dist * 0.25));
        // Шахматы: сбитая снимается сразу после приземления; шашки — тускнеет и снимается после всего хода.
        const v = victims[i - 1];
        if (v?.p && !a.removeAfter) {
          void this.capture(v.p, a.capturer);
        } else if (v?.p) {
          void this.tweens.to(v.p, { alpha: 0.45 }, 160).then(() => v.p?.sync());
        }
      }
      // Взятие в шахматах — одно, на последнем поле пути (или на проходе).
      if (!a.removeAfter) {
        for (const v of victims.slice(a.path.length - 1)) if (v.p) void this.capture(v.p, a.capturer);
      } else {
        for (const v of victims) if (v.p) void this.capture(v.p, a.capturer);
      }
      if (a.rook) {
        const r = this.pieces.get(a.rook.from);
        if (r) {
          this.pieces.delete(a.rook.from);
          await this.hop(r, cellCenter(b, this.cell(a.rook.to)), 320, hopH * 0.8);
          this.pieces.set(a.rook.to, r);
        }
      }
      const to = a.path[a.path.length - 1]!;
      this.pieces.set(to, mover);
      if (a.promoteTo && this.bank) {
        const tex = this.bank.pieces.get(a.promoteTo), info = this.bank.info[a.promoteTo];
        if (tex && info) {
          mover.key = a.promoteTo;
          mover.setTexture(tex, info, b.tileW);
          mover.pop = 0.6;
          mover.sync();
          await this.tweens.to(mover, { pop: 1 }, 320, { ease: easeOutBack });
        }
      }
      await this.tweens.wait(60);
    } finally {
      this.animating--;
    }
    this.sync(after);
  }

  // ---------- ввод ----------

  private candidates(): Cell[] {
    const m = this.marks;
    const list = m.selected !== null ? [...m.targets, ...m.movable] : m.movable;
    return list.map((sq) => this.cell(sq));
  }

  private onTap(e: FederatedPointerEvent): void {
    const b = this.board;
    if (!b || !this.inputEnabled) return;
    const p = this.root.toLocal(e.global);
    const c = pickCell(b, p.x, p.y, this.candidates(), this.layout?.board.snap ?? 30);
    if (c) this.input.onSquare(squareOfCell(c, this.human));
  }

  private onHover(e: FederatedPointerEvent): void {
    const b = this.board;
    if (!b || e.pointerType !== 'mouse') return;
    const p = this.root.toLocal(e.global);
    const c = pickCell(b, p.x, p.y, [], 0);
    const sq = c ? squareOfCell(c, this.human) : null;
    if (sq !== this.hover) {
      this.hover = sq;
      this.drawMarks();
    }
  }

  update(dtMs: number): void {
    this.pulse += dtMs / 1000;
    if (this.marks.movable.length || this.marks.check !== null) this.drawMarks();
    for (const p of this.pieces.values()) p.sync();
    this.rig.update(dtMs);
    this.ambient.update(dtMs);
    this.syncArms();
  }

  /**
   * Слой руки: над фигурами — только пока жест тянет её к доске; переключение — когда кисть не над игровым полем,
   * чтобы рука не «прыгала» сквозь фигуры.
   */
  private syncArms(): void {
    const want = this.rig.armsFront;
    const cur = this.rig.armOver;
    if (want === cur) return;
    const b = this.board;
    if (!b) return;
    const far = isoPoint(b, 0, 8), nl = isoPoint(b, -FRAME, -FRAME), nr = isoPoint(b, 8 + FRAME, -FRAME);
    const field = { x: nl.x, y: far.y, w: nr.x - nl.x, h: nl.y - far.y };
    const clear = (side: 'l' | 'r') => !this.rig.handBounds(side).some((h) => h.x < field.x + field.w && h.x + h.width > field.x && h.y < field.y + field.h && h.y + h.height > field.y);
    if (cur && !clear(cur)) return;
    if (want && !clear(want)) {
      if (cur) this.rig.setArmOver(null);
      return;
    }
    this.rig.setArmOver(want);
  }

  /** Что видно на доске — для отладки и e2e. */
  debug(): { pieces: number; busy: boolean; human: 'w' | 'b'; square: (sq: number) => Point } {
    return { pieces: this.pieces.size, busy: this.busy, human: this.human, square: (sq) => this.root.toGlobal(this.squarePoint(sq)) };
  }

  destroy(): void {
    for (const p of this.pieces.values()) this.kill(p);
    this.pieces.clear();
    this.root.destroy({ children: true });
  }
}
