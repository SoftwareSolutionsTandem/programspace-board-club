import { expect, test, type Page } from '@playwright/test';
import { collectErrors, noErrors, seedSettings } from './helpers';

// Домино в «Игротеке» и в самостоятельном продукте «Домино»: матч через настоящий интерфейс, обучение, честность сцены.
interface Bone { hi: number; lo: number }
interface DomProbe {
  screen: string;
  game: string;
  session: null | {
    busy: boolean;
    phase: 'play' | 'handOver' | 'matchOver';
    picking: { code: string; ends: string[] } | null;
    legal: Array<{ type: string; bone?: Bone; end?: string }>;
    view: { hand: Bone[]; chain: { bone: Bone }[]; turn: number; seat: number; score: [number, number]; opponentHandCount: number; opponentRevealed: Bone[] | null };
    positions: { hand: Record<string, { x: number; y: number }>; ends: Record<string, { x: number; y: number }>; bazaar: { x: number; y: number } | null };
    faces: string[];
    voiceLog: { id: string; outcome: string }[];
  };
}
const probe = (page: Page): Promise<DomProbe> => page.evaluate(() => (window as unknown as { __igroteka: () => DomProbe }).__igroteka());
const code = (b: Bone) => `${b.hi}:${b.lo}`;
const keyOf = () => (test.info().project.metadata.product === 'dominoes' ? 'dominoes.settings' : 'igroteka.settings');

async function sitAtDominoes(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Домино/ }).click();
  await page.getByRole('radio', { name: 'Лёгкая' }).click();
  await page.getByRole('button', { name: 'Сесть за стол' }).click();
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => DomProbe }).__igroteka().screen === 'game', null, { timeout: 60_000 });
}

test('домино: матч до 101 через касания и клики, кости Матвея не видны до конца раздачи', async ({ page }, info) => {
  test.setTimeout(480_000);
  const touch = info.project.use.hasTouch === true;
  const tap = (x: number, y: number) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  const errors = collectErrors(page);
  await seedSettings(page, { dominoesTutorialDone: true, metMatvey: true, reducedMotion: true }, keyOf());
  await sitAtDominoes(page);
  const first = await probe(page);
  expect(first.game).toBe('dominoes');
  expect(first.session!.view.hand).toHaveLength(7);
  let hands = 0;
  let lastSig = '';
  let same = 0;
  for (let step = 0; step < 2000; step++) {
    const s = (await probe(page)).session!;
    if (s.phase === 'matchOver') break;
    if (s.phase === 'handOver') {
      // Итог раздачи: кости Матвея открыты.
      expect(s.view.opponentRevealed).not.toBeNull();
      const next = page.getByRole('button', { name: 'Следующая раздача' });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
        hands++;
      } else await page.waitForTimeout(150);
      continue;
    }
    // Честность сцены: лицом видны только свои кости и цепочка.
    const known = new Set([...s.view.hand.map(code), ...s.view.chain.map((p) => code(p.bone))]);
    for (const f of s.faces) expect(known.has(f), `видна чужая кость ${f}`).toBe(true);
    expect(s.view.opponentRevealed).toBeNull();
    const sig = `${s.view.hand.length}|${s.view.chain.length}|${s.view.turn}|${s.busy}|${s.picking?.code ?? ''}`;
    same = sig === lastSig ? same + 1 : 0;
    lastSig = sig;
    if (same > 120) throw new Error(`матч завис: ${sig}`);
    const plays = s.legal.filter((a) => a.type === 'play');
    if (s.busy || s.view.turn !== s.view.seat || plays.length === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    if (s.picking) {
      const end = s.positions.ends[s.picking.ends[0]!];
      if (end) await tap(end.x, end.y);
    } else {
      const p = s.positions.hand[code(plays[0]!.bone!)];
      if (p) await tap(p.x, p.y);
    }
    await page.waitForTimeout(60);
  }
  // Итог матча и сразу «Ещё матч» — прямо в странице, в тот же кадр, что появился итог: предложение реванша
  // звучит через 2,6 с, и в новом матче оно звучать уже не должно (вызовы probe через Playwright слишком медленные).
  const end = await page.evaluate(() => new Promise<{ heading: string; score: number[] }>((resolve, reject) => {
    const t0 = performance.now();
    const tick = () => {
      const again = [...document.querySelectorAll<HTMLButtonElement>('.result--show button')].find((x) => x.textContent === 'Ещё матч');
      if (again) {
        const d = (window as unknown as { __igroteka: () => DomProbe }).__igroteka().session!;
        const heading = document.querySelector('.result .heading')?.textContent ?? '';
        const res = { heading, score: [...d.view.score] };
        again.click();
        resolve(res);
      } else if (performance.now() - t0 > 10_000) reject(new Error('нет итога матча'));
      else requestAnimationFrame(tick);
    };
    tick();
  }));
  expect(end.heading).toMatch(/Матч ваш!|Матч выиграл Матвей/);
  expect(Math.max(...end.score)).toBeGreaterThanOrEqual(101);
  expect(hands).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(3500);
  const after = (await probe(page)).session!;
  expect(after.phase).toBe('play');
  // Это первый матч теста: до нажатия предложения реванша не было, значит, в журнале его быть не должно вовсе
  // (журнал хранит последние 20 реплик, поэтому сравнение по длине ненадёжно).
  expect(after.voiceLog.map((e) => e.id).filter((id) => id.includes('rematch'))).toEqual([]);
  noErrors(errors);
});

test('домино: первый вход — обучающий матч с подсказками; пропуск обучения сохраняется', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSettings(page, { metMatvey: true, reducedMotion: true }, keyOf());
  await page.getByRole('button', { name: /^Домино/ }).click();
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => DomProbe }).__igroteka().screen === 'game', null, { timeout: 60_000 });
  await expect(page.locator('.coach--show')).toBeVisible();
  await page.getByRole('button', { name: 'Пропустить обучение' }).click();
  expect((await page.evaluate(() => (window as unknown as { __igroteka: () => { settings: Record<string, unknown> } }).__igroteka().settings)).dominoesTutorialDone).toBe(true);
  noErrors(errors);
});

test('домино: выбор конца клавиатурой и пауза', async ({ page }, info) => {
  test.skip(info.project.use.hasTouch === true, 'клавиатура — на компьютере');
  const errors = collectErrors(page);
  await seedSettings(page, { dominoesTutorialDone: true, metMatvey: true, reducedMotion: true }, keyOf());
  await sitAtDominoes(page);
  // Ходим, пока не появится кость, подходящая к обоим концам, — выбираем конец стрелкой.
  for (let step = 0; step < 400; step++) {
    const s = (await probe(page)).session!;
    if (s.phase !== 'play') break;
    if (s.busy || s.view.turn !== s.view.seat) {
      await page.waitForTimeout(100);
      continue;
    }
    if (s.picking) {
      const before = s.view.chain.length;
      await page.keyboard.press(s.picking.ends.includes('left') ? 'ArrowLeft' : 'ArrowRight');
      await expect.poll(async () => (await probe(page)).session!.view.chain.length).toBeGreaterThan(before);
      break;
    }
    const plays = s.legal.filter((a) => a.type === 'play');
    if (plays.length === 0) {
      await page.waitForTimeout(100);
      continue;
    }
    // Есть ли кость с двумя концами? Тогда — Enter на ней, иначе играем первую.
    const counts = new Map<string, number>();
    for (const a of plays) counts.set(code(a.bone!), (counts.get(code(a.bone!)) ?? 0) + 1);
    const two = [...counts].find(([, n]) => n > 1)?.[0];
    const sorted = [...s.view.hand].sort((a, b) => a.hi - b.hi || a.lo - b.lo).map(code);
    const target = two ?? code(plays[0]!.bone!);
    const idx = sorted.indexOf(target);
    if (idx >= 0 && idx < 9) await page.keyboard.press(String(idx + 1));
    else await page.evaluate(() => (window as unknown as { __igroteka: () => { session: { act(i: number): void } } }).__igroteka().session.act(0));
    await page.waitForTimeout(80);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Пауза' })).toBeVisible();
  await page.getByRole('button', { name: 'Подсказка по правилам' }).click();
  await expect(page.getByRole('dialog', { name: 'Как играть в домино' })).toBeVisible();
  noErrors(errors);
});

test('домино: раздача с обычными анимациями доходит до итога (без «Меньше движения»)', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await seedSettings(page, { dominoesTutorialDone: true, metMatvey: true, reducedMotion: false }, keyOf());
  await sitAtDominoes(page);
  // Матвей выкладывает кость, пока его ряд рубашек ещё анимируется, — раньше это обрывало ход и игра замирала.
  let last = '';
  let since = Date.now();
  for (;;) {
    const s = (await probe(page)).session!;
    if (s.phase !== 'play') break;
    const sig = `${s.view.hand.length}|${s.view.chain.length}|${s.view.turn}|${s.busy}`;
    if (sig !== last) {
      last = sig;
      since = Date.now();
    }
    if (Date.now() - since > 20_000) throw new Error(`раздача замерла: ${sig}`);
    if (!s.busy && s.view.turn === s.view.seat && s.legal.length > 0) await page.evaluate(() => (window as unknown as { __igroteka: () => { session: { act(i: number): void } } }).__igroteka().session.act(0));
    await page.waitForTimeout(150);
  }
  await expect(page.locator('.result--show')).toBeVisible({ timeout: 10_000 });
  noErrors(errors);
});
