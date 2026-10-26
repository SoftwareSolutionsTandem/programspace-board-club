import { expect, test } from '@playwright/test';
import { cardCode, collectErrors, noErrors, opponentMovesWithin, playThroughUi, pressButton, probe, seedSettings, setTabHidden, sitAtTable } from './helpers';

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

test('большая рука: карты нажимаются по видимой части, партия доигрывается', async ({ page }, info) => {
  test.setTimeout(480_000);
  const errors = collectErrors(page);
  const touch = touchOf(info.project.name);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  // Набираем большую руку: на каждой защите — «Беру»; свои атаки — первой допустимой картой, подкидывать не стараемся.
  for (let i = 0; i < 400; i++) {
    const s = (await probe(page)).session!;
    if (s.over || s.view.hand.length >= 12) break;
    const tap = (x: number, y: number) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
    if (!s.busy && s.legal.some((a) => a.type === 'take')) await pressButton(page, /Беру/, touch);
    else if (!s.busy && s.legal.some((a) => a.type === 'pass')) await pressButton(page, /Бито/, touch);
    else if (!s.busy && s.legal.some((a) => a.type === 'doneThrowing')) await pressButton(page, /Готово/, touch);
    else if (!s.busy) {
      const attack = s.legal.find((a) => a.type === 'attack');
      const code = attack ? cardCode(attack.cards![0]!) : undefined;
      const p = code ? s.positions.hand[code] : undefined;
      if (code && p) await tap(p.x, p.y);
    }
    await page.waitForTimeout(100);
  }
  const big = (await probe(page)).session!;
  test.skip(big.over || big.view.hand.length < 10, 'раздача не дала большой руки');
  // Точки касания разные, и все внутри экрана.
  const pts = Object.values(big.positions.hand);
  const vp = page.viewportSize()!;
  expect(new Set(pts.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`)).size).toBe(pts.length);
  for (const p of pts) {
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThanOrEqual(vp.width);
    expect(p.y).toBeLessThanOrEqual(vp.height);
  }
  // Касание каждой карты попадает в сцену, а не в элементы интерфейса поверх неё.
  const hits = await page.evaluate((ps) => ps.map((p) => document.elementFromPoint(p.x, p.y)?.tagName ?? 'none'), pts);
  expect(hits.filter((t) => t !== 'CANVAS'), JSON.stringify({ pts, hits })).toEqual([]);
  await playThroughUi(page, touch);
  await expect(page.locator('.result--show')).toBeVisible({ timeout: 10_000 });
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
  // Пока идёт анимация (busy), клавиши игнорируются — ждём и разрешённого хода, и свободной сцены.
  await expect.poll(async () => {
    const ss = (await probe(page)).session!;
    return !ss.busy && ss.legal.some((a) => a.type === 'attack' || a.type === 'take');
  }, { timeout: 30_000 }).toBe(true);
  const start = (await probe(page)).session!;
  if (start.legal.some((a) => a.type === 'attack')) {
    const before = start.view.hand.map(cardCode);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    // Карта сыграна, если ушла из руки: это верно и когда Агата сразу её забрала и стол уже пуст.
    await expect.poll(async () => {
      const hand = new Set((await probe(page)).session!.view.hand.map(cardCode));
      return before.some((c) => !hand.has(c));
    }, { timeout: 10_000 }).toBe(true);
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

test('свернули и вернули вкладку — партия продолжается, Агата ходит', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  // Вкладка скрыта и снова видна — пауза снимается сама, без меню.
  await setTabHidden(page, true);
  await page.waitForTimeout(500);
  await setTabHidden(page, false);
  expect(await opponentMovesWithin(page, 90_000, 3)).toBeGreaterThanOrEqual(3);
  noErrors(errors);
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
  await expect(page.locator('.modal .note').first()).toContainText(/Голос Агаты|Записи голоса/);
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

test('голос Агаты: записи загружаются и звучат, без звука — молчит', async ({ page }) => {
  const errors = collectErrors(page);
  const voiceFiles: string[] = [];
  // Голос — только заранее записанные файлы игры: никаких внешних запросов (синтеза речи во время игры нет).
  const external = new Set<string>();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') external.add(u.hostname);
  });
  page.on('response', (r) => {
    if (/\/audio\/ru\/agata\/agata_[^/]+\.(opus|m4a)$/.test(r.url()) && r.ok()) voiceFiles.push(r.url());
  });
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.locator('.modal .note', { hasText: 'Агаты' })).toContainText('записано реплик — 71 из 71');
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await sitAtTable(page, 'Лёгкая');
  // Приветствие при посадке за стол звучит настоящей записью.
  await page.waitForFunction(() => (window as unknown as { __igroteka: () => { session: { voiceLog: { outcome: string }[] } | null } }).__igroteka().session?.voiceLog.some((v) => v.outcome === 'played'), null, { timeout: 15_000 });
  expect(voiceFiles.length).toBeGreaterThan(0);
  // Без звука новые реплики не запускаются, текущая останавливается.
  await page.getByRole('button', { name: 'Звук', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Звук выключен' })).toBeVisible();
  const before = (await probe(page)).session!.voiceLog.length;
  await expect.poll(async () => (await probe(page)).session!.speaking).toBeNull();
  await playThroughUi(page, false);
  const after = (await probe(page)).session!.voiceLog.slice(before);
  expect(after.every((v) => v.outcome !== 'played')).toBe(true);
  expect([...external]).toEqual([]);
  noErrors(errors);
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

test('одно касание (клик) по карте — карта на столе: и в атаке, и в защите', async ({ page }, info) => {
  const touch = touchOf(info.project.name);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
  await sitAtTable(page, 'Лёгкая');
  const seen = new Set<string>();
  for (let i = 0; i < 300 && seen.size < 2; i++) {
    const s = (await probe(page)).session!;
    if (s.over) break;
    const a = !s.busy ? s.legal.find((x) => x.type === 'attack' || x.type === 'defend') : undefined;
    if (a) {
      const card = a.type === 'defend' ? a.card! : a.cards![0]!;
      const p = s.positions.hand[cardCode(card)]!;
      if (touch) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y);
      // Ровно одно касание: карта ушла из руки на стол.
      await expect.poll(async () => (await probe(page)).session!.view.hand.some((c) => cardCode(c) === cardCode(card)), { timeout: 10_000 }).toBe(false);
      // Карта ушла из руки — значит, сыграна (стол к этому моменту мог уже опустеть: Агата взяла или «бито»).
      seen.add(a.type);
    } else if (!s.busy && s.legal.some((x) => x.type === 'pass')) await pressButton(page, /Бито/, touch);
    else if (!s.busy && s.legal.some((x) => x.type === 'doneThrowing')) await pressButton(page, /Готово/, touch);
    else if (!s.busy && s.legal.some((x) => x.type === 'take')) await pressButton(page, /Беру/, touch);
    await page.waitForTimeout(120);
  }
  expect([...seen].sort()).toEqual(['attack', 'defend']);
});

test('Агата моргает: веко опускается и поднимается', async ({ page }) => {
  await seedSettings(page, { tutorialDone: true, metAgata: true });
  await sitAtTable(page, 'Лёгкая');
  const before = (await probe(page)).session!.blinks;
  await expect.poll(async () => (await probe(page)).session!.blinks, { timeout: 20_000 }).toBeGreaterThan(before);
});

test.describe('высокая плотность пикселей (Pixel 7, 2.625)', () => {
  test.use({ deviceScaleFactor: 2.625 });
  test('сцена строится, рука и стол на экране, ход проходит', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'профиль телефона');
    const errors = collectErrors(page);
    await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true });
    expect(await page.evaluate(() => devicePixelRatio)).toBeCloseTo(2.625);
    await sitAtTable(page, 'Лёгкая');
    const s = (await probe(page)).session!;
    const vp = page.viewportSize()!;
    for (const p of Object.values(s.positions.hand)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(vp.width);
      expect(p.y).toBeLessThanOrEqual(vp.height);
    }
    // Один ход через интерфейс: атака первой картой или «Беру». Касание засчитывается только на свободной сцене:
    // пока она доигрывает ход Агаты (busy), сеанс его игнорирует, хотя правила уже разрешают ход. На медленной
    // программной отрисовке при такой плотности касание может и потеряться, поэтому, как в playThroughUi,
    // касаемся снова, пока ход не применится (не дольше 60 с).
    const deadline = Date.now() + 60_000;
    let moved = false;
    while (!moved && Date.now() < deadline) {
      const now = (await probe(page)).session!;
      const attack = now.legal.find((a) => a.type === 'attack');
      const take = now.legal.some((a) => a.type === 'take');
      if (now.busy || (!attack && !take)) {
        await page.waitForTimeout(200);
        continue;
      }
      // Ход принят, когда изменилось состояние партии: рука, стол или набор допустимых ходов
      // (после «Беру» Агата может ещё подкинуть вдогонку — рука вырастет позже).
      const sig = (d: typeof now) => `${d.view.hand.length}|${d.view.table.length}|${d.legal.map((x) => x.type).sort().join(',')}`;
      const before = sig(now);
      if (attack) {
        const p = now.positions.hand[cardCode(attack.cards![0]!)]!;
        await page.touchscreen.tap(p.x, p.y);
      } else await pressButton(page, /Беру/, true);
      moved = await expect
        .poll(async () => sig((await probe(page)).session!) !== before, { timeout: 10_000 })
        .toBe(true)
        .then(() => true, () => false);
    }
    expect(moved, 'ход через интерфейс не прошёл за 60 с').toBe(true);
    noErrors(errors);
  });
});
