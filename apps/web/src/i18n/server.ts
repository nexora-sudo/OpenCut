import { getLocale } from "next-intl/server";
import { resolveLocale } from "./config";
import { createTranslator } from "./translate";

export async function getT() {
	return createTranslator(resolveLocale(await getLocale()));
}
