// Связь событий матча с реакциями Деда Матвея: эмоция, поза, жест и категория реплики (docs/games/dominoes.md §11).
// Из пачки событий одного действия выбирается одна главная реакция. Только открытые данные: события и проекция игрока.
// Реакция — следствие уже случившегося события: правила и ИИ о ней не знают, длительность жестов — забота сцены.
import type { Trigger } from '../../characters/director';
import { isDouble, type Seat } from './rules/bones';
import type { DominoEvent } from './rules/engine';
import type { PlayerView } from './view';

// «Взял из базара 4+ костей» (docs/games/dominoes.md §11): реакция — один раз, на четвёртой кости за ход.
const DREW_MANY = 4;
const WEIGHT = { result: 100, hand: 60, last: 45, block: 40, drewMany: 35, knock: 30, double: 20, drew: 15, empty: 12, play: 10, watch: 5 } as const;

/** view — проекция игрока после действия (что известно обоим, в том числе выводы о руках). */
export function reactionFor(events: readonly DominoEvent[], characterSeat: Seat, view: PlayerView): Trigger | null {
  let best: { w: number; t: Trigger } | null = null;
  const offer = (w: number, t: Trigger) => {
    if (!best || w > best.w) best = { w, t };
  };
  for (const e of events) {
    switch (e.type) {
      case 'firstMove':
        if (e.seat === characterSeat && e.reason === 'lowestDouble') offer(WEIGHT.double, { category: 'openDouble', emotion: 'warm', pose: 'throw', priority: 'reaction', chance: 0.6 });
        break;
      case 'played': {
        const mine = e.seat === characterSeat;
        if (mine && e.left === 1) offer(WEIGHT.last, { category: 'lastBone', emotion: 'sly', pose: 'throw', gesture: 'satisfied', priority: 'reaction', chance: 0.7 });
        else if (!mine && e.left === 1) offer(WEIGHT.last, { category: 'playerLastBone', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.6 });
        // «Закрыл число»: на обоих концах числа, которых у игрока, по открытым выводам, нет.
        else if (mine && e.ends.every((n) => view.myMissing.includes(n))) offer(WEIGHT.block, { category: 'block', emotion: 'sly', pose: 'throw', gesture: 'satisfied', priority: 'reaction', chance: 0.6 });
        // Дубль «шесть-шесть» — самая тяжёлая кость: редкая отдельная реплика.
        else if (mine && e.bone.hi === 6 && e.bone.lo === 6) offer(WEIGHT.double, { category: 'bigDouble', emotion: 'azart', pose: 'throw', priority: 'reaction', chance: 0.6 });
        else if (mine && isDouble(e.bone)) offer(WEIGHT.double, { category: 'playDouble', emotion: 'azart', pose: 'throw', priority: 'reaction', chance: 0.35 });
        else if (mine) offer(WEIGHT.play, { category: 'play', emotion: 'warm', pose: 'throw', priority: 'reaction', chance: 0.18 });
        // Ход соперника: проводит кость взглядом; изредка что-то скажет.
        else offer(WEIGHT.watch, { category: 'playerPlay', emotion: 'think', gesture: 'watchPlay', priority: 'reaction', chance: 0.12 });
        break;
      }
      case 'drew':
        if (e.seat === characterSeat) {
          if (e.drawnThisTurn === DREW_MANY) offer(WEIGHT.drewMany, { category: 'drewMany', emotion: 'annoyed', pose: 'took', gesture: 'grumble', priority: 'reaction', chance: 0.8 });
          else if (e.drawnThisTurn === 1) offer(WEIGHT.drew, { category: 'drew', emotion: 'think', pose: 'took', priority: 'reaction', chance: 0.35 });
        } else if (e.drawnThisTurn === DREW_MANY) offer(WEIGHT.drewMany, { category: 'playerDrewMany', emotion: 'sly', gesture: 'chuckle', priority: 'reaction', chance: 0.6 });
        else if (e.drawnThisTurn === 1) offer(WEIGHT.drew, { category: 'playerDrew', emotion: 'laugh', priority: 'reaction', chance: 0.35 });
        break;
      case 'bazaarEmpty':
        offer(WEIGHT.empty, { category: 'bazaarEmpty', emotion: 'think', priority: 'reaction', chance: 0.5 });
        break;
      case 'knocked':
        // Свой стук Матвей показывает сам (сцена: жест knock); на стук соперника — довольно посмеивается.
        offer(WEIGHT.knock, e.seat === characterSeat
          ? { category: 'knock', emotion: 'annoyed', priority: 'reaction', chance: 0.7 }
          : { category: 'playerKnock', emotion: 'sly', gesture: 'chuckle', priority: 'reaction', chance: 0.6 });
        break;
      case 'domino':
        offer(WEIGHT.hand, e.winner === characterSeat
          ? { category: 'handWin', emotion: 'laugh', gesture: 'handWin', priority: 'reaction', chance: 0.9 }
          : { category: 'handLose', emotion: 'sad', gesture: 'handLose', priority: 'reaction', chance: 0.9 });
        break;
      case 'fish':
        // «Рыба!» — шлепок по столу, если очки его; проиграл «рыбу» — ворчит; поровну — пожимает плечами.
        offer(WEIGHT.hand, e.winner === null
          ? { category: 'fishDraw', emotion: 'surprise', gesture: 'shrug', priority: 'reaction', chance: 1 }
          : e.winner === characterSeat
            ? { category: 'fish', emotion: 'azart', gesture: 'slap', priority: 'reaction', chance: 1 }
            : { category: 'fishLose', emotion: 'annoyed', gesture: 'grumble', priority: 'reaction', chance: 1 });
        break;
      case 'matchOver':
        offer(WEIGHT.result, e.winner === characterSeat
          ? { category: 'win', emotion: 'laugh', pose: 'victory', priority: 'result', chance: 1 }
          : { category: 'lose', emotion: 'warm', gesture: 'capTip', priority: 'result', chance: 1 });
        break;
      default:
        break;
    }
  }
  return (best as { w: number; t: Trigger } | null)?.t ?? null;
}
