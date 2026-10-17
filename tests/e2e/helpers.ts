import { expect, type Page } from '@playwright/test';

/** Состояние для проверок: только проекция игрока (window.__igroteka). */
export interface Probe {
  screen: string;
  layout: { kind: string; tooSmall: boolean } | null;
  settings: Record<string, unknown>;
  session: null | {
    busy: boolean;
    over: boolean;
    legal: Array<{ type: string; card?: Card; cards?: Card[]; attackIndex?: number }>;
    view: { hand: Card[]; table: unknown[]; opponentHandCount: number; phase: string; attacker: number } & Record<string, unknown>;
    positions: { hand: Record<string, { x: number; y: number }>; table: { x: number; y: number }[] };
    series: { wins: [number, number]; draws: number };
    pose: string;
    emotion: string;
  };
}
export interface Card { suit: string; rank: number }

export const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __igroteka: () => Probe }).__igroteka());
export const code = (c: Card) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[c.rank] ?? String(c.rank) + '';
export const cardCode = (c: Card) => (({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[c.rank] ?? String(c.rank)) + c.suit;

export async function seedSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
  await page.goto('/');
  await page.evaluate((s) => localStorage.setItem('igroteka.settings', JSON.stringify({ version: 1, ...s })), settings);
  await page.reload();
}

export async function sitAtTable(page: Page, level: 'Лёгкая' | 'Обычная' | 'Сильная' = 'Обычная'): Promise<void> {
  await page.getByRole('button', { name: /Подкидной дурак/ }).click();
  await page.getByRole('radio', { name: level }).click();
  await page.getByRole('button', { name: 'Сесть за стол' }).click();
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => Probe }).__igroteka().screen === 'game', null, { timeout: 60_000 });
}

/**
 * Нажать кнопку касанием/кликом по её центру — как пользователь. Без ожидания «стабильности» Playwright,
 * которое при программном WebGL (CI без GPU) занимает секунды. Нет кнопки — ничего не делаем.
 */
export async function pressButton(page: Page, name: RegExp, touch: boolean): Promise<void> {
  const box = await page.getByRole('button', { name }).boundingBox({ timeout: 3000 }).catch(() => null);
  if (!box) return;
  if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Сыграть партию до конца через настоящий интерфейс: касания/клики по картам и кнопки действий. */
export async function playThroughUi(page: Page, touch: boolean): Promise<number> {
  const tap = async (x: number, y: number) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  let actions = 0;
  // Сторож зависания: одно и то же состояние после многих попыток — ошибка теста или интерфейса, падаем сразу с подробностями.
  let lastSig = '';
  let sameSig = 0;
  for (let step = 0; step < 900; step++) {
    const s = (await probe(page)).session!;
    if (s.over) return actions;
    if (s.busy || s.legal.length === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    const sig = JSON.stringify([s.view.hand, s.view.table, s.legal]);
    sameSig = sig === lastSig ? sameSig + 1 : 0;
    lastSig = sig;
    if (sameSig >= 12) {
      // Что лежит в точках касания: canvas или перекрывающий элемент интерфейса.
      const hits = await page.evaluate((ps) => Object.fromEntries(Object.entries(ps).map(([k, p]) => [k, document.elementFromPoint(p.x, p.y)?.className || document.elementFromPoint(p.x, p.y)?.tagName || 'none'])), s.positions.hand);
      throw new Error(`интерфейс не продвигает партию: ${JSON.stringify({ legal: s.legal[0], phase: s.view.phase, hand: s.view.hand.length, table: s.view.table, positions: s.positions, hits })}`);
    }
    const a = s.legal[0]!;
    const press = (re: RegExp) => pressButton(page, re, touch);
    if (a.type === 'take') await press(/Беру/);
    else if (a.type === 'pass') await press(/Бито/);
    else if (a.type === 'doneThrowing') await press(/Готово/);
    else {
      const card = a.type === 'defend' ? a.card! : a.cards![0]!;
      const pos = s.positions.hand[cardCode(card)];
      if (!pos) {
        await page.waitForTimeout(100);
        continue;
      }
      await tap(pos.x, pos.y);
      if (a.type === 'attack') {
        // Второе касание той же карты подтверждает ход; карта приподнялась, берём её новую точку.
        await page.waitForTimeout(60);
        const again = (await probe(page)).session!.positions.hand[cardCode(card)];
        if (again) await tap(again.x, again.y);
      }
      if (a.type === 'defend') {
        await page.waitForTimeout(60);
        const s2 = (await probe(page)).session!;
        const target = s2.positions.table[a.attackIndex!];
        if (!s2.busy && s2.legal.some((x) => x.type === 'defend') && target) await tap(target.x, target.y);
      }
    }
    actions++;
    await page.waitForTimeout(40);
  }
  throw new Error('партия не завершилась за отведённое число шагов');
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export const noErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([]);
