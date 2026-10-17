// Простые твины на тикере сцены. Числовые свойства объекта плавно идут к целям; результат — Promise.
// При «меньше движения» длительность нулевая: состояние игры от анимаций не зависит.

export type Ease = (t: number) => number;
export const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const easeInOutQuad: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutBack: Ease = (t) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

type Target = Record<string, unknown>;

interface Item {
  readonly target: Target;
  readonly from: Record<string, number>;
  readonly to: Record<string, number>;
  readonly ms: number;
  readonly delay: number;
  readonly ease: Ease;
  elapsed: number;
  readonly resolve: () => void;
}

export class Tweener {
  private items: Item[] = [];
  instant = false;

  /** Анимировать свойства target к значениям to за ms миллисекунд (после delay). */
  to(target: object, to: Record<string, number>, ms: number, opts: { delay?: number; ease?: Ease } = {}): Promise<void> {
    const t = target as Target;
    // Новая анимация тех же свойств заменяет старую: объект не «дёргается» между двумя целями.
    this.items = this.items.filter((it) => {
      if (it.target !== t) return true;
      const clash = Object.keys(to).some((k) => k in it.to);
      if (clash) it.resolve();
      return !clash;
    });
    if (this.instant || ms <= 0) {
      Object.assign(t, to);
      return Promise.resolve();
    }
    const from: Record<string, number> = {};
    for (const k of Object.keys(to)) from[k] = Number(t[k] ?? 0);
    return new Promise((resolve) => {
      this.items.push({ target: t, from, to, ms, delay: opts.delay ?? 0, ease: opts.ease ?? easeOutCubic, elapsed: 0, resolve });
    });
  }

  /** Ожидание (для пауз в последовательностях). */
  wait(ms: number): Promise<void> {
    return this.to({ v: 0 }, { v: 1 }, ms);
  }

  get active(): number {
    return this.items.length;
  }

  update(dtMs: number): void {
    const done: Item[] = [];
    for (const it of this.items) {
      it.elapsed += dtMs;
      const local = it.elapsed - it.delay;
      if (local < 0) continue;
      const p = Math.min(1, local / it.ms);
      const e = it.ease(p);
      for (const k of Object.keys(it.to)) it.target[k] = (it.from[k] as number) + ((it.to[k] as number) - (it.from[k] as number)) * e;
      if (p >= 1) done.push(it);
    }
    if (done.length) {
      this.items = this.items.filter((it) => !done.includes(it));
      for (const it of done) it.resolve();
    }
  }

  /** Мгновенно завершить всё (переход экрана, ресайз). */
  finishAll(): void {
    for (const it of this.items) Object.assign(it.target, it.to);
    const all = this.items;
    this.items = [];
    for (const it of all) it.resolve();
  }

  cancel(target: object): void {
    this.items = this.items.filter((it) => {
      if (it.target !== target) return true;
      it.resolve();
      return false;
    });
  }
}
