import { describe, expect, it } from 'vitest';
import { createRng, nextInt, shuffle, type RngState } from '../../../src/core/rng';
import { AGATA, decide, NEUTRAL, type AiLevel } from '../../../src/games/durak/ai';
import { cardCode, sameCard, type Card } from '../../../src/games/durak/rules/cards';
import { actor, apply, legalActions } from '../../../src/games/durak/rules/engine';
import { newGame } from '../../../src/games/durak/rules/setup';
import type { DurakState } from '../../../src/games/durak/rules/state';
import { projectView } from '../../../src/games/durak/view';
import { playMatch, scoreA } from './match';

const LEVELS: AiLevel[] = ['easy', 'normal', 'hard'];

/** Состояние посреди партии: случайные законные ходы от раздачи. */
function midGame(seed: number, steps: number): DurakState {
  let s = newGame(createRng(seed));
  let rng: RngState = createRng(seed + 99);
  for (let i = 0; i < steps && s.phase !== 'gameOver'; i++) {
    const opts = legalActions(s, actor(s)!);
    const [k, next] = nextInt(rng, opts.length);
    rng = next;
    const r = apply(s, opts[k]!);
    if (r.ok) s = r.state;
  }
  return s;
}

/**
 * Другое «настоящее» состояние с той же проекцией для места seat: неизвестные этому месту карты
 * (неизвестная часть руки соперника и закрытая часть колоды) перемешаны между собой.
 */
function reshuffleHidden(s: DurakState, seat: 0 | 1, seed: number): DurakState {
  const opp = seat === 0 ? 1 : 0;
  const known = s.knowledge.knownInHand[opp];
  const unknownOpp = s.hands[opp].filter((c) => !known.some((k) => sameCard(k, c)));
  const closedDeck = s.deck.length > 0 ? s.deck.slice(0, -1) : [];
  const pool = [...unknownOpp, ...closedDeck];
  const [mixed] = shuffle(createRng(seed), pool);
  const newOpp = [...s.hands[opp].filter((c) => known.some((k) => sameCard(k, c))), ...mixed.slice(0, unknownOpp.length)];
  const deck = s.deck.length > 0 ? [...mixed.slice(unknownOpp.length), s.deck[s.deck.length - 1]!] : [];
  const hands: [Card[], Card[]] = [[...s.hands[0]], [...s.hands[1]]];
  hands[opp] = newOpp;
  return { ...s, hands, deck, rng: createRng(seed + 1) };
}

const hiddenCodes = (s: DurakState, seat: 0 | 1): string[] => {
  const opp = seat === 0 ? 1 : 0;
  const known = s.knowledge.knownInHand[opp];
  const unknownOpp = s.hands[opp].filter((c) => !known.some((k) => sameCard(k, c)));
  return [...unknownOpp, ...(s.deck.length > 0 ? s.deck.slice(0, -1) : [])].map(cardCode);
};

describe('PlayerView: проекция без скрытых данных', () => {
  it('в проекции нет ни одной скрытой карты соперника и закрытой колоды', () => {
    for (let seed = 0; seed < 300; seed++) {
      const s = midGame(seed, seed % 40);
      for (const seat of [0, 1] as const) {
        const v = projectView(s, seat);
        const visible = new Set([...v.hand, ...v.opponentKnown, ...v.myKnown, ...v.discard, v.trumpCard, ...v.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack]))].map(cardCode));
        for (const h of hiddenCodes(s, seat)) expect(visible.has(h)).toBe(false);
        expect(Object.keys(v)).not.toContain('deck');
        expect(Object.keys(v)).not.toContain('hands');
        expect(Object.keys(v)).not.toContain('rng');
      }
    }
  });

  it('проекция не держит ссылок на объекты полного состояния', () => {
    const s = midGame(5, 10);
    const v = projectView(s, 0);
    expect(v.hand[0]).not.toBe(s.hands[0][0]);
    expect(v.trumpCard).not.toBe(s.trumpCard);
  });

  it('другая раскладка скрытых карт даёт ту же проекцию', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = midGame(seed, seed % 30);
      const seat = (seed % 2) as 0 | 1;
      const alt = reshuffleHidden(s, seat, seed + 500);
      expect(projectView(alt, seat)).toEqual(projectView(s, seat));
    }
  });
});

describe('ИИ: честность — решение не зависит от скрытых карт', () => {
  for (const level of LEVELS) {
    it(`уровень ${level}: одинаковая проекция → одинаковое решение`, () => {
      const n = level === 'hard' ? 40 : 300;
      let differentHidden = 0;
      for (let seed = 0; seed < n; seed++) {
        const s = midGame(seed, (seed * 3) % 50);
        if (s.phase === 'gameOver') continue;
        const seat = actor(s)!;
        const alt = reshuffleHidden(s, seat, seed + 1000);
        if (hiddenCodes(alt, seat).join() !== hiddenCodes(s, seat).join()) differentHidden++;
        const aiRng = createRng(seed + 7);
        const a = decide(projectView(s, seat), level, AGATA, aiRng);
        const b = decide(projectView(alt, seat), level, AGATA, aiRng);
        expect(b).toEqual(a);
      }
      // Проверка не вырождена: скрытые карты действительно отличались.
      expect(differentHidden).toBeGreaterThan(n / 2);
    }, 60_000);
  }
});

describe('ИИ: законность, завершение и воспроизводимость', () => {
  it('все уровни играют только законными ходами и доводят партию до конца', () => {
    for (let g = 0; g < 60; g++) {
      const a = LEVELS[g % 3]!;
      const b = LEVELS[(g + 1) % 3]!;
      expect(() => playMatch(g, [{ level: a, personality: AGATA }, { level: b }])).not.toThrow();
    }
  }, 60_000);

  it('одинаковый ГСЧ ИИ и проекция → одинаковое решение', () => {
    const s = midGame(11, 7);
    const seat = actor(s)!;
    for (const level of LEVELS) expect(decide(projectView(s, seat), level, NEUTRAL, createRng(3))).toEqual(decide(projectView(s, seat), level, NEUTRAL, createRng(3)));
  });

  it('партия ИИ против ИИ воспроизводима по seed', () => {
    expect(playMatch(77, [{ level: 'hard' }, { level: 'easy' }])).toEqual(playMatch(77, [{ level: 'hard' }, { level: 'easy' }]));
  });

});

describe('ИИ: уровни реально различаются по силе', () => {
  it('средний уверенно обыгрывает лёгкого', () => {
    expect(scoreA({ level: 'normal' }, { level: 'easy' }, 400)).toBeGreaterThan(0.6);
  }, 60_000);
  it('сильный обыгрывает среднего', () => {
    expect(scoreA({ level: 'hard' }, { level: 'normal' }, 40, 1000)).toBeGreaterThan(0.6);
  }, 120_000);
});
