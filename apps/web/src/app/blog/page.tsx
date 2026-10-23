import { getLocalizedMetadata } from "@/i18n/metadata";

import { useT } from "@/i18n/use-t";
import { getT } from "@/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { BasePage } from "@/app/base-page";
import { Separator } from "@/components/ui/separator";
import { getPosts } from "@/blog/query";
import type { Post } from "@/blog/types";

const pageMetadata: Metadata = {
	title: "Blog - OpenCut",
	description:
		"Read the latest news and updates about OpenCut, the free and open-source video editor.",
	openGraph: {
		title: "Blog - OpenCut",
		description:
			"Read the latest news and updates about OpenCut, the free and open-source video editor.",
		type: "website",
	},
};

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

export default async function BlogPage() {
	const t = await getT();

	const data = await getPosts().catch(() => null);
	if (!data || !data.posts) return <div>{t("No posts yet")}</div>;

	return (
		<BasePage
			title={t("Blog")}
			description={t(
				"Read the latest news and updates about OpenCut, the free and open-source video editor.",
			)}
		>
			<div className="flex flex-col">
				{data.posts.map((post) => (
					<div key={post.id} className="flex flex-col">
						<BlogPostItem post={post} />
						<Separator />
					</div>
				))}
			</div>
		</BasePage>
	);
}

function BlogPostItem({ post }: { post: Post }) {
	const t = useT();

	return (
		<Link href={`/blog/${post.slug}`}>
			<div className="flex h-auto w-full items-center justify-between py-6 opacity-100 hover:opacity-75">
				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-semibold">{t(post.title)}</h2>
					<p className="text-muted-foreground">{t(post.description)}</p>
				</div>
			</div>
		</Link>
	);
}
