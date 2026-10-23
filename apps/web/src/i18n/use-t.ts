import { useLocale } from "next-intl";
import { useMemo } from "react";
import { resolveLocale } from "./config";
import { createTranslator } from "./translate";

export function useT() {
	const locale = resolveLocale(useLocale());
	return useMemo(() => createTranslator(locale), [locale]);
}
