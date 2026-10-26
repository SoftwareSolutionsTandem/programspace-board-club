import { expect, test, type Page } from '@playwright/test';
import { collectErrors, noErrors, seedSettings, setTabHidden } from './helpers';

// Шахматы и шашки на изометрической доске — в «Игротеке» и в самостоятельных продуктах «Шахматы» и «Шашки».
// Ходы делаются настоящими касаниями и кликами по центрам ромбов полей (центр берётся из сцены).
interface Path { path: number[]; captures: number[]; promotion: string | null }
interface BoardProbe {
  screen: string;
  game: string;
  session: null | {
    busy: boolean;
    over: boolean;
    winner: 'w' | 'b' | null | undefined;
    human: 'w' | 'b';
    tallies: [number, number, number];
    plies: number;
    legal: Path[];
    selected: number[];
    promoting: boolean;
    view: { turn: 'w' | 'b'; board: (string | null)[] };
    gesture: string | null;
    voiceLog: { id: string; outcome: string }[];
  };
}
type Game = 'chess' | 'checkers';
const TITLE: Record<Game, RegExp> = { chess: /^Шахматы/, checkers: /^Шашки/ };
const KEY: Record<string, string> = { chess: 'chess.settings', checkers: 'checkers.settings' };
const product = () => test.info().project.metadata.product as string;
const games = (): Game[] => (product() === 'chess' ? ['chess'] : product() === 'checkers' ? ['checkers'] : ['chess', 'checkers']);
const settingsKey = () => KEY[product()] ?? 'igroteka.settings';

const probe = (page: Page): Promise<BoardProbe> => page.evaluate(() => {
  const p = (window as unknown as { __igroteka: () => BoardProbe }).__igroteka();
  // Функции из debug() не сериализуются — оставляем только данные.
  return JSON.parse(JSON.stringify(p)) as BoardProbe;
});
const squareAt = (page: Page, sq: number) => page.evaluate((s) => (window as unknown as { __igroteka: () => { session: { squareAt: (x: number) => { x: number; y: number } } } }).__igroteka().session.squareAt(s), sq);

async function sit(page: Page, game: Game, level: 'Лёгкая' | 'Обычная' | 'Сильная' = 'Лёгкая'): Promise<void> {
  // В самостоятельном продукте одна игра: клуб сразу предлагает её.
  await page.getByRole('button', { name: TITLE[game] }).first().click();
  await page.getByRole('radio', { name: level }).click();
  await page.getByRole('button', { name: 'Сесть за стол' }).click();
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => BoardProbe }).__igroteka().screen === 'game', null, { timeout: 60_000 });
}

const tapper = (page: Page) => (test.info().project.use.hasTouch ? (x: number, y: number) => page.touchscreen.tap(x, y) : (x: number, y: number) => page.mouse.click(x, y));

/** Ход игрока по полям пути: касание фигуры, затем каждого поля (многоходовое взятие — по прыжкам). */
async function playPath(page: Page, m: Path): Promise<void> {
  const tap = tapper(page);
  for (const sq of m.path) {
    const p = await squareAt(page, sq);
    await tap(p.x, p.y);
    await page.waitForTimeout(60);
  }
  // Превращение: выбрать фигуру кнопкой.
  if (m.promotion) await page.getByRole('button', { name: /^Ферзь/ }).click();
}

/** Жадный выбор: взятия и превращения — раньше (партия быстрее доходит до итога). */
function pick(legal: Path[], step: number): Path {
  const best = [...legal].sort((a, b) => b.captures.length - a.captures.length || (b.promotion === 'q' ? 1 : 0) - (a.promotion === 'q' ? 1 : 0));
  const top = best.filter((m) => m.captures.length === best[0]!.captures.length && (m.promotion ?? 'q') === 'q');
  return top[step % top.length]!;
}

async function waitMyTurn(page: Page, timeout = 30_000): Promise<NonNullable<BoardProbe['session']>> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const s = (await probe(page)).session!;
    if (s.over || (!s.busy && s.view.turn === s.human && s.legal.length > 0)) return s;
    if (Date.now() > deadline) throw new Error(`не дождались своего хода: ${JSON.stringify({ busy: s.busy, turn: s.view.turn, human: s.human })}`);
    await page.waitForTimeout(100);
  }
}

/** Ход принят: счётчик полуходов вырос (персонаж может ответить мгновенно). Иначе — понятная ошибка. */
async function moveAccepted(page: Page, m: Path, plies: number): Promise<void> {
  try {
    await page.waitForFunction((n) => (window as unknown as { __igroteka: () => BoardProbe }).__igroteka().session!.plies > n, plies, { timeout: 10_000 });
  } catch {
    const s = (await probe(page)).session!;
    throw new Error(`ход ${JSON.stringify(m)} не принят: выбрано ${JSON.stringify(s.selected)}, ход ${s.view.turn}, игрок ${s.human}, занят ${s.busy}`);
  }
}

for (const game of ['chess', 'checkers'] as const) {
  test.describe(game === 'chess' ? 'шахматы' : 'шашки', () => {
    test.beforeEach(() => test.skip(!games().includes(game), `в продукте «${product()}» нет этой игры`));

    test('партия через касания до итога: ИИ отвечает, итог, реванш другими цветами', async ({ page }) => {
      test.setTimeout(600_000);
      const errors = collectErrors(page);
      await seedSettings(page, { [`${game}TutorialDone`]: true, metKhariton: true, metKostyan: true, reducedMotion: true }, settingsKey());
      await sit(page, game);
      const first = await probe(page);
      expect(first.game).toBe(game);
      expect(first.session!.human).toBe('w');
      let moves = 0;
      for (let step = 0; step < 400; step++) {
        const s = await waitMyTurn(page, 60_000);
        if (s.over) break;
        const before = s.view.board.filter(Boolean).length;
        const m = pick(s.legal, step);
        await playPath(page, m);
        await moveAccepted(page, m, s.plies);
        const after = (await probe(page)).session!;
        // Пока персонаж не ответил, на доске ровно на сбитые фигуры меньше.
        if (after.plies === s.plies + 1) expect(after.view.board.filter(Boolean).length).toBe(before - m.captures.length);
        moves++;
      }
      expect(moves).toBeGreaterThan(3);
      const end = (await probe(page)).session!;
      expect(end.over).toBe(true);
      await expect(page.locator('.result--show')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.result .heading')).toHaveText(/Победа!|Победил|Ничья/);
      expect(end.tallies.reduce((a, b) => a + b, 0)).toBe(1);
      // Реванш: игрок теперь чёрными, первым ходит персонаж.
      await page.getByRole('button', { name: 'Ещё партию' }).click();
      const re = await waitMyTurn(page, 30_000);
      expect(re.human).toBe('b');
      expect(re.view.board.filter(Boolean).length).toBeLessThanOrEqual(game === 'chess' ? 32 : 24);
      noErrors(errors);
    });

    test('сдача: подтверждение, итог «Победил …», счёт на грифельной доске', async ({ page }) => {
      const errors = collectErrors(page);
      await seedSettings(page, { [`${game}TutorialDone`]: true, metKhariton: true, metKostyan: true, reducedMotion: true }, settingsKey());
      await sit(page, game);
      const s = await waitMyTurn(page);
      await playPath(page, s.legal[0]!);
      await waitMyTurn(page);
      await page.getByRole('button', { name: 'Сдаться' }).click();
      await page.getByRole('button', { name: 'Да, сдаюсь' }).click();
      await expect(page.locator('.result .heading')).toHaveText(/^Победил /, { timeout: 10_000 });
      await expect(page.locator('.result')).toContainText('Вы сдались.');
      const e = (await probe(page)).session!;
      expect(e.winner).toBe('b');
      expect(e.tallies).toEqual([0, 1, 0]);
      await page.getByRole('button', { name: 'В клуб' }).click();
      await expect.poll(async () => (await probe(page)).screen).toBe('club');
      noErrors(errors);
    });

    test('неверное касание объясняется подсказкой; выбор фигуры снимается повторным касанием', async ({ page }) => {
      await seedSettings(page, { [`${game}TutorialDone`]: true, metKhariton: true, metKostyan: true, reducedMotion: true }, settingsKey());
      await sit(page, game);
      const s = await waitMyTurn(page);
      const tap = tapper(page);
      // Фигура соперника.
      // Цвет фигуры: в шахматах заглавные — белые (FEN), в шашках буква и есть цвет (w, W — белые).
      const colorOf = (p: string) => (game === 'chess' ? (p === p.toUpperCase() ? 'w' : 'b') : p.toLowerCase());
      const enemy = s.view.board.findIndex((p) => p !== null && colorOf(p) !== s.human);
      const ep = await squareAt(page, enemy);
      await tap(ep.x, ep.y);
      await expect(page.locator('.toast--show')).toHaveText('Это фигура соперника');
      const from = s.legal[0]!.path[0]!;
      const fp = await squareAt(page, from);
      await tap(fp.x, fp.y);
      await expect.poll(async () => (await probe(page)).session!.selected).toEqual([from]);
      await tap(fp.x, fp.y);
      await expect.poll(async () => (await probe(page)).session!.selected).toEqual([]);
    });

    test('клавиатура: стрелки и Enter делают ход', async ({ page }) => {
      test.skip(test.info().project.use.hasTouch === true, 'на телефоне клавиатуры нет');
      await seedSettings(page, { [`${game}TutorialDone`]: true, metKhariton: true, metKostyan: true, reducedMotion: true }, settingsKey());
      await sit(page, game);
      const s = await waitMyTurn(page);
      const m = s.legal[0]!;
      // Курсор начинается с поля (u 3, v 1) — для белых это d2; ведём его по координатам игрока.
      const go = async (sq: number, from: number) => {
        const du = (sq & 7) - (from & 7), dv = (sq >> 3) - (from >> 3);
        for (let i = 0; i < Math.abs(du); i++) await page.keyboard.press(du > 0 ? 'ArrowRight' : 'ArrowLeft');
        for (let i = 0; i < Math.abs(dv); i++) await page.keyboard.press(dv > 0 ? 'ArrowUp' : 'ArrowDown');
        await page.keyboard.press('Enter');
      };
      // Курсор появляется с первой стрелкой: вправо и обратно — он на d2 (с точки зрения белых).
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      let at = 1 * 8 + 3;
      for (const sq of m.path) {
        await go(sq, at);
        at = sq;
      }
      await moveAccepted(page, m, s.plies);
    });

    test('свернули и вернули вкладку — персонаж продолжает ходить', async ({ page }) => {
      await seedSettings(page, { [`${game}TutorialDone`]: true, metKhariton: true, metKostyan: true, reducedMotion: true }, settingsKey());
      await sit(page, game);
      const s = await waitMyTurn(page);
      await playPath(page, s.legal[0]!);
      await setTabHidden(page, true);
      await page.waitForTimeout(1500);
      await setTabHidden(page, false);
      const back = await waitMyTurn(page, 20_000);
      expect(back.view.turn).toBe(back.human);
    });

    test('первый запуск: обучение с подсказками и знакомство с персонажем', async ({ page }) => {
      const errors = collectErrors(page);
      await seedSettings(page, { reducedMotion: true }, settingsKey());
      // Первый запуск: касание игры сразу открывает обучающую партию.
      await page.getByRole('button', { name: TITLE[game] }).first().click();
      await page.waitForFunction(() => (window as unknown as { __igroteka: () => BoardProbe }).__igroteka().screen === 'game', null, { timeout: 60_000 });
      await expect(page.locator('.coach--show')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.coach--show')).toContainText(game === 'chess' ? 'Харитон' : 'Костян');
      const st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, unknown>, settingsKey());
      expect(st[game === 'chess' ? 'metKhariton' : 'metKostyan']).toBe(true);
      // Голоса нет: реплики не звучат, но и ошибок нет.
      const v = (await probe(page)).session!.voiceLog;
      expect(v.every((l) => l.outcome !== 'played')).toBe(true);
      noErrors(errors);
    });
  });
}
