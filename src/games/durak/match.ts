// Контроллер партии против персонажа: связывает правила, проекцию, ИИ и серию.
// Не знает о сцене, звуке и размерах экрана; UI шлёт намерения, ИИ ходит через decide().
import { createRng, type RngState } from '../../core/rng';
import { AGATA, decide, type AiLevel, type Personality } from './ai';
import type { Seat } from './rules/cards';
import { actor, apply, canThrowAny, legalActions, unbeatenCount, validate, type DurakAction, type DurakError, type DurakEvent } from './rules/engine';
import { newSeries, recordResult, seriesContext, type SeriesState } from './rules/series';
import { newGame } from './rules/setup';
import type { DurakState } from './rules/state';
import { projectView, type PlayerView } from './view';

export const HUMAN: Seat = 0;
export const OPPONENT: Seat = 1;

export type StepResult = { ok: true; events: readonly DurakEvent[]; action: DurakAction } | { ok: false; error: DurakError };

export interface MatchOptions {
  readonly seed: number;
  readonly level: AiLevel;
  readonly personality?: Personality;
}

export class DurakMatch {
  private state: DurakState;
  private aiRng: RngState;
  private dealRng: RngState;
  private seriesState: SeriesState = newSeries();
  level: AiLevel;
  readonly personality: Personality;

  constructor(opts: MatchOptions) {
    this.level = opts.level;
    this.personality = opts.personality ?? AGATA;
    // Отдельные ГСЧ: раздачи и решения ИИ не влияют друг на друга.
    this.dealRng = createRng(opts.seed);
    this.aiRng = createRng(opts.seed ^ 0x2545f491);
    this.state = this.deal();
  }

  private deal(): DurakState {
    const s = newGame(this.dealRng, seriesContext(this.seriesState));
    this.dealRng = s.rng;
    return s;
  }

  /** Следующая партия серии («под дурака» после победы). */
  nextGame(): void {
    this.state = this.deal();
  }

  /** Новая серия (смена соперника, выход в меню). */
  resetSeries(): void {
    this.seriesState = newSeries();
    this.state = this.deal();
  }

  get series(): SeriesState {
    return this.seriesState;
  }

  get over(): boolean {
    return this.state.phase === 'gameOver';
  }

  /** Что видит игрок. Скрытые карты соперника сюда не попадают. */
  view(): PlayerView {
    return projectView(this.state, HUMAN);
  }

  /** Чьё действие продвигает партию. */
  turn(): Seat | null {
    return actor(this.state);
  }

  humanActions(): DurakAction[] {
    return legalActions(this.state, HUMAN);
  }

  humanCanAct(): boolean {
    return this.humanActions().length > 0;
  }

  /** Действие игрока. Недопустимое — отказ с причиной (для подсказки), состояние не меняется. */
  act(action: DurakAction): StepResult {
    if (action.seat !== HUMAN) return { ok: false, error: 'wrongSeat' };
    return this.commit(action);
  }

  explain(action: DurakAction): DurakError | null {
    return validate(this.state, action);
  }

  /** Ход соперника, если сейчас его очередь. */
  opponentStep(): StepResult | null {
    if (this.turn() !== OPPONENT) return null;
    const d = decide(projectView(this.state, OPPONENT), this.level, this.personality, this.aiRng);
    this.aiRng = d.rng;
    return this.commit(d.action);
  }

  /**
   * Действие, которое выполняется за игрока автоматически: «Бито», когда всё побито и подкинуть нечего;
   * «Готово» после «Беру», когда подкинуть нечего (durak.md §4.5 [И]).
   */
  autoHumanAction(): DurakAction | null {
    const s = this.state;
    if (s.attacker !== HUMAN || this.turn() !== HUMAN) return null;
    if (s.phase === 'defend' && unbeatenCount(s.table) === 0 && !canThrowAny(s)) return { type: 'pass', seat: HUMAN };
    if (s.phase === 'throwInAfterTake' && !canThrowAny(s)) return { type: 'doneThrowing', seat: HUMAN };
    return null;
  }

  private commit(action: DurakAction): StepResult {
    const r = apply(this.state, action);
    if (!r.ok) return r;
    this.state = r.state;
    const end = r.events.find((e) => e.type === 'gameOver');
    if (end && end.type === 'gameOver') this.seriesState = recordResult(this.seriesState, end.result);
    return { ok: true, events: r.events, action };
  }

  /** Только для тестов и отладки (dev): полное состояние. Интерфейс его не использует. */
  debugState(): DurakState {
    return this.state;
  }
}
