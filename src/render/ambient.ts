// Комнаты персонажей и их тихие фоновые анимации (docs/ART_STYLE.md §12). Комната — статичный фон (SVG в единицах
// BG_DESIGN) плюс несколько маленьких «живых» предметов: занавеска, маятник, пар, огоньки. Каждый предмет — своя
// небольшая текстура, движение — чистая функция времени (тестируется без Pixi). Слой стоит между фоном и персонажем:
// персонаж, стол, доска, карты и счёт всегда рисуются поверх. При «Меньше движения» слой замирает.
import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { TextureJob } from '../characters/textures';

/** Прямоугольник в единицах фона (2400 × 900). */
export interface BgRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Смещение предмета относительно места на фоне: поворот (рад) вокруг опоры, сдвиг, прозрачность, масштаб, оттенок. */
export interface AmbientPose {
  readonly rot?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly alpha?: number;
  readonly sx?: number;
  readonly sy?: number;
  /** Оттенок 0xRRGGBB (умножается на цвет текстуры). */
  readonly tint?: number;
}

export interface AmbientProp {
  readonly key: string;
  /** Где лежит рисунок на фоне; SVG рисуется в локальных координатах 0…w × 0…h. */
  readonly box: BgRect;
  /** Точка опоры (единицы фона), по умолчанию — центр box. */
  readonly pivot?: { readonly x: number; readonly y: number };
  readonly svg: string;
  /** Сколько одинаковых копий (капли, пылинки); motion получает номер копии. */
  readonly count?: number;
  /** Частицы (капли, пылинки, пар): при «Меньше движения» скрыты. Остальное замирает в позе motion(0). */
  readonly particle?: boolean;
  /** Период цикла, с: motion(t + period) = motion(t). Нет — предмет неподвижный (рамка поверх живого). */
  readonly period?: number;
  /** Насколько далеко предмет может уйти от своего box (единицы фона) — для проверки, что он не залезает на важное. */
  readonly reach?: number;
  readonly motion?: (t: number, i: number) => AmbientPose;
  /**
   * Текстура из frames полос по горизонтали (каждая шириной box.w): копия i показывает полосу i. Так глобус
   * вращается по-настоящему — полосы карты встают по проекции и сжимаются к краю диска. count по умолчанию = frames.
   */
  readonly frames?: number;
  /** Маска (единицы фона): круг или прямоугольник — предмет виден только внутри. */
  readonly clip?: { readonly x: number; readonly y: number; readonly r: number } | BgRect;
}

export interface RoomArt {
  readonly id: string;
  /** Название комнаты для документации и отладки. */
  readonly name: string;
  backgroundSvg(): string;
  readonly props: readonly AmbientProp[];
}

// ---------- чистые помощники движения ----------

const TAU = Math.PI * 2;
/** Плавное колебание: amp · sin(2π t / period + phase). */
export const wave = (t: number, period: number, amp: number, phase = 0): number => amp * Math.sin((TAU * t) / period + phase);
/** Доля цикла 0…1. */
export const cycle = (t: number, period: number, phase = 0): number => {
  const v = t / period + phase;
  return v - Math.floor(v);
};
/** Мягкий горб 0 → 1 → 0 по доле цикла (для появления и угасания частиц). */
export const hump = (u: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
/** Детерминированное «случайное» 0…1 по номеру копии — разброс частиц без ГСЧ. */
export const hash01 = (i: number, salt = 0): number => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Плавный переход оттенка по кругу цветов (для светодиодной ленты): u — доля 0…1. */
export function hueTint(u: number, sat = 0.55, light = 0.62): number {
  const h = (u - Math.floor(u)) * 6;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255);
  return (to(r) << 16) | (to(g) << 8) | to(b);
}

/** Поза предмета: при reduced — неподвижная (motion(0)), частицы скрыты (null). */
export function propPose(p: AmbientProp, t: number, i: number, reduced: boolean): AmbientPose | null {
  if (reduced && p.particle) return null;
  return p.motion ? p.motion(reduced ? 0 : t, i) : {};
}

/** Габарит предмета в позе (единицы фона) — по четырём углам box после поворота и сдвига. */
export function poseBounds(p: AmbientProp, pose: AmbientPose): BgRect {
  const px = p.pivot?.x ?? p.box.x + p.box.w / 2;
  const py = p.pivot?.y ?? p.box.y + p.box.h / 2;
  const c = Math.cos(pose.rot ?? 0), s = Math.sin(pose.rot ?? 0);
  const sx = pose.sx ?? 1, sy = pose.sy ?? 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [cx, cy] of [[p.box.x, p.box.y], [p.box.x + p.box.w, p.box.y], [p.box.x, p.box.y + p.box.h], [p.box.x + p.box.w, p.box.y + p.box.h]] as const) {
    const lx = (cx - px) * sx, ly = (cy - py) * sy;
    const x = px + lx * c - ly * s + (pose.dx ?? 0);
    const y = py + lx * s + ly * c + (pose.dy ?? 0);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Системная настройка «уменьшить движение»: ambient выключается и по ней, даже если в игре флажок не стоит. */
export function systemReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// ---------- текстуры ----------

/** SVG-документ предмета в его локальных координатах. */
export const propSvg = (w: number, h: number, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;

const jobKey = (room: RoomArt, p: AmbientProp) => `amb:${room.id}:${p.key}`;

/** Задания на текстуры предметов комнаты; res — пикселей на единицу фона (как у фона). */
export function ambientJobs(room: RoomArt, res: number): TextureJob[] {
  // Мелкие предметы рисуются чуть чётче фона: их видно в движении.
  const r = Math.min(1.25, res * 1.25);
  return room.props.map((p) => ({ key: jobKey(room, p), svg: p.svg, w: p.box.w * (p.frames ?? 1) * r, h: p.box.h * r }));
}

export function ambientTextures(room: RoomArt, out: ReadonlyMap<string, Texture>): Map<string, Texture> {
  const map = new Map<string, Texture>();
  for (const p of room.props) {
    const t = out.get(jobKey(room, p));
    if (!t) throw new Error(`нет текстуры ${jobKey(room, p)}`);
    map.set(p.key, t);
  }
  return map;
}

// ---------- слой Pixi ----------

interface Item {
  readonly prop: AmbientProp;
  readonly index: number;
  readonly sprite: Sprite;
  readonly px: number;
  readonly py: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

/** Слой живых предметов комнаты: в координатах фона (масштаб и сдвиг — как у спрайта фона). */
export class AmbientLayer {
  readonly root = new Container();
  private items: Item[] = [];
  /** Полосы текстур (frames) и контейнеры с масками — свои, освобождаются при смене комнаты. */
  private owned: { textures: Texture[]; nodes: Container[] } = { textures: [], nodes: [] };
  private t = 0;
  private _reduced = false;

  constructor() {
    this.root.eventMode = 'none';
  }

  setRoom(room: RoomArt, textures: ReadonlyMap<string, Texture>): void {
    for (const it of this.items) it.sprite.destroy();
    for (const n of this.owned.nodes) n.destroy({ children: true });
    for (const t of this.owned.textures) t.destroy(false);
    this.items = [];
    this.owned = { textures: [], nodes: [] };
    for (const prop of room.props) {
      const tex = textures.get(prop.key);
      if (!tex) continue;
      const px = prop.pivot?.x ?? prop.box.x + prop.box.w / 2;
      const py = prop.pivot?.y ?? prop.box.y + prop.box.h / 2;
      let parent: Container = this.root;
      if (prop.clip) {
        parent = new Container();
        const c = prop.clip;
        const mask = ('r' in c ? new Graphics().circle(c.x, c.y, c.r) : new Graphics().rect(c.x, c.y, c.w, c.h)).fill(0xffffff);
        parent.addChild(mask);
        parent.mask = mask;
        this.root.addChild(parent);
        this.owned.nodes.push(parent);
      }
      const frames = prop.frames ?? 1;
      const fw = tex.width / frames;
      for (let i = 0; i < (prop.count ?? frames); i++) {
        let t = tex;
        if (frames > 1) {
          t = new Texture({ source: tex.source, frame: new Rectangle(tex.frame.x + fw * (i % frames), tex.frame.y, fw, tex.height) });
          this.owned.textures.push(t);
        }
        const sprite = new Sprite(t);
        sprite.anchor.set((px - prop.box.x) / prop.box.w, (py - prop.box.y) / prop.box.h);
        const item: Item = { prop, index: i, sprite, px, py, scaleX: prop.box.w / t.width, scaleY: prop.box.h / t.height };
        this.items.push(item);
        parent.addChild(sprite);
      }
    }
    this.apply();
  }

  /** Тот же масштаб и сдвиг, что у спрайта фона. */
  setTransform(bg: { readonly scale: number; readonly x: number; readonly y: number }): void {
    this.root.position.set(bg.x, bg.y);
    this.root.scale.set(bg.scale);
  }

  get reduced(): boolean {
    return this._reduced;
  }

  set reduced(v: boolean) {
    if (this._reduced === v) return;
    this._reduced = v;
    this.apply();
  }

  update(dtMs: number): void {
    if (this._reduced || !this.items.length) return;
    // Время по кругу раз в сутки игры — точность float не теряется в долгих сеансах.
    this.t = (this.t + dtMs / 1000) % 86400;
    this.apply();
  }

  private apply(): void {
    for (const it of this.items) {
      const pose = propPose(it.prop, this.t, it.index, this._reduced);
      const s = it.sprite;
      s.visible = pose !== null && (pose.alpha ?? 1) > 0.01;
      if (!pose || !s.visible) continue;
      s.position.set(it.px + (pose.dx ?? 0), it.py + (pose.dy ?? 0));
      s.rotation = pose.rot ?? 0;
      s.scale.set(it.scaleX * (pose.sx ?? 1), it.scaleY * (pose.sy ?? 1));
      s.alpha = pose.alpha ?? 1;
      s.tint = pose.tint ?? 0xffffff;
    }
  }

  /** Отладка и e2e: сколько предметов и частиц сейчас видно. */
  stats(): { readonly items: number; readonly visible: number; readonly t: number } {
    return { items: this.items.length, visible: this.items.filter((i) => i.sprite.visible).length, t: this.t };
  }
}
