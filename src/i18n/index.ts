import { PRODUCT } from '../products/current';
import { createI18n } from './i18n';
import ru from './ru.json';

// Продукт может заменить отдельные строки общего словаря (название, подзаголовок).
export const i18n = createI18n({ ru: { ...ru, ...PRODUCT.strings } }, 'ru');
export const t = i18n.t;
