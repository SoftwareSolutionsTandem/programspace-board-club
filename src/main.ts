import { App } from './app/app';
import { t } from './i18n';

// Точка входа: HTML-интерфейс в #ui, Pixi-сцена в #stage.
const stageEl = document.getElementById('stage');
const uiEl = document.getElementById('ui');
if (!stageEl || !uiEl) throw new Error('В index.html нет #stage или #ui');
const app = new App(stageEl, uiEl);
app.boot().catch((err) => {
  console.error(err);
  uiEl.textContent = t('error.generic');
});
// Отладочный доступ для Playwright: только проекция игрока, без скрытых карт соперника.
Object.defineProperty(window, '__igroteka', { value: () => app.debug(), configurable: true });
