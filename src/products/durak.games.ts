// Игры продукта «Подкидной дурак» (см. src/products/igroteka.games.ts).
import type { GameModule } from '../app/game';
import { DURAK_GAME } from '../games/durak/module';

export const GAMES: readonly GameModule[] = [DURAK_GAME];
