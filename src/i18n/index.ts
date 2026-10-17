import { createI18n } from './i18n';
import ru from './ru.json';

export const i18n = createI18n({ ru }, 'ru');
export const t = i18n.t;
