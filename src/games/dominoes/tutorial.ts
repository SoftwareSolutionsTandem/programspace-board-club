// Обучение на практике (как у подкидного): короткие подсказки в момент, когда они нужны, — по одной за обучение.
// Обучающим считается первая раздача матча; после неё — «обучение пройдено», матч продолжается.
import type { LineCategory } from '../../characters/types';
import type { DominoAction, PlayerView } from './view';

export type TutorialStep = 'intro' | 'match' | 'ends' | 'bazaar' | 'knock' | 'goal' | 'done';

export const STEP_LINE: Readonly<Record<TutorialStep, LineCategory>> = {
  intro: 'tutIntro', match: 'tutMatch', ends: 'tutEnds', bazaar: 'tutBazaar', knock: 'tutKnock', goal: 'tutGoal', done: 'tutDone',
};

export class TutorialCoach {
  private readonly shown = new Set<TutorialStep>();

  /** Подсказка для текущей ситуации; picking — игрок выбирает конец для кости. */
  next(view: PlayerView, legal: readonly DominoAction[], picking = false): TutorialStep | null {
    const pick = (s: TutorialStep) => (this.shown.has(s) ? null : (this.shown.add(s), s));
    if (view.phase !== 'play') return pick('done');
    if (!this.shown.has('intro')) return pick('intro');
    if (picking) return pick('ends');
    if (view.turn !== view.seat) return null;
    if (legal.some((a) => a.type === 'play')) return this.shown.has('match') && view.chain.length >= 4 ? pick('goal') : pick('match');
    if (legal.some((a) => a.type === 'draw')) return pick('bazaar');
    if (legal.some((a) => a.type === 'knock')) return pick('knock');
    return null;
  }

  get seen(): ReadonlySet<TutorialStep> {
    return this.shown;
  }
}
