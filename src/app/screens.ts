// HTML-экраны вне партии: клуб, выбор соперника, настройки, загрузка, правила.
import { t } from '../i18n';
import type { Difficulty, Settings } from '../storage/settings';
import { button, el } from './dom';
import type { GameModule } from './game';

/** Клуб: карточка на каждую игру продукта; у каждой — «Как играть» (обучающая партия). */
export function clubScreen(games: readonly GameModule[], h: { onGame(g: GameModule): void; onTutorial(g: GameModule): void; onSettings(): void }): HTMLElement {
  const s = el('div', 'screen screen--club');
  const list = el('div', 'game-list');
  for (const g of games) {
    const card = el('section', 'game-card');
    card.dataset.game = g.id;
    const main = button('', () => h.onGame(g), 'game-card__main');
    const title = el('span', 'game-card__title', t(g.titleKey));
    title.id = `game-title-${g.id}`;
    main.append(title, el('span', 'game-card__desc', t(g.descKey)));
    // Имя кнопки — «Как играть», к какой игре она относится — из описания (заголовок карточки).
    const tut = button(t('club.tutorial'), () => h.onTutorial(g), 'button button--light button--small game-card__tutorial');
    tut.setAttribute('aria-describedby', title.id);
    card.append(main, tut);
    list.append(card);
  }
  const row = el('div', 'row');
  row.append(button(t('club.settings'), h.onSettings, 'button button--light'));
  s.append(el('h1', 'title', t('app.title')), el('p', 'subtitle', t('start.subtitle')), el('h2', 'heading', t(games.length > 1 ? 'club.choose' : 'club.chooseOne')), list, row);
  return s;
}

export function opponentScreen(game: GameModule, current: Difficulty, h: { onSit(level: Difficulty): void; onBack(): void }): HTMLElement {
  const ch = game.character;
  const s = el('div', 'screen screen--opponent');
  const card = el('section', 'opponent');
  const portrait = el('img', 'opponent__portrait');
  portrait.alt = t(ch.nameKey);
  portrait.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ch.art.portraitSvg('warm'))}`;
  const info = el('div', 'opponent__info');
  info.append(el('h2', 'heading', t(ch.nameKey)), el('p', 'opponent__desc', t(ch.descKey)));
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

export function loadingScreen(text: string): { root: HTMLElement; progress(p: number): void; error(onRetry: () => void): void } {
  const root = el('div', 'screen screen--loading');
  const title = el('p', 'subtitle', text);
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
  // Фокус — для клавиатуры; без прокрутки, чтобы на низком экране окно открывалось с заголовка.
  queueMicrotask(() => box.querySelector('button')?.focus({ preventScroll: true }));
  return back;
}

export function rulesBody(keys: readonly string[]): HTMLElement[] {
  const list = el('ol', 'rules');
  for (const k of keys) list.append(el('li', '', t(k)));
  return [list];
}

export interface VoiceStatus {
  readonly name: string;
  readonly available: number;
  readonly total: number;
}

export function settingsBody(s: Settings, voices: readonly VoiceStatus[], onChange: (next: Settings) => void, onResetTutorial: () => void): HTMLElement[] {
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
  const status = voices.map((v) => el('p', 'note', v.available > 0 ? t('settings.voiceStatus', { name: v.name, n: v.available, total: v.total }) : t('settings.voiceMissing', { name: v.name })));
  return [
    slider(t('settings.master'), 'masterVolume'),
    slider(t('settings.voice'), 'voiceVolume'),
    slider(t('settings.sfx'), 'sfxVolume'),
    toggle(t('settings.muted'), 'muted'),
    toggle(t('settings.subtitles'), 'subtitles'),
    toggle(t('settings.reducedMotion'), 'reducedMotion'),
    ...status,
    button(t('settings.resetTutorial'), onResetTutorial, 'button button--light button--small'),
  ];
}
