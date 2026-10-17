// Каталог строк и подстановка параметров. Все пользовательские тексты — только через t().

export type Dictionary = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;

export interface I18n {
  t(key: string, params?: Params): string;
  setLanguage(lang: string): string;
  language(): string;
  formatNumber(value: number): string;
}

export function createI18n(dictionaries: Readonly<Record<string, Dictionary>>, fallback: string): I18n {
  const base = dictionaries[fallback];
  if (!base) throw new Error(`i18n: нет словаря для языка по умолчанию «${fallback}»`);
  let lang = fallback;
  let current: Dictionary = base;
  return {
    t(key, params) {
      const template = current[key] ?? base[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
    },
    setLanguage(next) {
      // Неизвестный язык — остаёмся на языке по умолчанию.
      const dict = dictionaries[next];
      lang = dict ? next : fallback;
      current = dict ?? base;
      return lang;
    },
    language: () => lang,
    formatNumber: (value) => new Intl.NumberFormat(lang).format(value),
  };
}
