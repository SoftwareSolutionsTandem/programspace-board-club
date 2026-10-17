// Карты подкидного дурака: 36 карт, масти ♠ ♣ ♦ ♥, достоинства 6…Т (docs/games/durak.md §1).

export const SUITS = ['S', 'C', 'D', 'H'] as const;
export type Suit = (typeof SUITS)[number];

/** В=11, Д=12, К=13, Т=14. */
export const RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly suit: Suit;
  readonly rank: Rank;
}

export type Seat = 0 | 1;
export const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Колода в каноническом порядке (до тасовки). */
export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

export const sameCard = (a: Card, b: Card): boolean => a.suit === b.suit && a.rank === b.rank;

const RANK_LABELS: Readonly<Record<Rank, string>> = { 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

/** Короткая запись для журналов и тестов: «9H», «10S», «AC». */
export function cardCode(card: Card): string {
  return `${RANK_LABELS[card.rank]}${card.suit}`;
}

/** Обратное к cardCode; бросает ошибку на неверной записи. */
export function parseCard(code: string): Card {
  const suit = code.slice(-1) as Suit;
  const label = code.slice(0, -1);
  const rank = RANKS.find((r) => RANK_LABELS[r] === label);
  if (!SUITS.includes(suit) || rank === undefined) throw new Error(`Неверная запись карты: «${code}»`);
  return { suit, rank };
}

export const parseCards = (codes: string): Card[] => codes.split(/\s+/).filter(Boolean).map(parseCard);

/** Младший козырь в наборе карт или null, если козырей нет. */
export function lowestTrump(cards: readonly Card[], trumpSuit: Suit): Card | null {
  let best: Card | null = null;
  for (const c of cards) if (c.suit === trumpSuit && (best === null || c.rank < best.rank)) best = c;
  return best;
}

/** Бьёт ли карта defense карту attack при козырной масти trump (§4.2). */
export function beats(attack: Card, defense: Card, trump: Suit): boolean {
  if (defense.suit === attack.suit) return defense.rank > attack.rank;
  return defense.suit === trump && attack.suit !== trump;
}
