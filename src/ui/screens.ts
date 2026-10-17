// Оболочки экранов на HTML поверх сцены. Тексты — только через t().
import { t } from '../i18n';

export type ScreenId = 'start' | 'table';

export interface ScreenHandlers {
  onPlay(): void;
  onBack(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderScreen(root: HTMLElement, id: ScreenId, handlers: ScreenHandlers): void {
  root.replaceChildren();
  if (id === 'start') {
    const screen = el('div', 'screen screen--start');
    const play = el('button', 'button', t('start.play'));
    play.type = 'button';
    play.addEventListener('click', handlers.onPlay);
    screen.append(el('h1', 'title', t('app.title')), el('p', 'subtitle', t('start.subtitle')), play);
    root.append(screen);
    return;
  }
  const screen = el('div', 'screen screen--table');
  const back = el('button', 'button button--small', t('table.back'));
  back.type = 'button';
  back.addEventListener('click', handlers.onBack);
  screen.append(back, el('p', 'notice', t('table.devNotice')));
  root.append(screen);
}
