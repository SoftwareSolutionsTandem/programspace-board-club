// Игры продукта «Домино» (см. src/products/igroteka.games.ts).
import type { GameModule } from '../app/game';
import { DOMINOES_GAME } from '../games/dominoes/module';

export const GAMES: readonly GameModule[] = [DOMINOES_GAME];
