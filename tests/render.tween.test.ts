import { describe, expect, it } from 'vitest';
import { easeOutBack, easeOutCubic, Tweener } from '../src/render/tween';

describe('твины', () => {
  it('доводят значение до цели и выполняют Promise', async () => {
    const t = new Tweener();
    const o = { x: 0, y: 10 };
    let done = false;
    const p = t.to(o, { x: 100 }, 100).then(() => { done = true; });
    t.update(50);
    expect(o.x).toBeGreaterThan(50);
    expect(o.x).toBeLessThan(100);
    t.update(60);
    await p;
    expect(o.x).toBe(100);
    expect(o.y).toBe(10);
    expect(done).toBe(true);
    expect(t.active).toBe(0);
  });
  it('задержка', () => {
    const t = new Tweener();
    const o = { x: 0 };
    void t.to(o, { x: 1 }, 100, { delay: 50 });
    t.update(40);
    expect(o.x).toBe(0);
    t.update(200);
    expect(o.x).toBe(1);
  });
  it('новая анимация того же свойства заменяет старую', async () => {
    const t = new Tweener();
    const o = { x: 0 };
    const first = t.to(o, { x: 100 }, 100);
    void t.to(o, { x: -5 }, 100);
    await first;
    t.update(200);
    expect(o.x).toBe(-5);
    expect(t.active).toBe(0);
  });
  it('режим без движения: сразу итоговое значение', async () => {
    const t = new Tweener();
    t.instant = true;
    const o = { x: 0 };
    await t.to(o, { x: 7 }, 300);
    expect(o.x).toBe(7);
  });
  it('finishAll доводит всё до цели', async () => {
    const t = new Tweener();
    const a = { x: 0 }, b = { y: 0 };
    const all = Promise.all([t.to(a, { x: 3 }, 500), t.to(b, { y: 4 }, 900)]);
    t.finishAll();
    await all;
    expect([a.x, b.y]).toEqual([3, 4]);
  });
  it('кривые: начало 0, конец 1', () => {
    for (const e of [easeOutCubic, easeOutBack]) {
      expect(e(0)).toBeCloseTo(0);
      expect(e(1)).toBeCloseTo(1);
    }
  });
});
