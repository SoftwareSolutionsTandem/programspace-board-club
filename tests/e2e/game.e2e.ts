import { expect, test } from '@playwright/test';
import { cardCode, collectErrors, noErrors, playThroughUi, pressButton, probe, seedSettings, sitAtTable } from './helpers';

const touchOf = (name: string) => name === 'phone';

test('полная партия через интерфейс, результат, реванш и возврат в клуб', async ({ page }, info) => {
  // Партия — 40–80 действий; в CI без GPU сцена рисуется медленно, поэтому запас времени.
  test.setTimeout(480_000);
  const errors = collectErrors(page);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Сильная');
  const start = (await probe(page)).session!;
  expect(start.view.hand).toHaveLength(6);
  // Агата могла уже сходить первой: её карты — в руке или на столе.
  expect(start.view.opponentHandCount + start.view.table.length).toBe(6);
  // Проекция игрока не содержит скрытых данных.
  expect(Object.keys(start.view)).not.toContain('hands');
  expect(Object.keys(start.view)).not.toContain('deck');
  const actions = await playThroughUi(page, touchOf(info.project.name));
  expect(actions).toBeGreaterThan(5);
  await expect(page.locator('.result--show')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.result .heading')).toHaveText(/Вы победили!|Вы — в дураках|Ничья/);
  const series = (await probe(page)).session!.series;
  expect(series.wins[0] + series.wins[1] + series.draws).toBe(1);
  await page.getByRole('button', { name: 'Ещё партию' }).click();
  await expect(page.locator('.result--show')).toBeHidden();
  const again = (await probe(page)).session!;
  expect(again.over).toBe(false);
  expect(again.view.hand).toHaveLength(6);
  await page.getByRole('button', { name: 'Меню' }).click();
  await page.getByRole('button', { name: 'Выйти в клуб' }).click();
  await expect(page.getByRole('button', { name: /Подкидной дурак/ })).toBeVisible();
  noErrors(errors);
});

test('поворот и изменение размера посреди партии не сбрасывают партию', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page);
  const before = (await probe(page)).session!.view;
  const size = page.viewportSize()!;
  for (const [w, h] of [[size.height, size.width], [1920, 1080], [844, 390], [size.width, size.height]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const p = await probe(page);
    expect(p.session!.view.hand).toEqual(before.hand);
    // Агата могла сходить за это время: её карт в руке и на столе столько же.
    expect(p.session!.view.opponentHandCount + p.session!.view.table.length).toBe(before.opponentHandCount + before.table.length);
    // Все карты руки на экране.
    for (const pos of Object.values(p.session!.positions.hand)) {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(w);
      expect(pos.y).toBeLessThan(h);
    }
  }
  noErrors(errors);
});

test('клавиатура: выбрать карту стрелкой и сходить Enter', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'клавиатура — на компьютере');
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  // Первым может ходить любой: при своём ходе — стрелка и Enter, при защите — T («Беру»).
  await expect.poll(async () => (await probe(page)).session!.legal.some((a) => a.type === 'attack' || a.type === 'take'), { timeout: 30_000 }).toBe(true);
  const start = (await probe(page)).session!;
  if (start.legal.some((a) => a.type === 'attack')) {
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await probe(page)).session!.view.table.length, { timeout: 10_000 }).toBeGreaterThan(0);
  } else {
    const handBefore = start.view.hand.length;
    await page.keyboard.press('t');
    await expect.poll(async () => (await probe(page)).session!.view.hand.length, { timeout: 15_000 }).toBeGreaterThan(handBefore);
  }
});

test('недопустимый ход объясняется подсказкой и ничего не меняет', async ({ page }, info) => {
  test.setTimeout(300_000);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  // Находим момент защиты, когда в руке есть карта, которая ничего не бьёт.
  for (let i = 0; i < 400; i++) {
    const s = (await probe(page)).session!;
    if (s.over) break;
    const defending = s.legal.some((a) => a.type === 'take');
    if (!s.busy && defending) {
      const playable = new Set(s.legal.filter((a) => a.type === 'defend').map((a) => cardCode(a.card!)));
      const useless = s.view.hand.map(cardCode).find((c) => !playable.has(c));
      if (useless) {
        const pos = s.positions.hand[useless]!;
        const tableBefore = s.view.table.length;
        if (info.project.name === 'phone') await page.touchscreen.tap(pos.x, pos.y);
        else await page.mouse.click(pos.x, pos.y);
        await expect(page.locator('.toast--show')).toContainText(/нечего побить|не бьёт/);
        expect((await probe(page)).session!.view.table.length).toBe(tableBefore);
        return;
      }
    }
    // Иначе продвигаем партию первым допустимым ходом через интерфейс.
    if (!s.busy && s.legal.length) {
      const a = s.legal[0]!;
      const touch = info.project.name === 'phone';
      if (a.type === 'take') await pressButton(page, /Беру/, touch);
      else if (a.type === 'pass' || a.type === 'doneThrowing') await pressButton(page, /Бито|Готово/, touch);
      else await page.evaluate((idx) => (window as unknown as { __igroteka: () => { session: { act(i: number): void } } }).__igroteka().session.act(idx), 0);
    }
    await page.waitForTimeout(80);
  }
  test.info().annotations.push({ type: 'note', description: 'ситуация не встретилась в этой раздаче' });
});

test('настройки сохраняются после перезапуска', async ({ page }) => {
  await seedSettings(page, { tutorialDone: true });
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Субтитры реплик (для доступности)').check();
  await page.getByLabel('Без звука').check();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await page.reload();
  const s = (await probe(page)).settings;
  expect(s.subtitles).toBe(true);
  expect(s.muted).toBe(true);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByLabel('Без звука')).toBeChecked();
  // Честный статус озвучки: записей пока нет.
  await expect(page.locator('.modal .note')).toContainText(/Голос Агаты|Записи голоса/);
});

test('без аудиофайлов и манифеста игра работает', async ({ page }) => {
  const errors = collectErrors(page);
  await page.route('**/audio/**', (r) => r.abort());
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  const s = (await probe(page)).session!;
  expect(s.view.hand).toHaveLength(6);
  // Сетевая ошибка загрузки манифеста — ожидаемое предупреждение, но не ошибка страницы.
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([]);
});

test('первый запуск: обучение с подсказками, пропуск обучения', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Подкидной дурак/ }).click();
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => { screen: string } }).__igroteka().screen === 'game', null, { timeout: 60_000 });
  await expect(page.locator('.coach--show')).toContainText(/Обучающая партия|Козырь/);
  await expect(page.locator('.coach--show')).toContainText(/Ваш ход|Козырь/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Пропустить обучение' }).click();
  await expect(page.locator('.coach--show')).toBeHidden();
  expect((await probe(page)).settings.tutorialDone).toBe(true);
  noErrors(errors);
});

test('слишком маленькое окно — подсказка, партия сохраняется', async ({ page }) => {
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  const before = (await probe(page)).session!.view;
  await page.setViewportSize({ width: 300, height: 420 });
  await expect(page.locator('.small-notice--show')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.small-notice--show')).toBeHidden();
  const after = await probe(page);
  expect(after.screen).toBe('game');
  expect(after.session!.view.hand).toEqual(before.hand);
});
