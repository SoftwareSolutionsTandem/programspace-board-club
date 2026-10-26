// Шашки как игровой модуль приложения (src/app/game.ts): Костян, доска во взгляде сверху-сбоку (2,5D).
import type { GameAssets, GameModule } from '../../app/game';
import type { BoardBank } from '../../board/scene';
import { BoardSession } from '../../board/session';
import { buildBoardTextures, destroyBoardTextures } from '../../board/textures';
import { KOSTYAN_ART } from '../../characters/kostyan/art';
import { KOSTYAN_LINES } from '../../characters/kostyan/lines';
import { KOSTYAN_PUPPET } from '../../characters/kostyan/puppet';
import { computeBoardLayout, type BoardLayout } from '../../layout/board';
import { MAN_W, PIECES, pieceInfo, pieceKey, pieceSvg } from './scene/pieceArt';
import { CHECKERS_SPEC } from './spec';

export interface CheckersAssets extends GameAssets {
  readonly bank: BoardBank;
}

const ART = PIECES.map((p) => ({ key: pieceKey(p), svg: pieceSvg(p), info: pieceInfo() }));

export const CHECKERS_GAME: GameModule = {
  id: 'checkers',
  character: { id: 'kostyan', art: KOSTYAN_ART, lines: KOSTYAN_LINES, nameKey: 'opp.kostyan', descKey: 'opp.kostyan.desc', genKey: 'opp.kostyan.gen', metKey: 'metKostyan' },
  titleKey: 'club.checkers',
  descKey: 'club.checkers.desc',
  loadingKey: 'loading.checkers',
  rulesTitleKey: 'chk.rules.title',
  rulesKeys: ['chk.rules.1', 'chk.rules.2', 'chk.rules.3', 'chk.rules.4', 'chk.rules.5', 'chk.rules.6'],
  tutorialKey: 'checkersTutorialDone',
  layout: (vp) => computeBoardLayout(vp, { pieceRise: 0.35 }),
  resolutions: (spec, d) => ({
    figure: Math.min(2.6, spec.character.scale * d),
    piece: Math.min(3, (((spec as BoardLayout).board.tileW * 0.78) / MAN_W) * d * 1.15),
    bg: Math.min(1, spec.background.scale * d),
  }),
  async buildAssets(res, onProgress) {
    const bank = await buildBoardTextures(KOSTYAN_PUPPET, ART, res.figure, res.piece, res.bg, onProgress);
    const assets: CheckersAssets = { bank, figureRes: res.figure, destroy: () => destroyBoardTextures(bank) };
    return assets;
  },
  createSession: (host, opts) => new BoardSession(host, opts, CHECKERS_SPEC, 'opp.kostyan'),
  tutorialSeed: (seed) => seed,
};
