// Связь событий партии с реакциями персонажа: какая эмоция, поза и категория реплики.
// Из пачки событий одного действия выбирается одна главная реакция.
import type { Trigger } from '../../characters/director';
import type { Seat } from './rules/cards';
import type { DurakEvent } from './rules/engine';

/** Чем выше, тем важнее реакция в одной пачке событий. */
const WEIGHT = { result: 100, take: 50, trump: 40, deck: 30, throw: 20, play: 10, bito: 5 } as const;

export function reactionFor(events: readonly DurakEvent[], characterSeat: Seat): Trigger | null {
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
        break;
      case 'defended':
        if (mine) offer(e.withTrump ? WEIGHT.trump : WEIGHT.play, e.withTrump
          ? { category: 'beatTrump', emotion: 'azart', pose: 'throw', priority: 'reaction', chance: 0.6 }
          : { category: 'defended', emotion: 'warm', pose: 'throw', priority: 'reaction', chance: 0.25 });
        else if (e.withTrump) offer(WEIGHT.trump, { category: 'playerTrump', emotion: 'surprise', priority: 'reaction', chance: 0.5 });
        break;
      case 'took':
        offer(WEIGHT.take, mine
          ? { category: 'took', emotion: 'annoyed', pose: 'took', priority: 'reaction', chance: 0.7 }
          : { category: 'playerTook', emotion: 'laugh', priority: 'reaction', chance: 0.7 });
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
        else offer(WEIGHT.result, { category: 'lose', emotion: 'sad', priority: 'result', chance: 1 });
        break;
      }
      default:
        break;
    }
  }
  return (best as { w: number; t: Trigger } | null)?.t ?? null;
}
