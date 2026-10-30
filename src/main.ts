import { App } from './app/app';
import { t } from './i18n';

// Точка входа: HTML-интерфейс в #ui, Pixi-сцена в #stage.
const stageEl = document.getElementById('stage');
const uiEl = document.getElementById('ui');
if (!stageEl || !uiEl) throw new Error('В index.html нет #stage или #ui');
// Демо-страницы анимаций — только в режиме разработки (/?anim — Агата, /?anim=matvey — Матвей); в сборку продукта не попадают.
const anim = import.meta.env.DEV ? new URLSearchParams(location.search).get('anim') : null;
// /?life=<персонаж> — сценки «своей жизни» любого из четырёх персонажей (src/dev/lifeLab.ts).
const life = import.meta.env.DEV ? new URLSearchParams(location.search).get('life') : null;
if (life !== null) {
  void import('./dev/lifeLab').then((m) => m.startLifeLab(stageEl, uiEl, life));
} else if (anim === 'matvey') {
  void import('./dev/matveyLab').then((m) => m.startMatveyLab(stageEl, uiEl));
} else if (anim !== null) {
  void import('./dev/animLab').then((m) => m.startAnimLab(stageEl, uiEl));
} else {
  const app = new App(stageEl, uiEl);
  app.boot().catch((err) => {
    console.error(err);
    uiEl.textContent = t('error.generic');
  });
  // Отладочный доступ для Playwright: только проекция игрока, без скрытых карт соперника.
  Object.defineProperty(window, '__igroteka', { value: () => app.debug(), configurable: true });
}
