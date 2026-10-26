// Игры продукта «Шашки» (см. src/products/igroteka.games.ts).
import type { GameModule } from '../app/game';
import { CHECKERS_GAME } from '../games/checkers/module';

export const GAMES: readonly GameModule[] = [CHECKERS_GAME];
