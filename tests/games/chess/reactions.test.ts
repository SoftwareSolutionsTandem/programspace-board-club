// Реакции Харитона (docs/voice/khariton-script.md): шах ферзём и конём, «эврика», эндшпиль, дебют, междометия.
import { describe, expect, it } from 'vitest';
import { resultCategory, type ReactionContext } from '../../../src/board/session';
import { KHARITON_LINES } from '../../../src/characters/khariton/lines';
import { isEndgame, reactionFor } from '../../../src/games/chess/reactions';
import { parseFen, START_FEN, type Piece } from '../../../src/games/chess/rules/board';
import type { ChessEvent } from '../../../src/games/chess/rules/engine';
import type { Move } from '../../../src/games/chess/rules/movegen';
import type { PlayerView } from '../../../src/games/chess/view';

const view = (fen = START_FEN) => ({ color: 'w', board: parseFen(fen).board }) as unknown as PlayerView;
const moved = (piece: Piece, o: Partial<{ captured: Piece; check: boolean; promotion: Piece }> = {}): ChessEvent => ({
  type: 'moved', color: piece === piece.toUpperCase() ? 'w' : 'b', move: {} as Move, piece,
  captured: o.captured ?? null, captureSquare: null, castle: null, promotion: o.promotion ?? null, enPassant: false, check: o.check ?? false,
});
const ctx = (e: ChessEvent, mover: 'human' | 'opponent', o: Partial<ReactionContext<ChessEvent, PlayerView>> = {}): ReactionContext<ChessEvent, PlayerView> => ({
  events: [e], mover, before: view(), after: view(), leadBefore: 0, leadAfter: 0, ply: 10, ...o,
});
const cat = (c: ReactionContext<ChessEvent, PlayerView>) => reactionFor(c)?.category;

describe('реакции Харитона', () => {
  it('шах ферзём, конём и прочими фигурами — разные категории', () => {
    expect(cat(ctx(moved('q', { check: true }), 'opponent'))).toBe('checkQueen');
    expect(cat(ctx(moved('n', { check: true }), 'opponent'))).toBe('checkKnight');
    expect(cat(ctx(moved('r', { check: true }), 'opponent'))).toBe('check');
  });

  it('взял ферзя или ладью — «эврика», лёгкую фигуру — обычное взятие', () => {
    expect(reactionFor(ctx(moved('b', { captured: 'R' }), 'opponent'))).toMatchObject({ category: 'eureka', gesture: 'eureka' });
    expect(cat(ctx(moved('b', { captured: 'Q' }), 'opponent'))).toBe('eureka');
    expect(cat(ctx(moved('b', { captured: 'N' }), 'opponent'))).toBe('boardCapture');
  });

  it('эндшпиль: замечает переход, но не каждый ход в нём', () => {
    expect(isEndgame(parseFen(START_FEN).board)).toBe(false);
    const before = view('rb2k3/8/8/8/8/8/8/RNB1K3 w - - 0 1');
    const after = view('r3k3/8/8/8/8/8/8/RbB1K3 w - - 0 1');
    expect(isEndgame(before.board)).toBe(false);
    expect(isEndgame(after.board)).toBe(true);
    expect(cat(ctx(moved('b', { captured: 'N' }), 'opponent', { before, after }))).toBe('endgame');
    expect(cat(ctx(moved('k'), 'opponent', { before: after, after }))).toBe('boardMove');
  });

  it('первый ход игрока — дебют; дальше — обычное наблюдение', () => {
    expect(cat(ctx(moved('P'), 'human', { ply: 1 }))).toBe('opening');
    expect(cat(ctx(moved('P'), 'human', { ply: 2 }))).toBe('opening');
    expect(cat(ctx(moved('P'), 'human', { ply: 5 }))).toBe('playerPlay');
  });

  it('междометия: «ах» на взятую пешку, смешок при перевесе, вздох при отставании', () => {
    expect(cat(ctx(moved('P', { captured: 'p' }), 'human'))).toBe('nvAh');
    expect(cat(ctx(moved('N', { captured: 'b' }), 'human'))).toBe('boardLostPiece');
    expect(cat(ctx(moved('n'), 'opponent', { leadBefore: 4, leadAfter: 4 }))).toBe('nvGiggle');
    expect(cat(ctx(moved('N'), 'human', { leadBefore: -4, leadAfter: -4 }))).toBe('nvSigh');
  });

  it('итог партии реакция не озвучивает', () => {
    const c = ctx(moved('q', { check: true }), 'opponent');
    expect(reactionFor({ ...c, events: [...c.events, { type: 'gameOver', result: {} as never }] })).toBeNull();
  });

  it('превращение: реплики о ферзе — только при превращении в ферзя', () => {
    expect(cat(ctx(moved('p', { promotion: 'q' }), 'opponent'))).toBe('promote');
    expect(cat(ctx(moved('P', { promotion: 'Q' }), 'human'))).toBe('playerPromote');
    expect(cat(ctx(moved('p', { promotion: 'n' }), 'opponent'))).not.toBe('promote');
    expect(cat(ctx(moved('P', { promotion: 'N' }), 'human'))).not.toBe('playerPromote');
    for (const l of KHARITON_LINES.filter((x) => x.category === 'promote' || x.category === 'playerPromote')) expect(l.text, l.id).toMatch(/ферз|пешка/i);
  });
});

describe('итог партии: слова Харитона соответствуют результату', () => {
  it('победа игрока — поражение Харитона, и наоборот; пат — свои слова', () => {
    expect(resultCategory(true, false, 'checkmate')).toBe('lose');
    expect(resultCategory(false, false, 'checkmate')).toBe('win');
    expect(resultCategory(false, true, 'stalemate')).toBe('stalemate');
    for (const r of ['repetition', 'fifty', 'material']) expect(resultCategory(false, true, r)).toBe('draw');
  });

  it('тексты: «пат» — только в категории пата, «мат» Харитона — только в его победе и поражении', () => {
    const of = (c: string) => KHARITON_LINES.filter((l) => l.category === c);
    for (const l of KHARITON_LINES) if (/(^|[^а-яё])пат([^а-яё]|$)/i.test(l.text)) expect(l.category, l.id).toBe('stalemate');
    expect(of('stalemate').length).toBeGreaterThan(0);
    for (const l of of('draw')) expect(l.text, l.id).not.toMatch(/мат|победа|браво/i);
    for (const l of of('win')) expect(l.text, l.id).not.toMatch(/браво|переиграли|поражени/i);
    for (const l of of('lose')) expect(l.text, l.id).not.toMatch(/благодарю за игру|моя победа/i);
  });
});
