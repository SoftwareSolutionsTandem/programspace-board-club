// Продукт текущей сборки. Псевдоним @product указывает на src/products/<id>.json (vite.config.ts),
// поэтому в бандл попадает только конфиг собираемого продукта.
import raw from '@product';
import { parseProduct } from './types';

export const PRODUCT = parseProduct(raw);
