import { describe, expect, it } from 'vitest';
import { legalActions } from '../../../src/games/durak/rules/engine';
import { TutorialCoach } from '../../../src/games/durak/tutorial';
import { projectView } from '../../../src/games/durak/view';
import { makeState } from './helpers';

const at = (spec: Parameters<typeof makeState>[0], seat: 0 | 1 = 0) => {
  const s = makeState(spec);
  return [projectView(s, seat), legalActions(s, seat)] as const;
};

describe('обучение', () => {
  it('сначала знакомство и козырь, затем подсказки по ситуации — каждая один раз', () => {
    const c = new TutorialCoach();
    const [v, l] = at({ hands: ['9S KD', 'AH'], trump: 'H', deck: '6D' });
    expect(c.next(v, l)).toBe('intro');
    expect(c.next(v, l)).toBe('trump');
    expect(c.next(v, l)).toBe('attack');
    expect(c.next(v, l)).toBeNull();
  });
  it('защита: есть чем бить — «как отбиться», нечем — «бери»', () => {
    const c = new TutorialCoach();
    const [v0, l0] = at({ hands: ['9S', 'AH'], trump: 'H' });
    c.next(v0, l0); c.next(v0, l0);
    const [v, l] = at({ hands: ['6D', '7C 8C'], trump: 'H', table: [['9S', null]], deck: '7D' }, 1);
    expect(c.next(v, l)).toBe('take');
    const [v2, l2] = at({ hands: ['6D', 'AS'], trump: 'H', table: [['9S', null]], deck: '7D' }, 1);
    expect(c.next(v2, l2)).toBe('defend');
  });
  it('подкидывание и «бито»', () => {
    const c = new TutorialCoach();
    const [v0, l0] = at({ hands: ['9S', 'AH'], trump: 'H' });
    c.next(v0, l0); c.next(v0, l0);
    const [v, l] = at({ hands: ['9H', '7C'], trump: 'H', table: [['9S', '10S']], deck: '6D' });
    expect(c.next(v, l)).toBe('throw');
    const [v2, l2] = at({ hands: ['QD', '7C'], trump: 'H', table: [['9S', '10S']], deck: '6D' });
    expect(c.next(v2, l2)).toBe('bito');
  });
});
