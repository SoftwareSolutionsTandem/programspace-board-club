// Игры «Игротеки». Псевдоним @product-games указывает на src/products/<id>.games.ts (vite.config.ts),
// поэтому в сборку продукта попадают только его игры.
import type { GameModule } from '../app/game';
import { DOMINOES_GAME } from '../games/dominoes/module';
import { DURAK_GAME } from '../games/durak/module';

export const GAMES: readonly GameModule[] = [DURAK_GAME, DOMINOES_GAME];
