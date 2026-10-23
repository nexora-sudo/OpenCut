import { getLocalizedMetadata } from "@/i18n/metadata";

import { useT } from "@/i18n/use-t";
import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import { Separator } from "@/components/ui/separator";
import {
	type Release as ReleaseType,
	getSortedReleases,
} from "@/changelog/utils";
import {
	ReleaseArticle,
	ReleaseMeta,
	ReleaseTitle,
	ReleaseDescription,
	ReleaseChanges,
} from "@/changelog/components/release";

const pageMetadata: Metadata = {
	title: "Changelog - OpenCut",
	description: "What's new in OpenCut",
	openGraph: {
		title: "Changelog - OpenCut",
		description: "Every update, improvement, and fix to OpenCut — documented.",
		type: "website",
		images: [
			{
				url: "/open-graph/changlog.jpg",
				width: 1200,
				height: 630,
				alt: "OpenCut Changelog",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Changelog - OpenCut",
		description: "What's new in OpenCut",
		images: ["/open-graph/changlog.jpg"],
	},
};

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

export default function ChangelogPage() {
	const t = useT();

	const releases = getSortedReleases();

	return (
		<BasePage
			title={t("Changelog")}
			description={t("See what's new in OpenCut")}
		>
			<div className="mx-auto w-full max-w-3xl">
				<div className="relative">
					<div
						aria-hidden
						className="absolute top-2 bottom-0 left-[5px] w-px bg-border hidden sm:block"
					/>

					<div className="flex flex-col">
						{releases.map((release, releaseIndex) => (
							<div key={release.version} className="flex flex-col">
								<ReleaseEntry release={release} />
								{releaseIndex < releases.length - 1 && (
									<Separator className="my-10 sm:ml-1.5" />
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</BasePage>
	);
}

function ReleaseEntry({ release }: { release: ReleaseType }) {
	const t = useT();

	return (
		<ReleaseArticle variant="list" isLatest={release.isLatest}>
			<ReleaseMeta release={release} />
			<div className="flex flex-col gap-4">
				<ReleaseTitle as="h2" href={`/changelog/${release.version}`}>
					{t(release.title)}
				</ReleaseTitle>
				{release.description && (
					<ReleaseDescription>{t(release.description)}</ReleaseDescription>
				)}
			</div>
			<ReleaseChanges release={release} />
		</ReleaseArticle>
	);
}
