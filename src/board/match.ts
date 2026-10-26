// Контроллер партии на доске (шахматы, шашки) против персонажа: правила, проекция, ИИ и счёт за сеанс.
// Игра подключается адаптером; контроллер не знает о сцене, звуке и размерах экрана.
import { createRng, type RngState } from '../core/rng';

export type Side = 'w' | 'b';
export const otherSide = (c: Side): Side => (c === 'w' ? 'b' : 'w');

export type Applied<S, E, Err> = { readonly ok: true; readonly state: S; readonly events: readonly E[] } | { readonly ok: false; readonly error: Err };

/** Что контроллеру нужно от игры. Действия — ход или сдача; итог партии — в состоянии. */
export interface BoardRules<S, A extends { readonly type: string; readonly color: Side }, E, V, Err, L> {
  newGame(): S;
  apply(s: S, a: A): Applied<S, E, Err>;
  actor(s: S): Side | null;
  legal(s: S): A[];
  view(s: S, c: Side): V;
  decide(v: V, level: L, rng: RngState): { readonly action: A; readonly rng: RngState };
  /** Итог партии: победитель или null (ничья); undefined — партия идёт. */
  winner(s: S): Side | null | undefined;
  resign(c: Side): A;
}

export type StepResult<A, E, Err> = { ok: true; events: readonly E[]; action: A } | { ok: false; error: Err | 'notYourTurn' };

export class BoardMatch<S, A extends { readonly type: string; readonly color: Side }, E, V, Err, L> {
  private state: S;
  private aiRng: RngState;
  /** Цвет игрока: в первой партии — белые, в реваншах цвета меняются. */
  human: Side = 'w';
  level: L;
  /** Итоги за сеанс: [победы игрока, победы персонажа, ничьи]. */
  private tally: [number, number, number] = [0, 0, 0];

  constructor(private readonly rules: BoardRules<S, A, E, V, Err, L>, opts: { seed: number; level: L }) {
    this.level = opts.level;
    this.state = rules.newGame();
    this.aiRng = createRng(opts.seed ^ 0x2545f491);
  }

  get opponent(): Side {
    return otherSide(this.human);
  }

  view(): V {
    return this.rules.view(this.state, this.human);
  }

  turn(): Side | null {
    return this.rules.actor(this.state);
  }

  get over(): boolean {
    return this.rules.winner(this.state) !== undefined;
  }

  /** Победитель завершённой партии (null — ничья, undefined — идёт). */
  get winner(): Side | null | undefined {
    return this.rules.winner(this.state);
  }

  get tallies(): readonly [number, number, number] {
    return this.tally;
  }

  humanActions(): A[] {
    return this.turn() === this.human ? this.rules.legal(this.state).filter((a) => a.type === 'move') : [];
  }

  act(action: A): StepResult<A, E, Err> {
    if (action.color !== this.human) return { ok: false, error: 'notYourTurn' };
    return this.commit(action);
  }

  opponentStep(): StepResult<A, E, Err> | null {
    if (this.turn() !== this.opponent) return null;
    const d = this.rules.decide(this.rules.view(this.state, this.opponent), this.level, this.aiRng);
    this.aiRng = d.rng;
    return this.commit(d.action);
  }

  resign(): StepResult<A, E, Err> | null {
    if (this.over) return null;
    return this.commit(this.rules.resign(this.human));
  }

  /** Новая партия: цвета меняются. */
  newMatch(): void {
    this.human = otherSide(this.human);
    this.state = this.rules.newGame();
  }

  private commit(action: A): StepResult<A, E, Err> {
    const r = this.rules.apply(this.state, action);
    if (!r.ok) return r;
    this.state = r.state;
    const w = this.rules.winner(this.state);
    if (w !== undefined) this.tally[w === null ? 2 : w === this.human ? 0 : 1]++;
    return { ok: true, events: r.events, action };
  }

  /** Только для тестов и отладки: полное состояние. Интерфейс его не использует. */
  debugState(): S {
    return this.state;
  }

  /** Только для тестов и обучения: начать с заданной позиции. */
  debugSetState(s: S): void {
    this.state = s;
  }
}
