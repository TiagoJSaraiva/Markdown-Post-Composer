import { configResult, resolveLocale, type Locale } from "../config/env";
import { en, type MessageKey } from "./en";
import { ptBR } from "./ptBR";

export type { MessageKey } from "./en";
export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en,
  "pt-BR": ptBR
};

export const locale: Locale = configResult.ok
  ? configResult.config.locale
  : resolveLocale(import.meta.env.VITE_MDPC_LOCALE);

export const t: Translate = (key, params) => {
  const template = dictionaries[locale][key];

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
};

const i18n = { t, locale };

/** The locale is fixed at build time, so this is a plain accessor with no re-renders. */
export function useI18n(): { t: Translate; locale: Locale } {
  return i18n;
}
