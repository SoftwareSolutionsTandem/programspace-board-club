import { describe, expect, it } from 'vitest';
import { parseCards } from '../../../src/games/durak/rules/cards';
import type { DurakEvent } from '../../../src/games/durak/rules/engine';
import { reactionFor } from '../../../src/games/durak/reactions';

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
    expect(reactionFor([{ type: 'thrownIn', seat: 0, cards: [], afterTake: false }], A)).toBeNull();
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
