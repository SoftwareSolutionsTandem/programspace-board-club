import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from '../../../src/core/rng';
import { cardCode, createDeck, lowestTrump, otherSeat, parseCard, parseCards, RANKS, SUITS } from '../../../src/games/durak/rules/cards';

describe('карты', () => {
  it('колода — 36 уникальных карт, по 9 каждой масти, достоинства 6…Т', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(36);
    expect(new Set(deck.map(cardCode)).size).toBe(36);
    for (const s of SUITS) expect(deck.filter((c) => c.suit === s).map((c) => c.rank)).toEqual([...RANKS]);
  });

  it('перемешивание сохраняет состав колоды и воспроизводимо', () => {
    const deck = createDeck();
    for (let seed = 0; seed < 100; seed++) {
      const [mixed] = shuffle(createRng(seed), deck);
      expect(mixed.map(cardCode).sort()).toEqual(deck.map(cardCode).sort());
      expect(shuffle(createRng(seed), deck)[0]).toEqual(mixed);
    }
    expect(deck).toEqual(createDeck());
  });

  it('запись карты обратима', () => {
    for (const c of createDeck()) expect(parseCard(cardCode(c))).toEqual(c);
    expect(parseCard('10H')).toEqual({ suit: 'H', rank: 10 });
    expect(parseCard('AS')).toEqual({ suit: 'S', rank: 14 });
  });

  it('неверная запись карты — ошибка', () => {
    for (const bad of ['', '5H', '1H', 'AX', 'H', '11S']) expect(() => parseCard(bad)).toThrow();
  });

  it('младший козырь', () => {
    expect(lowestTrump(parseCards('9H 7S 6H AH'), 'H')).toEqual(parseCard('6H'));
    expect(lowestTrump(parseCards('9H 7S'), 'S')).toEqual(parseCard('7S'));
    expect(lowestTrump(parseCards('9H 7S'), 'C')).toBeNull();
    expect(lowestTrump([], 'C')).toBeNull();
  });

  it('другое место', () => {
    expect(otherSeat(0)).toBe(1);
    expect(otherSeat(1)).toBe(0);
  });
});
