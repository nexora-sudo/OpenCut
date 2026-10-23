import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { resolveLocale } from "./config";
import { createTranslator } from "./translate";

export async function getLocalizedMetadata(
	metadata: Metadata,
): Promise<Metadata> {
	const locale = resolveLocale(await getLocale());
	const t = createTranslator(locale);
	return {
		...metadata,
		title: t(metadata.title),
		description: t(metadata.description),
		...(metadata.openGraph
			? {
					openGraph: {
						...metadata.openGraph,
						title: t(metadata.openGraph.title),
						description: t(metadata.openGraph.description),
						locale: locale.replace("-", "_"),
					},
				}
			: {}),
		...(metadata.twitter
			? {
					twitter: {
						...metadata.twitter,
						title: t(metadata.twitter.title),
						description: t(metadata.twitter.description),
					},
				}
			: {}),
	};
}
