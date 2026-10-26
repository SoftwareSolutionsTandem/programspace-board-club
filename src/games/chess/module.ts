// Шахматы как игровой модуль приложения (src/app/game.ts): Харитон, доска во взгляде сверху-сбоку (2,5D).
import type { GameAssets, GameModule } from '../../app/game';
import type { BoardBank } from '../../board/scene';
import { BoardSession } from '../../board/session';
import { buildBoardTextures, destroyBoardTextures } from '../../board/textures';
import { KHARITON_ART } from '../../characters/khariton/art';
import { KHARITON_LINES } from '../../characters/khariton/lines';
import { KHARITON_PUPPET } from '../../characters/khariton/puppet';
import { computeBoardLayout, type BoardLayout } from '../../layout/board';
import { KINDS, pieceInfo, pieceKey, pieceSvg, PIECE_W } from './scene/pieceArt';
import { CHESS_SPEC } from './spec';

export interface ChessAssets extends GameAssets {
  readonly bank: BoardBank;
}

const PIECES = (['w', 'b'] as const).flatMap((c) => KINDS.map((k) => ({ key: pieceKey(c, k), svg: pieceSvg(c, k), info: pieceInfo(k) })));

export const CHESS_GAME: GameModule = {
  id: 'chess',
  character: { id: 'khariton', art: KHARITON_ART, lines: KHARITON_LINES, nameKey: 'opp.khariton', descKey: 'opp.khariton.desc', genKey: 'opp.khariton.gen', metKey: 'metKhariton' },
  titleKey: 'club.chess',
  descKey: 'club.chess.desc',
  loadingKey: 'loading.chess',
  rulesTitleKey: 'chess.rules.title',
  rulesKeys: ['chess.rules.1', 'chess.rules.2', 'chess.rules.3', 'chess.rules.4', 'chess.rules.5', 'chess.rules.6'],
  tutorialKey: 'chessTutorialDone',
  layout: (vp) => computeBoardLayout(vp, { pieceRise: 1 }),
  resolutions: (spec, d) => ({
    figure: Math.min(2.6, spec.character.scale * d),
    // Самая крупная фигура на доске — король: 0,82 клетки шириной.
    piece: Math.min(3, (((spec as BoardLayout).board.tileW * 0.82) / PIECE_W) * d * 1.15),
    bg: Math.min(1, spec.background.scale * d),
  }),
  async buildAssets(res, onProgress) {
    const bank = await buildBoardTextures(KHARITON_PUPPET, PIECES, res.figure, res.piece, res.bg, onProgress);
    const assets: ChessAssets = { bank, figureRes: res.figure, destroy: () => destroyBoardTextures(bank) };
    return assets;
  },
  createSession: (host, opts) => new BoardSession(host, opts, CHESS_SPEC, 'opp.khariton'),
  tutorialSeed: (seed) => seed,
};
