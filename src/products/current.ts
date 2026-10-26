// Продукт текущей сборки. Псевдоним @product указывает на src/products/<id>.json (vite.config.ts),
// поэтому в бандл попадает только конфиг собираемого продукта.
import { GAMES } from '@product-games';
import raw from '@product';
import { parseProduct } from './types';

export const PRODUCT = parseProduct(raw);

/** Игровые модули продукта, в порядке показа в клубе. */
export const PRODUCT_GAMES = GAMES;
