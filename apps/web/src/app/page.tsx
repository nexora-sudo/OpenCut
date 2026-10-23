import { getLocalizedMetadata } from "@/i18n/metadata";
import { Hero } from "@/components/landing/hero";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { SITE_URL } from "@/site/brand";

const pageMetadata: Metadata = {
	alternates: {
		canonical: SITE_URL,
	},
};

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

export default async function Home() {
	return (
		<div>
			<Header />
			<Hero />
			<Footer />
		</div>
	);
}
