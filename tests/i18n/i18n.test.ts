import { describe, expect, it } from 'vitest';
import { createI18n } from '../../src/i18n/i18n';
import ru from '../../src/i18n/ru.json';

describe('i18n', () => {
  const i18n = () => createI18n({ ru: { hello: 'Привет, {name}!', only: 'только ru' }, en: { hello: 'Hello, {name}!' } }, 'ru');

  it('подставляет параметры', () => {
    expect(i18n().t('hello', { name: 'Агата' })).toBe('Привет, Агата!');
  });

  it('оставляет неизвестный параметр как есть', () => {
    expect(i18n().t('hello', {})).toBe('Привет, {name}!');
  });

  it('берёт строку из языка по умолчанию, если её нет в текущем', () => {
    const x = i18n();
    expect(x.setLanguage('en')).toBe('en');
    expect(x.t('hello', { name: 'Agata' })).toBe('Hello, Agata!');
    expect(x.t('only')).toBe('только ru');
  });

  it('возвращает ключ, если строки нет нигде', () => {
    expect(i18n().t('missing.key')).toBe('missing.key');
  });

  it('неизвестный язык — остаётся язык по умолчанию', () => {
    const x = i18n();
    expect(x.setLanguage('xx')).toBe('ru');
    expect(x.language()).toBe('ru');
  });

  it('форматирует числа по языку', () => {
    expect(i18n().formatNumber(12345)).toBe(new Intl.NumberFormat('ru').format(12345));
  });

  it('в русском каталоге нет пустых строк', () => {
    for (const [key, value] of Object.entries(ru)) expect(value.trim(), key).not.toBe('');
  });
});
