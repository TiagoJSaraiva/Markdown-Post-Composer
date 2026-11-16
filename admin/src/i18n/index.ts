/*
 * Translation entry point. The locale is fixed at build time, so `t` is a plain function
 * and useI18n needs no provider. Used by every component and hook with text.
 */
import { configResult, resolveLocale, type Locale } from "../config/env";
import { en, type MessageKey } from "./en";
import { ptBR } from "./ptBR";

export type { MessageKey } from "./en";
/** Values for the `{name}` placeholders of a message. */
export type TranslateParams = Record<string, string | number>;
/** Translates a message key, filling its placeholders. */
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en,
  "pt-BR": ptBR
};

/** Active locale, taken from the configuration (or the raw variable when it is invalid). */
export const locale: Locale = configResult.ok
  ? configResult.config.locale
  : resolveLocale(import.meta.env.VITE_MDPC_LOCALE);

/**
 * Translates a message of the active locale.
 *
 * @param key - Message key.
 * @param params - Values for the `{name}` placeholders; unknown placeholders are left as written.
 * @returns The message text.
 */
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

/**
 * The locale is fixed at build time, so this is a plain accessor with no re-renders.
 *
 * @returns The translate function and the active locale.
 */
export function useI18n(): { t: Translate; locale: Locale } {
  return i18n;
}
