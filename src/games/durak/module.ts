// Подкидной дурак как игровой модуль приложения (src/app/game.ts): Агата, карты, компоновка «напротив через стол».
import type { GameAssets, GameModule } from '../../app/game';
import { AGATA_ART } from '../../characters/agata/art';
import { AGATA_LINES } from '../../characters/agata/lines';
import { computeLayout } from '../../layout/layout';
import { GameSession, tutorialSeed } from './session';
import { buildTextures, destroyTextures, type TextureBank } from './scene/textures';

export interface DurakAssets extends GameAssets {
  readonly bank: TextureBank;
}

export const DURAK_GAME: GameModule = {
  id: 'durak',
  character: { id: 'agata', art: AGATA_ART, lines: AGATA_LINES, nameKey: 'opp.agata', descKey: 'opp.agata.desc', genKey: 'opp.agata.gen', metKey: 'metAgata' },
  titleKey: 'club.durak',
  descKey: 'club.durak.desc',
  loadingKey: 'loading.title',
  rulesTitleKey: 'rules.title',
  rulesKeys: ['rules.1', 'rules.2', 'rules.3', 'rules.4', 'rules.5'],
  tutorialKey: 'tutorialDone',
  layout: computeLayout,
  resolutions: (spec, d) => ({
    figure: Math.min(2.6, spec.character.scale * d),
    piece: Math.min(5, (Math.max(spec.hand.cardW, spec.tableCard.w) / 48) * d),
    bg: Math.min(1, spec.background.scale * d),
  }),
  async buildAssets(res, onProgress) {
    const bank = await buildTextures(res.figure, res.piece, res.bg, onProgress);
    const assets: DurakAssets = { bank, figureRes: res.figure, destroy: () => destroyTextures(bank) };
    return assets;
  },
  createSession: (host, opts) => new GameSession(host, opts),
  tutorialSeed,
};
