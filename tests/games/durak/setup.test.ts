import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/core/rng';
import { cardCode, createDeck, parseCard, parseCards, type Card } from '../../../src/games/durak/rules/cards';
import { chooseFirstAttacker, deal, defenderOf, newGame } from '../../../src/games/durak/rules/setup';
import type { DurakState } from '../../../src/games/durak/rules/state';

const codes = (cards: readonly Card[]) => cards.map(cardCode);
const allCards = (s: DurakState) => [...s.hands[0], ...s.hands[1], ...s.deck, ...s.discard, ...s.table.flatMap((p) => (p.defense ? [p.attack, p.defense] : [p.attack]))];
const noTrumpsDealt = (seed: number) => {
  const d = deal(createRng(seed));
  return ![...d.hands[0], ...d.hands[1]].some((c) => c.suit === d.trumpCard.suit);
};

describe('раздача', () => {
  it('по 6 карт, 24 в колоде, козырь — последняя карта колоды', () => {
    const d = deal(createRng(1));
    expect(d.hands[0]).toHaveLength(6);
    expect(d.hands[1]).toHaveLength(6);
    expect(d.deck).toHaveLength(24);
    expect(d.deck[d.deck.length - 1]).toEqual(d.trumpCard);
  });

  it('все 36 карт на месте и без повторов', () => {
    for (let seed = 0; seed < 200; seed++) {
      const d = deal(createRng(seed));
      const all = codes([...d.hands[0], ...d.hands[1], ...d.deck]);
      expect(new Set(all).size).toBe(36);
      expect([...all].sort()).toEqual(codes(createDeck()).sort());
    }
  });

  it('детерминирована по seed и не мутирует ГСЧ', () => {
    const rng = createRng(42);
    const before = JSON.stringify(rng);
    expect(deal(rng)).toEqual(deal(createRng(42)));
    expect(JSON.stringify(rng)).toBe(before);
    expect(deal(createRng(1)).hands).not.toEqual(deal(createRng(2)).hands);
  });

  it('возвращает продвинутый ГСЧ', () => {
    const rng = createRng(5);
    expect(deal(rng).rng).not.toEqual(rng);
  });
});

describe('первый атакующий', () => {
  const first = { previousResult: null };

  it('первая партия: ходит владелец младшего козыря', () => {
    expect(chooseFirstAttacker([parseCards('9H 7S'), parseCards('6H AS')], 'H', first)).toEqual({ seat: 1, reason: { kind: 'lowestTrump', card: parseCard('6H') } });
    expect(chooseFirstAttacker([parseCards('7C KD'), parseCards('8C 6D')], 'C', first)).toEqual({ seat: 0, reason: { kind: 'lowestTrump', card: parseCard('7C') } });
  });

  it('козырь только у одного игрока', () => {
    expect(chooseFirstAttacker([parseCards('9S 7S'), parseCards('AH')], 'H', first)?.seat).toBe(1);
    expect(chooseFirstAttacker([parseCards('AH'), parseCards('9S 7S')], 'H', first)?.seat).toBe(0);
  });

  it('ни у кого нет козырей — null (пересдача)', () => {
    expect(chooseFirstAttacker([parseCards('9S 7S'), parseCards('AC 6D')], 'H', first)).toBeNull();
  });

  it('открытый козырь под колодой не учитывается', () => {
    // Раздача, где под колодой лежит козырная шестёрка: первым ходит младший козырь из рук (7 и выше).
    const seed = Array.from({ length: 2000 }, (_, i) => i).find((x) => deal(createRng(x)).trumpCard.rank === 6 && !noTrumpsDealt(x));
    expect(seed).toBeDefined();
    const s = newGame(createRng(seed as number));
    expect(s.trumpCard.rank).toBe(6);
    expect(s.firstAttackerReason.kind).toBe('lowestTrump');
    if (s.firstAttackerReason.kind === 'lowestTrump') {
      expect(s.firstAttackerReason.card.rank).toBeGreaterThan(6);
      expect(s.firstAttackerReason.card.suit).toBe(s.trumpSuit);
    }
  });

  it('следующая партия серии: ходит победитель («под дурака») даже без козырей', () => {
    expect(chooseFirstAttacker([parseCards('6H'), parseCards('AS')], 'H', { previousResult: { winner: 1 } })).toEqual({ seat: 1, reason: { kind: 'previousWinner' } });
    expect(chooseFirstAttacker([parseCards('9S'), parseCards('AC')], 'H', { previousResult: { winner: 0 } })).toEqual({ seat: 0, reason: { kind: 'previousWinner' } });
  });

  it('после ничьей — снова младший козырь', () => {
    expect(chooseFirstAttacker([parseCards('9H'), parseCards('6H')], 'H', { previousResult: { draw: true } })?.seat).toBe(1);
  });
});

describe('новая партия', () => {
  it('начальное состояние согласовано', () => {
    const s = newGame(createRng(7));
    expect(s.phase).toBe('attack');
    expect(s.firstBout).toBe(true);
    expect(s.table).toEqual([]);
    expect(s.discard).toEqual([]);
    expect(s.result).toBeNull();
    expect(s.trumpSuit).toBe(s.trumpCard.suit);
    expect(defenderOf(s)).toBe(s.attacker === 0 ? 1 : 0);
    expect(new Set(codes(allCards(s))).size).toBe(36);
  });

  it('показанный младший козырь известен обоим и действительно в руке атакующего', () => {
    for (let seed = 0; seed < 300; seed++) {
      const s = newGame(createRng(seed));
      expect(s.firstAttackerReason.kind).toBe('lowestTrump');
      if (s.firstAttackerReason.kind !== 'lowestTrump') continue;
      const shown = s.firstAttackerReason.card;
      expect(s.knowledge.knownInHand[s.attacker]).toEqual([shown]);
      expect(s.knowledge.knownInHand[defenderOf(s)]).toEqual([]);
      expect(codes(s.hands[s.attacker])).toContain(cardCode(shown));
      // У защитника нет козыря младше показанного.
      expect(s.hands[defenderOf(s)].some((c) => c.suit === s.trumpSuit && c.rank < shown.rank)).toBe(false);
    }
  });

  it('пересдача, если ни у кого нет козырей', () => {
    const seed = Array.from({ length: 5000 }, (_, i) => i).find(noTrumpsDealt);
    expect(seed).toBeDefined();
    const s = newGame(createRng(seed as number));
    expect(s.redeals).toBeGreaterThanOrEqual(1);
    expect([...s.hands[0], ...s.hands[1]].some((c) => c.suit === s.trumpSuit)).toBe(true);
    expect(newGame(createRng(seed as number))).toEqual(s);
  });

  it('под дурака: без пересдачи и без раскрытых карт', () => {
    const seed = Array.from({ length: 5000 }, (_, i) => i).find(noTrumpsDealt) as number;
    const s = newGame(createRng(seed), { previousResult: { winner: 1 } });
    expect(s.attacker).toBe(1);
    expect(s.redeals).toBe(0);
    expect(s.firstAttackerReason).toEqual({ kind: 'previousWinner' });
    expect(s.knowledge.knownInHand).toEqual([[], []]);
  });

  it('частота пересдач близка к теоретическим ≈2,1%, места атакуют поровну', () => {
    const n = 20_000;
    let redeals = 0;
    let seat0 = 0;
    for (let seed = 0; seed < n; seed++) {
      if (noTrumpsDealt(seed)) redeals++;
      if (newGame(createRng(seed)).attacker === 0) seat0++;
    }
    expect(redeals / n).toBeGreaterThan(0.015);
    expect(redeals / n).toBeLessThan(0.027);
    expect(Math.abs(seat0 / n - 0.5)).toBeLessThan(0.02);
  });
});
