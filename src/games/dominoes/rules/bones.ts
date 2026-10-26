// Кости домино «дубль-шесть» (docs/games/dominoes.md §1, §3). Кость нормализована: hi ≥ lo.

export type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Seat = 0 | 1;

export interface Bone {
  readonly hi: Pip;
  readonly lo: Pip;
}

export const MAX_PIP = 6;
export const SET_SIZE = 28;

export const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Нормализованная кость из двух половин в любом порядке. */
export function bone(a: number, b: number): Bone {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > MAX_PIP || b > MAX_PIP) throw new RangeError(`кость ${a}:${b} вне набора`);
  return a >= b ? { hi: a as Pip, lo: b as Pip } : { hi: b as Pip, lo: a as Pip };
}

/** Постоянный id кости: «hi:lo». */
export const boneCode = (b: Bone): string => `${b.hi}:${b.lo}`;

export const sameBone = (a: Bone, b: Bone): boolean => a.hi === b.hi && a.lo === b.lo;

export const isDouble = (b: Bone): boolean => b.hi === b.lo;

/** Очки кости — сумма точек (§1). */
export const pips = (b: Bone): number => b.hi + b.lo;

export const handPips = (hand: readonly Bone[]): number => hand.reduce((s, b) => s + pips(b), 0);

export const hasPip = (b: Bone, n: number): boolean => b.hi === n || b.lo === n;

/** Полный набор из 28 костей в постоянном порядке: 0:0, 1:0, 1:1, 2:0 … 6:6. */
export function createSet(): Bone[] {
  const out: Bone[] = [];
  for (let hi = 0; hi <= MAX_PIP; hi++) for (let lo = 0; lo <= hi; lo++) out.push(bone(hi, lo));
  return out;
}

/**
 * Сравнение тяжести (§3): сумма → старшая половина → младшая половина. Положительное — a тяжелее.
 * Ноль только для одной и той же нормализованной кости.
 */
export function compareHeaviness(a: Bone, b: Bone): number {
  return pips(a) - pips(b) || a.hi - b.hi || a.lo - b.lo;
}

/** Порядок дублей для первого хода (§3): 1:1, 2:2 … 6:6, затем 0:0. */
export const OPENING_DOUBLES: readonly Bone[] = [1, 2, 3, 4, 5, 6, 0].map((n) => bone(n, n));
