// Контроллер матча против персонажа: правила, проекция, ИИ и счёт матчей за сеанс.
// Не знает о сцене, звуке и размерах экрана; интерфейс шлёт намерения, ИИ ходит через decide().
import { createRng, type RngState } from '../../core/rng';
import { decide, MATVEY, type AiLevel, type Personality } from './ai';
import type { Seat } from './rules/bones';
import { actor, apply, legalActions, nextHand, type DominoAction, type DominoError, type DominoEvent } from './rules/engine';
import { dealHand, MATCH_TARGET, startMatch } from './rules/setup';
import type { DominoState } from './rules/state';
import { projectView, type PlayerView } from './view';

export const HUMAN: Seat = 0;
export const OPPONENT: Seat = 1;

export type StepResult = { ok: true; events: readonly DominoEvent[]; action: DominoAction } | { ok: false; error: DominoError };

export interface MatchOptions {
  readonly seed: number;
  readonly level: AiLevel;
  readonly personality?: Personality;
}

export class DominoMatch {
  private state: DominoState;
  private aiRng: RngState;
  level: AiLevel;
  readonly personality: Personality;
  /** Выигранные матчи за сеанс: [игрок, Матвей]. */
  private wins: [number, number] = [0, 0];

  constructor(opts: MatchOptions) {
    this.level = opts.level;
    this.personality = opts.personality ?? MATVEY;
    // Отдельные ГСЧ: раздачи и решения ИИ не влияют друг на друга.
    this.state = startMatch(opts.seed, MATCH_TARGET);
    this.aiRng = createRng(opts.seed ^ 0x2545f491);
  }

  view(): PlayerView {
    return projectView(this.state, HUMAN);
  }

  turn(): Seat | null {
    return actor(this.state);
  }

  get phase(): DominoState['phase'] {
    return this.state.phase;
  }

  get over(): boolean {
    return this.state.phase === 'matchOver';
  }

  get matchWins(): readonly [number, number] {
    return this.wins;
  }

  humanActions(): DominoAction[] {
    return this.turn() === HUMAN ? legalActions(this.state) : [];
  }

  act(action: DominoAction): StepResult {
    if (action.seat !== HUMAN) return { ok: false, error: 'wrongSeat' };
    return this.commit(action);
  }

  opponentStep(): StepResult | null {
    if (this.turn() !== OPPONENT) return null;
    const d = decide(projectView(this.state, OPPONENT), this.level, this.personality, this.aiRng);
    this.aiRng = d.rng;
    return this.commit(d.action);
  }

  /** Вынужденное действие игрока: добор из базара или стук, когда выложить нечего (§4). */
  autoHumanAction(): DominoAction | null {
    const a = this.humanActions();
    return a.length === 1 && a[0]!.type !== 'play' ? a[0]! : null;
  }

  /** Следующая раздача матча. */
  nextHand(): boolean {
    const r = nextHand(this.state);
    if (!r.ok) return false;
    this.state = r.state;
    return true;
  }

  /** Новый матч: раздача по младшему дублю, счёт с нуля; тасование продолжает ГСЧ матча. */
  newMatch(): void {
    this.state = dealHand(this.state.rng, { kind: 'byDouble' }, { score: [0, 0], target: this.state.target, handNumber: 1 });
  }

  private commit(action: DominoAction): StepResult {
    const r = apply(this.state, action);
    if (!r.ok) return r;
    this.state = r.state;
    const end = r.events.find((e) => e.type === 'matchOver');
    if (end && end.type === 'matchOver') this.wins[end.winner === HUMAN ? 0 : 1]++;
    return { ok: true, events: r.events, action };
  }

  /** Только для тестов: полное состояние. Интерфейс его не использует. */
  debugState(): DominoState {
    return this.state;
  }
}
