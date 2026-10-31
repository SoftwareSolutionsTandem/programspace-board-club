import { describe, expect, it } from 'vitest';
import { parseCards } from '../../../src/games/durak/rules/cards';
import type { DurakEvent } from '../../../src/games/durak/rules/engine';
import { reactionFor } from '../../../src/games/durak/reactions';
import type { PlayerView } from '../../../src/games/durak/view';

const A = 1; // место персонажа
describe('реакции на события партии', () => {
  it('результат партии важнее всего и звучит всегда', () => {
    const ev: DurakEvent[] = [{ type: 'took', seat: 0, cards: parseCards('9S') }, { type: 'gameOver', result: { winner: 1 } }];
    expect(reactionFor(ev, A)).toMatchObject({ category: 'win', priority: 'result', chance: 1, pose: 'victory' });
    expect(reactionFor([{ type: 'gameOver', result: { winner: 0 } }], A)).toMatchObject({ category: 'lose', emotion: 'sad' });
    expect(reactionFor([{ type: 'gameOver', result: { draw: true } }], A)).toMatchObject({ category: 'draw' });
  });
  it('взятие: своё — досада и поза, чужое — смех', () => {
    expect(reactionFor([{ type: 'took', seat: 1, cards: [] }], A)).toMatchObject({ category: 'took', emotion: 'annoyed', pose: 'took' });
    expect(reactionFor([{ type: 'took', seat: 0, cards: [] }], A)).toMatchObject({ category: 'playerTook', emotion: 'laugh' });
  });
  it('козырь: свой — азарт, игрока — удивление', () => {
    const c = parseCards('9S AH');
    expect(reactionFor([{ type: 'defended', seat: 1, attack: c[0]!, card: c[1]!, withTrump: true }], A)).toMatchObject({ category: 'beatTrump' });
    expect(reactionFor([{ type: 'defended', seat: 0, attack: c[0]!, card: c[1]!, withTrump: true }], A)).toMatchObject({ category: 'playerTrump', emotion: 'surprise' });
  });
  it('подкидывание вдогонку и обычное', () => {
    expect(reactionFor([{ type: 'thrownIn', seat: 1, cards: [], afterTake: true }], A)).toMatchObject({ category: 'throwInAfterTake' });
    expect(reactionFor([{ type: 'thrownIn', seat: 1, cards: [], afterTake: false }], A)).toMatchObject({ category: 'throwIn' });
    // Игрок подкинул Агате ещё карту — короткое «Ах!».
    expect(reactionFor([{ type: 'thrownIn', seat: 0, cards: [], afterTake: false }], A)).toMatchObject({ category: 'nvAh', emotion: 'surprise' });
  });
  it('взятие по числу карт: одна — вздох или смешок, полный веер игрока — отдельные слова; запасные категории', () => {
    expect(reactionFor([{ type: 'took', seat: 1, cards: parseCards('9S') }], A)).toMatchObject({ category: 'nvSigh', fallback: 'took', pose: 'took' });
    expect(reactionFor([{ type: 'took', seat: 1, cards: parseCards('9S 10S') }], A)).toMatchObject({ category: 'took' });
    expect(reactionFor([{ type: 'took', seat: 0, cards: parseCards('9S') }], A)).toMatchObject({ category: 'nvGiggle', fallback: 'playerTook' });
    expect(reactionFor([{ type: 'took', seat: 0, cards: parseCards('9S 10S') }], A)).toMatchObject({ category: 'playerTook' });
    expect(reactionFor([{ type: 'took', seat: 0, cards: parseCards('6S 7S 8S 9S') }], A)).toMatchObject({ category: 'playerTookMany', fallback: 'playerTook' });
  });
  it('козырь из-под колоды: кто вытянул — своя реакция, запасная — «колода пуста»', () => {
    const ev = (seat: 0 | 1): DurakEvent[] => [{ type: 'drew', seat, cards: parseCards('9H'), trumpTaken: true }, { type: 'deckEmpty' }];
    expect(reactionFor(ev(1), A)).toMatchObject({ category: 'trumpTaken', fallback: 'deckEmpty' });
    expect(reactionFor(ev(0), A)).toMatchObject({ category: 'playerTrumpTaken', fallback: 'deckEmpty' });
  });
  it('последняя карта при пустой колоде — только тому, кто сейчас походил', () => {
    const c = parseCards('9S 10S');
    const view = (opp: number, mine: number, deckCount = 0) => ({ seat: 0, hand: parseCards('6H 7H 8H 9H JH QH').slice(0, mine), opponentHandCount: opp, deckCount, result: null }) as unknown as PlayerView;
    const agataAttacks: DurakEvent[] = [{ type: 'attacked', seat: 1, cards: [c[0]!] }];
    const playerDefends: DurakEvent[] = [{ type: 'defended', seat: 0, attack: c[0]!, card: c[1]!, withTrump: false }];
    expect(reactionFor(agataAttacks, A, view(1, 4))).toMatchObject({ category: 'lastCard' });
    expect(reactionFor(playerDefends, A, view(3, 1))).toMatchObject({ category: 'playerLastCard', gesture: 'throwUpHands' });
    // В колоде ещё есть карты — не «последняя»; походил не тот, у кого одна, — обычная реакция.
    expect(reactionFor(agataAttacks, A, view(1, 4, 5))?.category).toBe('attack');
    expect(reactionFor(playerDefends, A, view(1, 3))?.category).not.toBe('lastCard');
  });
  it('бито: игрок отбил атаку Агаты — похвала или «бито»; Агата отбилась — довольна', () => {
    expect(reactionFor([{ type: 'bito', attacker: 1, cards: parseCards('6S 7S 8S 9S') }], A)).toMatchObject({ category: 'praise' });
    expect(reactionFor([{ type: 'bito', attacker: 1, cards: parseCards('6S 7S') }], A)).toMatchObject({ category: 'bito' });
    expect(reactionFor([{ type: 'bito', attacker: 0, cards: parseCards('6S 7S') }], A)).toMatchObject({ category: 'defended' });
  });
  it('пустая колода и служебные события', () => {
    expect(reactionFor([{ type: 'drew', seat: 0, cards: [], trumpTaken: false }, { type: 'deckEmpty' }], A)).toMatchObject({ category: 'deckEmpty' });
    expect(reactionFor([{ type: 'boutStarted', attacker: 0, limit: 6 }], A)).toBeNull();
  });
});
