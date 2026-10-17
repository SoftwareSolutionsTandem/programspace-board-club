// Обучение на практике: короткие подсказки появляются в момент, когда они нужны, — один раз за обучение.
// Не длинная инструкция: игрок сразу играет настоящую партию с подсветкой допустимых карт.
import type { LineCategory } from '../../characters/types';
import { modeOf } from './interaction';
import type { DurakAction, PlayerView } from './view';

export type TutorialStep = 'intro' | 'trump' | 'attack' | 'defend' | 'throw' | 'take' | 'bito' | 'done';

export const STEP_LINE: Readonly<Record<TutorialStep, LineCategory>> = {
  intro: 'tutIntro', trump: 'tutTrump', attack: 'tutAttack', defend: 'tutDefend', throw: 'tutThrow', take: 'tutTake', bito: 'tutBito', done: 'tutDone',
};

export class TutorialCoach {
  private readonly shown = new Set<TutorialStep>();

  /** Следующая подсказка для текущей ситуации или null. */
  next(view: PlayerView, legal: readonly DurakAction[]): TutorialStep | null {
    const pick = (s: TutorialStep) => (this.shown.has(s) ? null : (this.shown.add(s), s));
    if (view.phase === 'gameOver') return pick('done');
    if (!this.shown.has('intro')) return pick('intro');
    if (!this.shown.has('trump')) return pick('trump');
    const mode = modeOf(view, legal);
    if (mode === 'attack') return pick('attack');
    if (mode === 'defend') {
      const canBeat = legal.some((a) => a.type === 'defend');
      return canBeat ? pick('defend') : pick('take');
    }
    if (mode === 'throwIn') {
      if (legal.some((a) => a.type === 'throwIn')) return pick('throw');
      if (legal.some((a) => a.type === 'pass')) return pick('bito');
    }
    return null;
  }

  get seen(): ReadonlySet<TutorialStep> {
    return this.shown;
  }
}
