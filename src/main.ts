import { Application, Graphics } from 'pixi.js';
import { t } from './i18n';
import { renderScreen, type ScreenId } from './ui/screens';

// Каркас этапа 1: сцена Pixi (стол) и HTML-экраны поверх неё.
async function boot(): Promise<void> {
  const stageEl = document.getElementById('stage');
  const uiEl = document.getElementById('ui');
  if (!stageEl || !uiEl) throw new Error('В index.html нет #stage или #ui');
  document.title = t('app.title');

  const app = new Application();
  try {
    await app.init({
      resizeTo: stageEl,
      background: '#a86b3c',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch (err) {
    console.error(err);
    uiEl.replaceChildren(Object.assign(document.createElement('p'), { className: 'notice', textContent: t('error.renderer') }));
    return;
  }
  stageEl.append(app.canvas);

  // Сукно стола; перерисовывается при изменении размера окна.
  const cloth = new Graphics();
  app.stage.addChild(cloth);
  const layout = (): void => {
    const { width, height } = app.screen;
    cloth.clear().roundRect(-20, height * 0.42, width + 40, height * 0.6, 48).fill('#2f7a72').stroke({ color: '#3b2418', width: 5 });
  };
  app.renderer.on('resize', layout);
  layout();

  let screen: ScreenId = 'start';
  const show = (id: ScreenId): void => {
    screen = id;
    renderScreen(uiEl, id, { onPlay: () => show('table'), onBack: () => show('start') });
  };
  show('start');

  if (import.meta.env.DEV) {
    // Доступ для ручной отладки и Playwright-проверок (только в dev-сборке).
    Object.assign(window, { __game: { app, get screen() { return screen; }, show } });
  }
}

void boot();
