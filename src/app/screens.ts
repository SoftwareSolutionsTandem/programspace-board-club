// HTML-экраны вне партии: клуб, выбор соперника, настройки, загрузка, правила.
import { headSvg } from '../characters/agata/art';
import { t } from '../i18n';
import type { Difficulty, Settings } from '../storage/settings';
import { button, el } from './dom';

export function clubScreen(h: { onDurak(): void; onTutorial(): void; onSettings(): void }): HTMLElement {
  const s = el('div', 'screen screen--club');
  const card = el('section', 'game-card');
  const durak = button('', h.onDurak, 'game-card__main');
  durak.append(el('span', 'game-card__title', t('club.durak')), el('span', 'game-card__desc', t('club.durak.desc')));
  card.append(durak);
  const row = el('div', 'row');
  row.append(button(t('club.tutorial'), h.onTutorial, 'button button--light'), button(t('club.settings'), h.onSettings, 'button button--light'));
  s.append(el('h1', 'title', t('app.title')), el('p', 'subtitle', t('start.subtitle')), el('h2', 'heading', t('club.choose')), card, row);
  return s;
}

export function opponentScreen(current: Difficulty, h: { onSit(level: Difficulty): void; onBack(): void }): HTMLElement {
  const s = el('div', 'screen screen--opponent');
  const card = el('section', 'opponent');
  const portrait = el('img', 'opponent__portrait');
  portrait.alt = t('opp.agata');
  portrait.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(headSvg('warm'))}`;
  const info = el('div', 'opponent__info');
  info.append(el('h2', 'heading', t('opp.agata')), el('p', 'opponent__desc', t('opp.agata.desc')));
  const group = el('div', 'segmented');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', t('opp.level'));
  let level = current;
  const levels: Difficulty[] = ['easy', 'normal', 'hard'];
  const buttons = levels.map((lv) => {
    const b = button(t(`opp.level.${lv}`), () => {
      level = lv;
      sync();
    }, 'segmented__item');
    b.setAttribute('role', 'radio');
    return b;
  });
  const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-checked', String(levels[i] === level)));
  sync();
  group.append(...buttons);
  info.append(el('p', 'label', t('opp.level')), group);
  card.append(portrait, info);
  const row = el('div', 'row');
  row.append(button(t('common.back'), h.onBack, 'button button--light'), button(t('opp.sit'), () => h.onSit(level)));
  s.append(el('h1', 'heading heading--big', t('opp.title')), card, row);
  return s;
}

export function loadingScreen(): { root: HTMLElement; progress(p: number): void; error(onRetry: () => void): void } {
  const root = el('div', 'screen screen--loading');
  const title = el('p', 'subtitle', t('loading.title'));
  const bar = el('div', 'progress');
  const fill = el('div', 'progress__fill');
  bar.append(fill);
  root.append(title, bar);
  return {
    root,
    progress: (p) => {
      fill.style.width = `${Math.round(p * 100)}%`;
    },
    error: (onRetry) => {
      title.textContent = t('loading.error');
      bar.remove();
      root.append(button(t('loading.retry'), onRetry));
    },
  };
}

export function modal(title: string, body: HTMLElement[], onClose: () => void): HTMLElement {
  const back = el('div', 'modal-backdrop');
  const box = el('div', 'modal');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', title);
  box.append(el('h2', 'heading', title), ...body, button(t('common.close'), onClose, 'button button--light'));
  back.append(box);
  back.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onClose();
  });
  queueMicrotask(() => box.querySelector('button')?.focus());
  return back;
}

export function rulesBody(): HTMLElement[] {
  const list = el('ol', 'rules');
  for (const k of ['rules.1', 'rules.2', 'rules.3', 'rules.4', 'rules.5']) list.append(el('li', '', t(k)));
  return [list];
}

export function settingsBody(s: Settings, voice: { available: number; total: number }, onChange: (next: Settings) => void, onResetTutorial: () => void): HTMLElement[] {
  let cur = s;
  const set = (patch: Partial<Settings>) => {
    cur = { ...cur, ...patch };
    onChange(cur);
  };
  const slider = (label: string, key: 'masterVolume' | 'voiceVolume' | 'sfxVolume') => {
    const wrap = el('label', 'field');
    const input = el('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(cur[key] * 100));
    input.addEventListener('input', () => set({ [key]: Number(input.value) / 100 } as Partial<Settings>));
    wrap.append(el('span', '', label), input);
    return wrap;
  };
  const toggle = (label: string, key: 'muted' | 'subtitles' | 'reducedMotion') => {
    const wrap = el('label', 'field field--toggle');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = cur[key];
    input.addEventListener('change', () => set({ [key]: input.checked } as Partial<Settings>));
    wrap.append(input, el('span', '', label));
    return wrap;
  };
  const status = el('p', 'note', voice.available > 0 ? t('settings.voiceStatus', { n: voice.available, total: voice.total }) : t('settings.voiceMissing'));
  return [
    slider(t('settings.master'), 'masterVolume'),
    slider(t('settings.voice'), 'voiceVolume'),
    slider(t('settings.sfx'), 'sfxVolume'),
    toggle(t('settings.muted'), 'muted'),
    toggle(t('settings.subtitles'), 'subtitles'),
    toggle(t('settings.reducedMotion'), 'reducedMotion'),
    status,
    button(t('settings.resetTutorial'), onResetTutorial, 'button button--light button--small'),
  ];
}
