"use client";

import { createContext, useContext } from "react";
import type { Dictionary, Locale } from "@/lib/get-dictionary";

interface LocaleContextValue {
  lang: Locale;
  dictionary: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}

export { LocaleContext };
