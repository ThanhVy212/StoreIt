"use client";

import { LocaleContext } from "@/lib/locale-context";
import type { Dictionary, Locale } from "@/lib/get-dictionary";

export default function LocaleProvider({
  children,
  lang,
  dictionary,
}: {
  children: React.ReactNode;
  lang: Locale;
  dictionary: Dictionary;
}) {
  return (
    <LocaleContext.Provider value={{ lang, dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}
