// Небольшие помощники для HTML-интерфейса. Тексты — только через t().
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Кнопка с защитой от двойного нажатия: повторный клик в течение 400 мс игнорируется. */
export function button(text: string, onClick: () => void, className = 'button'): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  let last = -Infinity;
  b.addEventListener('click', () => {
    const now = performance.now();
    if (now - last < 400 || b.disabled) return;
    last = now;
    onClick();
  });
  return b;
}

export const ICONS = {
  menu: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  sound: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 9q2 3 0 6M19 6q4 6 0 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  mute: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
} as const;

export function iconButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = button('', onClick, 'icon-button');
  b.innerHTML = icon;
  b.setAttribute('aria-label', label);
  b.title = label;
  return b;
}
