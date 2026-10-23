/* eslint-disable opencut/prefer-object-params -- Translators keep the conventional t(message, values) call signature. */
import {
	DEFAULT_LOCALE,
	messageId,
	normalizeMessage,
	resolveLocale,
} from "./config";
import type { Locale } from "./config";
import en from "./messages/en.json";
import ptBR from "./messages/pt-BR.json";
import zhCN from "./messages/zh-CN.json";

export type Messages = Record<string, string>;
export type TranslationValues = Record<
	string,
	string | number | null | undefined
>;
export const catalogs: Record<Locale, Messages> = {
	en,
	"pt-BR": ptBR,
	"zh-CN": zhCN,
};

const templatePatterns = Object.entries(en).flatMap(([id, source]) => {
	const keys = [...source.matchAll(/\{(v\d+)\}/g)].map((match) => match[1]);
	if (!keys.length) return [];
	const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = escaped.replace(/\\\{v\d+\\\}/g, "(.*?)");
	return [{ id, keys, pattern: new RegExp(`^${pattern}$`, "s") }];
});

export function createTranslator(locale: Locale) {
	function t<T>(source: T, values?: TranslationValues): T;
	function t(source: unknown, values: TranslationValues = {}): unknown {
		if (typeof source !== "string") return source;
		const message = normalizeMessage(source);
		let translated = catalogs[locale][messageId(message)];
		// Services can produce interpolated error/status text before it reaches React.
		if (translated === undefined && locale !== "en") {
			for (const template of templatePatterns) {
				const match = template.pattern.exec(message);
				if (!match) continue;
				translated = catalogs[locale][template.id].replace(
					/\{(v\d+)\}/g,
					(placeholder, key: string) =>
						match[template.keys.indexOf(key) + 1] ?? placeholder,
				);
				break;
			}
		}
		translated ??= source;
		return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
			Object.prototype.hasOwnProperty.call(values, key)
				? String(values[key])
				: placeholder,
		);
	}
	return Object.assign(t, { locale });
}

export function getClientLocale(): Locale {
	if (typeof document === "undefined") return DEFAULT_LOCALE;
	return resolveLocale(document.documentElement.lang);
}

// For event handlers and editor services outside React. Components use useT.
export function translate<T>(source: T, values?: TranslationValues): T {
	return createTranslator(getClientLocale())(source, values);
}
