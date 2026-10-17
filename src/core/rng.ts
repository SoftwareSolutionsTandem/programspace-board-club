// Детерминированный генератор случайных чисел (sfc32).
// Состояние — четыре 32-битных слова: сериализуется в JSON и хранится внутри состояния партии.
// Функции чистые: принимают состояние и возвращают новое, ничего не мутируя.

export type RngState = readonly [number, number, number, number];

/** Создаёт состояние из целого seed (seed разворачивается через splitmix32). */
export function createRng(seed: number): RngState {
  let s = seed >>> 0;
  const splitmix = (): number => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  let state: RngState = [splitmix(), splitmix(), splitmix(), splitmix()];
  // Прогрев, чтобы близкие seed не давали похожих первых значений.
  for (let i = 0; i < 12; i++) state = nextUint32(state)[1];
  return state;
}

/** Следующее 32-битное беззнаковое число. */
export function nextUint32(state: RngState): [number, RngState] {
  let [a, b, c, d] = state;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  return [t >>> 0, [a >>> 0, b >>> 0, c >>> 0, d >>> 0]];
}

/** Равномерное целое в диапазоне [0, n) без смещения (отбраковка хвоста). */
export function nextInt(state: RngState, n: number): [number, RngState] {
  if (!Number.isInteger(n) || n <= 0 || n > 0x100000000) throw new RangeError(`nextInt: недопустимый n=${n}`);
  const limit = Math.floor(0x100000000 / n) * n;
  let s = state;
  for (;;) {
    const [x, next] = nextUint32(s);
    s = next;
    if (x < limit) return [x % n, s];
  }
}

/** Число с плавающей точкой в [0, 1). */
export function nextFloat(state: RngState): [number, RngState] {
  const [x, next] = nextUint32(state);
  return [x / 0x100000000, next];
}

/** Перемешивание Фишера–Йетса; исходный массив не меняется. */
export function shuffle<T>(state: RngState, items: readonly T[]): [T[], RngState] {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const [j, next] = nextInt(s, i + 1);
    s = next;
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return [out, s];
}
