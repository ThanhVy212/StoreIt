import type { ReactNode } from "react";
import type { Locale } from "@/lib/get-dictionary";
import { getDictionary } from "@/lib/get-dictionary";
import LocaleProvider from "@/components/LocaleProvider";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang as Locale);

  return (
    <LocaleProvider lang={lang as Locale} dictionary={dictionary}>
      {children}
    </LocaleProvider>
  );
}
