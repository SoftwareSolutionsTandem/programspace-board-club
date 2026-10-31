// Связь событий партии с реакциями персонажа: какая эмоция, поза и категория реплики.
// Из пачки событий одного действия выбирается одна главная реакция.
import type { Trigger } from '../../characters/director';
import type { Seat } from './rules/cards';
import type { DurakEvent } from './rules/engine';
import type { PlayerView } from './view';

/** Чем выше, тем важнее реакция в одной пачке событий. */
const WEIGHT = { result: 100, take: 50, last: 45, trump: 40, trumpTaken: 35, deck: 30, throw: 20, play: 10, bito: 5 } as const;
/** «Полный веер»: игрок забрал столько карт и больше — отдельные слова («Ого, сколько набрал!»). */
const TOOK_MANY = 4;

/**
 * view — проекция игрока после действия (открытые данные: число карт у соперника, остаток колоды).
 * Без неё реакции на «последнюю карту» не выбираются.
 */
export function reactionFor(events: readonly DurakEvent[], characterSeat: Seat, view?: PlayerView): Trigger | null {
  let best: { w: number; t: Trigger } | null = null;
  const offer = (w: number, t: Trigger) => {
    if (!best || w > best.w) best = { w, t };
  };
  for (const e of events) {
    const mine = 'seat' in e && e.seat === characterSeat;
    switch (e.type) {
      case 'attacked':
        if (mine) offer(WEIGHT.play, { category: 'attack', emotion: 'sly', pose: 'throw', priority: 'reaction', chance: 0.35 });
        else offer(WEIGHT.play, { category: 'nvHmm', emotion: 'think', priority: 'idle', chance: 0.15 });
        break;
      case 'thrownIn':
        if (mine) offer(WEIGHT.throw, e.afterTake
          ? { category: 'throwInAfterTake', emotion: 'laugh', pose: 'throw', priority: 'reaction', chance: 0.6 }
          : { category: 'throwIn', emotion: 'azart', pose: 'throw', priority: 'reaction', chance: 0.4 });
        // Игрок подкинул ей ещё карту — короткое «Ах!».
        else offer(WEIGHT.throw, { category: 'nvAh', emotion: 'surprise', priority: 'reaction', chance: 0.25 });
        break;
      case 'defended':
        if (mine) offer(e.withTrump ? WEIGHT.trump : WEIGHT.play, e.withTrump
          ? { category: 'beatTrump', emotion: 'azart', pose: 'throw', priority: 'reaction', chance: 0.6 }
          : { category: 'defended', emotion: 'warm', pose: 'throw', priority: 'reaction', chance: 0.25 });
        else if (e.withTrump) offer(WEIGHT.trump, { category: 'playerTrump', emotion: 'surprise', gesture: 'throwUpHands', priority: 'reaction', chance: 0.5 });
        break;
      case 'took':
        // Одна карта — без слов-жалоб: вздох (своя) или смешок (игрока); полный веер у игрока — «сколько набрал!».
        if (mine) offer(WEIGHT.take, e.cards.length === 1
          ? { category: 'nvSigh', emotion: 'annoyed', pose: 'took', priority: 'reaction', chance: 0.6, fallback: 'took' }
          : { category: 'took', emotion: 'annoyed', pose: 'took', priority: 'reaction', chance: 0.7 });
        else if (e.cards.length === 1) offer(WEIGHT.take, { category: 'nvGiggle', emotion: 'laugh', priority: 'reaction', chance: 0.6, fallback: 'playerTook' });
        else if (e.cards.length >= TOOK_MANY) offer(WEIGHT.take, { category: 'playerTookMany', emotion: 'laugh', priority: 'reaction', chance: 0.8, fallback: 'playerTook' });
        else offer(WEIGHT.take, { category: 'playerTook', emotion: 'laugh', priority: 'reaction', chance: 0.7 });
        break;
      case 'drew':
        // Открытый козырь лежит под колодой последним: кто его вытянул, тот добрал колоду до дна.
        if (e.trumpTaken) offer(WEIGHT.trumpTaken, mine
          ? { category: 'trumpTaken', emotion: 'sly', priority: 'reaction', chance: 0.7, fallback: 'deckEmpty' }
          : { category: 'playerTrumpTaken', emotion: 'surprise', priority: 'reaction', chance: 0.6, fallback: 'deckEmpty' });
        break;
      case 'bito':
        if (e.attacker === characterSeat) {
          // Игрок отбил всё: за большой отбой — похвала, за маленький — короткое «бито».
          offer(WEIGHT.bito, e.cards.length >= 4
            ? { category: 'praise', emotion: 'warm', priority: 'reaction', chance: 0.4 }
            : { category: 'bito', emotion: 'warm', priority: 'reaction', chance: 0.3 });
        } else {
          offer(WEIGHT.bito, { category: 'defended', emotion: 'azart', priority: 'reaction', chance: 0.3 });
        }
        break;
      case 'deckEmpty':
        offer(WEIGHT.deck, { category: 'deckEmpty', emotion: 'azart', priority: 'reaction', chance: 0.6 });
        break;
      case 'gameOver': {
        const r = e.result;
        if ('draw' in r) offer(WEIGHT.result, { category: 'draw', emotion: 'surprise', priority: 'result', chance: 1 });
        else if (r.winner === characterSeat) offer(WEIGHT.result, { category: 'win', emotion: 'laugh', pose: 'victory', priority: 'result', chance: 1 });
        else offer(WEIGHT.result, { category: 'lose', emotion: 'sad', gesture: 'sigh', priority: 'result', chance: 1 });
        break;
      }
      default:
        break;
    }
  }
  // Колода пуста, и после хода у кого-то осталась одна карта — только что, этим ходом этого игрока.
  if (view && view.deckCount === 0 && !view.result) {
    const played = (seat: Seat) => events.some((e) => (e.type === 'attacked' || e.type === 'defended' || e.type === 'thrownIn') && e.seat === seat);
    if (view.opponentHandCount === 1 && played(characterSeat)) offer(WEIGHT.last, { category: 'lastCard', emotion: 'sly', priority: 'reaction', chance: 0.7 });
    else if (view.hand.length === 1 && played(view.seat)) offer(WEIGHT.last, { category: 'playerLastCard', emotion: 'surprise', gesture: 'throwUpHands', priority: 'reaction', chance: 0.6 });
  }
  return (best as { w: number; t: Trigger } | null)?.t ?? null;
}
