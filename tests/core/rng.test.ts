import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt, nextUint32, shuffle, type RngState } from '../../src/core/rng';

function take(state: RngState, n: number): number[] {
  const out: number[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const [x, next] = nextUint32(s);
    out.push(x);
    s = next;
  }
  return out;
}

describe('rng', () => {
  it('одинаковый seed даёт одинаковую последовательность', () => {
    expect(take(createRng(42), 50)).toEqual(take(createRng(42), 50));
  });

  it('разные seed дают разные последовательности', () => {
    expect(take(createRng(1), 10)).not.toEqual(take(createRng(2), 10));
  });

  it('не мутирует состояние и переживает JSON', () => {
    const s = createRng(7);
    const copy = JSON.parse(JSON.stringify(s)) as RngState;
    nextUint32(s);
    expect(s).toEqual(copy);
    expect(take(copy, 5)).toEqual(take(s, 5));
  });

  it('nextUint32 возвращает 32-битные беззнаковые числа', () => {
    for (const x of take(createRng(3), 1000)) {
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(2 ** 32);
    }
  });

  it('nextInt равномерен в [0, n)', () => {
    const n = 6;
    const counts = new Array<number>(n).fill(0);
    let s = createRng(123);
    const total = 60_000;
    for (let i = 0; i < total; i++) {
      const [x, next] = nextInt(s, n);
      s = next;
      counts[x] = (counts[x] ?? 0) + 1;
    }
    for (const c of counts) expect(Math.abs(c - total / n)).toBeLessThan(total / n * 0.05);
  });

  it('nextInt отвергает некорректный n', () => {
    const s = createRng(1);
    expect(() => nextInt(s, 0)).toThrow(RangeError);
    expect(() => nextInt(s, 2.5)).toThrow(RangeError);
  });

  it('nextFloat в [0, 1)', () => {
    let s = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const [x, next] = nextFloat(s);
      s = next;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('shuffle — перестановка, детерминирована и не меняет исходный массив', () => {
    const items = Array.from({ length: 36 }, (_, i) => i);
    const [a] = shuffle(createRng(5), items);
    const [b] = shuffle(createRng(5), items);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(a).not.toEqual(items);
    expect(items).toEqual(Array.from({ length: 36 }, (_, i) => i));
  });

  it('shuffle равномерно распределяет первый элемент', () => {
    const items = [0, 1, 2, 3];
    const counts = [0, 0, 0, 0];
    let s = createRng(77);
    const total = 40_000;
    for (let i = 0; i < total; i++) {
      const [out, next] = shuffle(s, items);
      s = next;
      counts[out[0] as number]! += 1;
    }
    for (const c of counts) expect(Math.abs(c - total / 4)).toBeLessThan(total / 4 * 0.05);
  });
});
