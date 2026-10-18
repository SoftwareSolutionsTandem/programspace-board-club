import { expect, test } from '@playwright/test';
import { collectErrors, noErrors, playThroughUi, probe, seedSettings, sitAtTable } from './helpers';

// Паспорт продукта (src/products/<id>.json) на настоящей сборке: название, подзаголовок, свой ключ настроек, голос.
const PASSPORT = {
  igroteka: { title: 'Игротека', subtitle: 'Клуб-кафе классических игр', key: 'igroteka.settings', otherKey: 'durak.settings' },
  durak: { title: 'Подкидной дурак', subtitle: 'Карточная игра с Бабушкой Агатой', key: 'durak.settings', otherKey: 'igroteka.settings' },
} as const;
const productOf = () => test.info().project.metadata.product as keyof typeof PASSPORT;

test('паспорт продукта: название, подзаголовок, свой ключ настроек, голос Агаты', async ({ page }) => {
  const p = PASSPORT[productOf()];
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(p.title);
  await expect(page.locator('h1.title')).toHaveText(p.title);
  await expect(page.locator('.subtitle').first()).toHaveText(p.subtitle);
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByLabel('Без звука').check();
  await expect(page.locator('.modal .note')).toContainText('записано реплик — 71 из 71');
  await page.getByRole('button', { name: 'Закрыть' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain(p.key);
  expect(keys).not.toContain(p.otherKey);
  noErrors(errors);
});

test('самостоятельный продукт: партия от начала до результата', async ({ page }, info) => {
  test.skip(productOf() === 'igroteka', 'для «Игротеки» полная партия — в game.e2e.ts');
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
