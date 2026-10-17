// Серия партий с одним соперником (docs/games/durak.md §3): счёт и правило «под дурака».
import type { Seat } from './cards';
import type { SeriesContext } from './setup';
import type { DurakResult } from './state';

export interface SeriesState {
  readonly wins: readonly [number, number];
  readonly draws: number;
  readonly lastResult: DurakResult | null;
}

export const newSeries = (): SeriesState => ({ wins: [0, 0], draws: 0, lastResult: null });

export function recordResult(series: SeriesState, result: DurakResult): SeriesState {
  if ('draw' in result) return { ...series, draws: series.draws + 1, lastResult: result };
  const w = result.winner as Seat;
  const wins: [number, number] = [series.wins[0], series.wins[1]];
  wins[w] += 1;
  return { ...series, wins, lastResult: result };
}

/** Контекст для следующей раздачи серии. Выход из партии в меню серию сбрасывает (newSeries). */
export const seriesContext = (series: SeriesState): SeriesContext => ({ previousResult: series.lastResult });
