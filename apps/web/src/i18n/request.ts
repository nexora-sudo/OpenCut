import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, resolveLocale } from "./config";
import { catalogs } from "./translate";

export default getRequestConfig(async () => {
	const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
	return { locale, messages: catalogs[locale], timeZone: "UTC" };
});
