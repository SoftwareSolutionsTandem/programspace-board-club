// Домино как игровой модуль приложения (src/app/game.ts): Дед Матвей, кости, стол «напротив через стол».
import type { GameAssets, GameModule } from '../../app/game';
import { MATVEY_ART } from '../../characters/matvey/art';
import { MATVEY_LINES } from '../../characters/matvey/lines';
import { computeDominoLayout, type DominoLayout } from '../../layout/dominoes';
import { buildDominoTextures, destroyDominoTextures, type DominoTextureBank } from './scene/textures';
import { DominoSession, dominoTutorialSeed } from './session';

export interface DominoAssets extends GameAssets {
  readonly bank: DominoTextureBank;
}

export const DOMINOES_GAME: GameModule = {
  id: 'dominoes',
  character: { id: 'matvey', art: MATVEY_ART, lines: MATVEY_LINES, nameKey: 'opp.matvey', descKey: 'opp.matvey.desc', genKey: 'opp.matvey.gen', metKey: 'metMatvey' },
  titleKey: 'club.dominoes',
  descKey: 'club.dominoes.desc',
  loadingKey: 'loading.dominoes',
  rulesTitleKey: 'dom.rules.title',
  rulesKeys: ['dom.rules.1', 'dom.rules.2', 'dom.rules.3', 'dom.rules.4', 'dom.rules.5', 'dom.rules.6'],
  tutorialKey: 'dominoesTutorialDone',
  layout: computeDominoLayout,
  resolutions: (spec, d) => ({
    figure: Math.min(2.6, spec.character.scale * d),
    // Кость рисунка — 96 × 48; самая крупная на экране — в руке (2 × handHalf).
    piece: Math.min(4, (((spec as DominoLayout).domino.handHalf * 2) / 96) * d * 1.1),
    bg: Math.min(1, spec.background.scale * d),
  }),
  async buildAssets(res, onProgress) {
    const bank = await buildDominoTextures(res.figure, res.piece, res.bg, onProgress);
    const assets: DominoAssets = { bank, figureRes: res.figure, destroy: () => destroyDominoTextures(bank) };
    return assets;
  },
  createSession: (host, opts) => new DominoSession(host, opts),
  tutorialSeed: dominoTutorialSeed,
};
