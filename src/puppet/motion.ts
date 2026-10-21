// Математика движения марионетки: пружины второго порядка и плавный шум. Без DOM и Pixi.
// Пружина вместо твина: цель можно менять в любой момент, движение продолжается с текущей скоростью —
// жест прерывается плавно; частота и затухание задают характер (бойкий с перелётом или тяжёлый и медленный).
import { nextFloat, type RngState } from '../core/rng';

/** Характер пружины: f — собственная частота, Гц; zeta — затухание (<1 — перелёт); r — отклик на старт (<0 — замах). */
export interface SpringParams {
  readonly f: number;
  readonly zeta: number;
  readonly r?: number;
}

/**
 * Система второго порядка (y + k1·y' + k2·y'' = x + k3·x'): плавный разгон, торможение, перелёт.
 * Шаг устойчив при любом dt: k2 ограничивается снизу, как у полунеявного Эйлера.
 */
export class Spring {
  y: number;
  private v = 0;
  private xPrev: number;
  private k1 = 0;
  private k2 = 0;
  private k3 = 0;

  constructor(value: number, params: SpringParams) {
    this.y = value;
    this.xPrev = value;
    this.set(params);
  }

  set(p: SpringParams): void {
    const w = 2 * Math.PI * p.f;
    this.k1 = p.zeta / (Math.PI * p.f);
    this.k2 = 1 / (w * w);
    this.k3 = ((p.r ?? 0) * p.zeta) / w;
  }

  /** Шаг к цели x за dt секунд. */
  step(x: number, dt: number): number {
    if (dt <= 0) return this.y;
    const xd = (x - this.xPrev) / dt;
    this.xPrev = x;
    // Мелкие шаги: большой dt (подтормаживание вкладки) не раскачивает пружину.
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    const k2 = Math.max(this.k2, (h * h) / 2 + (h * this.k1) / 2, h * this.k1);
    for (let i = 0; i < n; i++) {
      this.y += h * this.v;
      this.v += (h * (x + this.k3 * xd - this.y - this.k1 * this.v)) / k2;
    }
    return this.y;
  }

  /** Мгновенно поставить значение (без движения). */
  snap(x: number): void {
    this.y = x;
    this.v = 0;
    this.xPrev = x;
  }

  get velocity(): number {
    return this.v;
  }
}

/** Детерминированный ГСЧ марионетки (не Math.random: запись видео и тесты воспроизводимы). */
export class MotionRng {
  constructor(private state: RngState) {}

  next(): number {
    const [v, s] = nextFloat(this.state);
    this.state = s;
    return v;
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Выбор с весами. */
  pick<T>(items: readonly T[], weight: (t: T) => number = () => 1): T {
    const total = items.reduce((s, t) => s + weight(t), 0);
    let roll = this.next() * total;
    for (const t of items) {
      roll -= weight(t);
      if (roll <= 0) return t;
    }
    return items[items.length - 1]!;
  }
}

/**
 * Плавный шум в [-1, 1]: случайные опорные значения через интервал period, между ними — сглаженная интерполяция.
 * Две октавы с разными периодами: движение не похоже на повторяющуюся синусоиду.
 */
export class SmoothNoise {
  private a = 0;
  private b = 0;
  private t = 0;

  constructor(private readonly rng: MotionRng, private readonly period: number) {
    this.a = rng.range(-1, 1);
    this.b = rng.range(-1, 1);
  }

  step(dt: number): number {
    this.t += dt / this.period;
    while (this.t >= 1) {
      this.t -= 1;
      this.a = this.b;
      this.b = this.rng.range(-1, 1);
    }
    const u = this.t * this.t * (3 - 2 * this.t);
    return this.a + (this.b - this.a) * u;
  }
}

/** Две октавы шума: медленная основная и быстрая слабая. */
export class Wander {
  private readonly slow: SmoothNoise;
  private readonly fast: SmoothNoise;

  constructor(rng: MotionRng, period: number) {
    this.slow = new SmoothNoise(rng, period);
    this.fast = new SmoothNoise(rng, period * 0.37);
  }

  step(dt: number): number {
    return this.slow.step(dt) * 0.75 + this.fast.step(dt) * 0.25;
  }
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
