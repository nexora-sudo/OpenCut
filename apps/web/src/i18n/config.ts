export const LOCALE_COOKIE = "opencut-locale";
export const DEFAULT_LOCALE = "pt-BR";
export const LOCALES = [
	"pt-BR",
	"zh-CN",
	"en",
	"ja",
	"en-GB",
	"es",
	"fr",
] as const;
export type Locale = (typeof LOCALES)[number];

export const LANGUAGE_NAMES: Record<Locale, string> = {
	"pt-BR": "Português (Brasil)",
	"zh-CN": "简体中文",
	en: "English",
	ja: "日本語",
	"en-GB": "English (United Kingdom)",
	es: "Español",
	fr: "Français",
};

export function isLocale(value: unknown): value is Locale {
	return (
		typeof value === "string" && LOCALES.some((locale) => locale === value)
	);
}

export function resolveLocale(value: unknown): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

// Stable IDs keep punctuation and full sentences out of next-intl message paths.
export function messageId(source: string): string {
	let hash = 2166136261;
	for (let index = 0; index < source.length; index++) {
		hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
	}
	return `m${(hash >>> 0).toString(16)}`;
}

export function normalizeMessage(source: string): string {
	return source.replace(/\s+/g, " ").trim();
}
