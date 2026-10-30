import { expect, test } from '@playwright/test';
import { collectErrors, noErrors, playThroughUi, probe, seedSettings, sitAtTable } from './helpers';

const NO_VOICE = (gen: string) => `Записи голоса ${gen} ещё не добавлены в игру: персонаж пока реагирует мимикой и жестами.`;

// Паспорт продукта (src/products/<id>.json) на настоящей сборке: название, подзаголовок, свой ключ настроек, голос.
const PASSPORT = {
  igroteka: { title: 'Игротека', subtitle: 'Клуб-кафе классических игр', key: 'igroteka.settings', otherKey: 'durak.settings', voices: ['Голос Агаты: записано реплик — 71 из 109', 'Голос Деда Матвея: записано реплик — 81 из 112', 'Голос Харитона: записано реплик — 130 из 163', NO_VOICE('Костяна')] },
  durak: { title: 'Подкидной дурак', subtitle: 'Карточная игра с Бабушкой Агатой', key: 'durak.settings', otherKey: 'igroteka.settings', voices: ['Голос Агаты: записано реплик — 71 из 109'] },
  dominoes: { title: 'Домино', subtitle: '«Козла» забиваем с Дедом Матвеем', key: 'dominoes.settings', otherKey: 'igroteka.settings', voices: ['Голос Деда Матвея: записано реплик — 81 из 112'] },
  // Голоса Харитона и Костяна ещё не записаны: настройки честно говорят, что записей нет.
  chess: { title: 'Шахматы', subtitle: 'Партия с профессором Харитоном', key: 'chess.settings', otherKey: 'igroteka.settings', voices: ['Голос Харитона: записано реплик — 130 из 163'] },
  checkers: { title: 'Шашки', subtitle: 'Русские шашки с Костяном', key: 'checkers.settings', otherKey: 'igroteka.settings', voices: [NO_VOICE('Костяна')] },
} as const;
const productOf = () => test.info().project.metadata.product as keyof typeof PASSPORT;

test('паспорт продукта: название, подзаголовок, свой ключ настроек, голос персонажа', async ({ page }) => {
  const p = PASSPORT[productOf()];
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(p.title);
  await expect(page.locator('h1.title')).toHaveText(p.title);
  await expect(page.locator('.subtitle').first()).toHaveText(p.subtitle);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Без звука').check();
  // Голоса только персонажей продукта: в «Дураке» нет Матвея, в «Домино» — Агаты.
  await expect(page.locator('.modal .note').filter({ hasText: /^Голос |^Записи голоса / })).toHaveText([...p.voices]);
  await page.getByRole('button', { name: 'Закрыть' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain(p.key);
  expect(keys).not.toContain(p.otherKey);
  noErrors(errors);
});

test('самостоятельный продукт: партия от начала до результата', async ({ page }, info) => {
  test.skip(productOf() !== 'durak', 'для «Игротеки» полная партия — в game.e2e.ts, для «Домино» — в dominoes.e2e.ts, для шахмат и шашек — в board.e2e.ts');
  test.setTimeout(480_000);
  const p = PASSPORT[productOf()];
  const errors = collectErrors(page);
  await seedSettings(page, { tutorialDone: true, metAgata: true, reducedMotion: true }, p.key);
  await sitAtTable(page, 'Лёгкая');
  expect((await probe(page)).session!.view.hand).toHaveLength(6);
  await playThroughUi(page, info.project.use.hasTouch === true);
  await expect(page.locator('.result--show')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.result .heading')).toHaveText(/Вы победили!|Вы — в дураках|Ничья/);
  noErrors(errors);
});
