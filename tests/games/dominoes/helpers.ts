// Общие помощники тестов домино.
import { createRng, nextInt, type RngState } from '../../../src/core/rng';
import { bone, boneCode, type Bone, type Pip, type Seat } from '../../../src/games/dominoes/rules/bones';
import { actor, apply, legalActions, nextHand, type DominoAction, type DominoEvent } from '../../../src/games/dominoes/rules/engine';
import { startMatch } from '../../../src/games/dominoes/rules/setup';
import type { DominoState, Placed } from '../../../src/games/dominoes/rules/state';

export const b = (code: string): Bone => {
  const [x, y] = code.split(':').map(Number);
  return bone(x!, y!);
};
export const bs = (codes: string): Bone[] => (codes.trim() ? codes.trim().split(/\s+/).map(b) : []);

/** Цепочка по записи «6:3 3:5»: кости уже ориентированы слева направо. */
export function chainOf(codes: string): Placed[] {
  return codes
    .trim()
    .split(/\s+/)
    .map((c) => {
      const [l, r] = c.split(':').map(Number) as [Pip, Pip];
      return { bone: bone(l, r), left: l, right: r };
    });
}

/** Состояние посреди раздачи для точечных проверок. */
export function makeState(p: { hands: [string, string]; chain?: string; bazaar?: string; turn?: Seat; score?: [number, number]; target?: number }): DominoState {
  const base = startMatch(1, p.target ?? 101);
  const chain = p.chain ? chainOf(p.chain) : [];
  return {
    ...base,
    hands: [bs(p.hands[0]), bs(p.hands[1])],
    chain,
    bazaar: bs(p.bazaar ?? ''),
    turn: p.turn ?? 0,
    opening: { kind: 'winner', seat: p.turn ?? 0 },
    score: p.score ?? [0, 0],
  };
}

export function mustApply(s: DominoState, a: DominoAction): { state: DominoState; events: readonly DominoEvent[] } {
  const r = apply(s, a);
  if (!r.ok) throw new Error(`отклонено: ${r.error}`);
  return r;
}

/** Все 28 костей ровно по одному разу: руки + базар + цепочка. */
export function allBones(s: DominoState): string[] {
  return [...s.hands[0], ...s.hands[1], ...s.bazaar, ...s.chain.map((x) => x.bone)].map(boneCode);
}

/** Раздача случайными законными ходами до её конца. */
export function randomHand(s0: DominoState, seed: number, onStep?: (s: DominoState) => void): DominoState {
  let s = s0;
  let rng: RngState = createRng(seed);
  for (let i = 0; actor(s) !== null; i++) {
    if (i > 200) throw new Error('раздача не завершилась');
    const opts = legalActions(s);
    const [k, next] = nextInt(rng, opts.length);
    rng = next;
    s = mustApply(s, opts[k]!).state;
    onStep?.(s);
  }
  return s;
}

/** Состояние посреди раздачи после steps случайных ходов. */
export function midHand(seed: number, steps: number): DominoState {
  let s = startMatch(seed);
  let rng: RngState = createRng(seed + 777);
  for (let i = 0; i < steps && actor(s) !== null; i++) {
    const opts = legalActions(s);
    const [k, next] = nextInt(rng, opts.length);
    rng = next;
    s = mustApply(s, opts[k]!).state;
  }
  return s;
}

export { nextHand };
