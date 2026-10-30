// Реакции Харитона на события шахматной партии (docs/games/chess.md §8): событие → эмоция, жест, реплика.
// Чистая функция: решает «что показать и сказать», воспроизводит сеанс (src/board/session.ts).
import type { ReactionContext } from '../../board/session';
import type { Trigger } from '../../characters/director';
import { colorOf, kindOf, type Board } from './rules/board';
import type { ChessEvent } from './rules/engine';
import type { PlayerView } from './view';

/** Порог перевеса (в пешках), после которого Харитон замечает, что он впереди или позади. */
export const LEAD_NOTICE = 3;

const PIECE_VALUE: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };

/** Эндшпиль: ферзей нет, и у каждой стороны фигур (без пешек) не больше чем на 8 пешек. */
export function isEndgame(board: Board): boolean {
  const side = { w: 0, b: 0 };
  for (const p of board) {
    if (!p) continue;
    const k = kindOf(p);
    if (k === 'q') return false;
    side[colorOf(p)] += PIECE_VALUE[k] ?? 0;
  }
  return side.w <= 8 && side.b <= 8;
}

export function reactionFor(ctx: ReactionContext<ChessEvent, PlayerView>): Trigger | null {
  const moved = ctx.events.find((e) => e.type === 'moved');
  if (!moved || moved.type !== 'moved') return null;
  // Итог партии озвучивает сеанс (win / lose / draw).
  if (ctx.events.some((e) => e.type === 'gameOver')) return null;
  const crossed = (k: number) => ctx.leadBefore < k && ctx.leadAfter >= k;
  const fell = (k: number) => ctx.leadBefore > -k && ctx.leadAfter <= -k;
  const bigCapture = moved.captured !== null && 'qr'.includes(moved.captured.toLowerCase());
  // Реплики о превращении говорят о ферзе: превращение в коня, слона или ладью их не вызывает.
  const queenPromotion = moved.promotion !== null && kindOf(moved.promotion) === 'q';
  const enteredEndgame = !isEndgame(ctx.before.board) && isEndgame(ctx.after.board);
  if (ctx.mover === 'opponent') {
    if (queenPromotion) return { category: 'promote', emotion: 'azart', gesture: 'eureka', priority: 'reaction', chance: 0.9 };
    if (moved.check) {
      const kind = kindOf(moved.piece);
      // Шах ферзём или конём — у Харитона на них отдельные слова.
      if (kind === 'q') return { category: 'checkQueen', emotion: 'azart', gesture: 'lecture', priority: 'reaction', chance: 0.75 };
      if (kind === 'n') return { category: 'checkKnight', emotion: 'azart', gesture: 'lecture', priority: 'reaction', chance: 0.75 };
      return { category: 'check', emotion: 'azart', gesture: 'lecture', priority: 'reaction', chance: 0.75 };
    }
    // Крупная добыча — ферзь или ладья: «эврика».
    if (bigCapture) return { category: 'eureka', emotion: 'azart', gesture: 'eureka', priority: 'reaction', chance: 0.85 };
    if (moved.castle) return { category: 'castle', emotion: 'warm', priority: 'reaction', chance: 0.55 };
    if (crossed(LEAD_NOTICE)) return { category: 'ahead', emotion: 'sly', gesture: 'satisfied', priority: 'reaction', chance: 0.6 };
    if (enteredEndgame) return { category: 'endgame', emotion: 'think', gesture: 'lecture', priority: 'reaction', chance: 0.8 };
    if (moved.captured) return { category: 'boardCapture', emotion: 'sly', priority: 'reaction', chance: 0.45 };
    // Тихий ход с перевесом — довольный смешок.
    if (ctx.leadAfter >= LEAD_NOTICE) return { category: 'nvGiggle', emotion: 'sly', priority: 'reaction', chance: 0.15 };
    return { category: 'boardMove', emotion: 'think', priority: 'reaction', chance: 0.18 };
  }
  // Ход игрока.
  if (queenPromotion) return { category: 'playerPromote', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.9 };
  if (moved.check && bigCapture) return { category: 'praise', emotion: 'surprise', gesture: 'applause', priority: 'reaction', chance: 0.9 };
  if (moved.check) return { category: 'inCheck', emotion: 'surprise', gesture: 'surprised', priority: 'reaction', chance: 0.75 };
  if (fell(LEAD_NOTICE)) return { category: 'behind', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.6 };
  if (bigCapture) return { category: 'boardLostPiece', emotion: 'annoyed', gesture: 'facepalm', priority: 'reaction', chance: 0.8 };
  if (enteredEndgame) return { category: 'endgame', emotion: 'think', gesture: 'lecture', priority: 'reaction', chance: 0.8 };
  // Отдал пешку — короткое «ах», лёгкую фигуру — досада покачиванием головы.
  if (moved.captured && kindOf(moved.captured) === 'p') return { category: 'nvAh', emotion: 'surprise', priority: 'reaction', chance: 0.35 };
  if (moved.captured) return { category: 'boardLostPiece', emotion: 'surprise', gesture: 'shakeHead', priority: 'reaction', chance: 0.5 };
  if (moved.castle) return { category: 'playerCastle', emotion: 'warm', priority: 'reaction', chance: 0.4 };
  // Первый ход игрока в партии — комментарий к дебюту.
  if (ctx.ply <= 2) return { category: 'opening', emotion: 'warm', gesture: 'watchMove', priority: 'reaction', chance: 0.6 };
  // Тихий ход, когда Харитон уступает, — вздох.
  if (ctx.leadAfter <= -LEAD_NOTICE) return { category: 'nvSigh', emotion: 'sad', priority: 'reaction', chance: 0.15 };
  return { category: 'playerPlay', emotion: 'think', gesture: 'watchMove', priority: 'reaction', chance: 0.12 };
}
