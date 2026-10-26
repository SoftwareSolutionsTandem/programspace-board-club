// Игры продукта «Шахматы» (см. src/products/igroteka.games.ts).
import type { GameModule } from '../app/game';
import { CHESS_GAME } from '../games/chess/module';

export const GAMES: readonly GameModule[] = [CHESS_GAME];
