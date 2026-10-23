"use client";

import {
	createContext,
	useContext,
	useLayoutEffect,
	useState,
	useTransition,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/navigation";
import { LANGUAGE_NAMES, LOCALES, LOCALE_COOKIE, isLocale } from "./config";
import type { Locale } from "./config";
import { catalogs } from "./translate";

type LocaleSettings = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleSettings | null>(null);

export function LanguageProvider({
	children,
	initialLocale,
}: {
	children: React.ReactNode;
	initialLocale: Locale;
}) {
	const [locale, updateLocale] = useState(initialLocale);
	const [, startTransition] = useTransition();
	const router = useRouter();
	useLayoutEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const setLocale = (next: Locale) => {
		if (!isLocale(next)) return;
		document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
		document.documentElement.lang = next;
		updateLocale(next);
		// Refresh server-rendered text while preserving the editor and its state.
		startTransition(() => router.refresh());
	};

	return (
		<LocaleContext.Provider value={{ locale, setLocale }}>
			<NextIntlClientProvider
				locale={locale}
				messages={catalogs[locale]}
				timeZone="UTC"
			>
				{children}
			</NextIntlClientProvider>
		</LocaleContext.Provider>
	);
}

export function useLanguage() {
	const settings = useContext(LocaleContext);
	if (!settings) throw new Error("LanguageProvider is missing");
	return settings;
}

export function LanguageSelect({ id = "interface-language" }: { id?: string }) {
	const { locale, setLocale } = useLanguage();
	return (
		<select
			id={id}
			value={locale}
			onChange={(event) => {
				if (isLocale(event.target.value)) setLocale(event.target.value);
			}}
			className="bg-background border-input h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{LOCALES.map((language) => (
				<option key={language} value={language} lang={language}>
					{LANGUAGE_NAMES[language]}
				</option>
			))}
		</select>
	);
}
