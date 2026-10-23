import { getClientLocale } from "@/i18n/translate";

export function formatDate({
	date,
	locale = getClientLocale(),
}: {
	date: Date;
	locale?: string;
}): string {
	return date.toLocaleDateString(locale, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}
