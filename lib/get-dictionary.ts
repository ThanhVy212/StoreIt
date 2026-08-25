const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((module) => module.default),
  vi: () => import("@/dictionaries/vi.json").then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;

export const locales: Locale[] = ["en", "vi"];
export const defaultLocale: Locale = "en";

export const getDictionary = async (locale: Locale) => {
  return dictionaries[locale]();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
