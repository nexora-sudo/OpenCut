import { getLocalizedMetadata } from "@/i18n/metadata";

import { useT } from "@/i18n/use-t";
import type { Metadata } from "next";
import { BasePage } from "@/app/base-page";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_LINKS } from "@/site/social";

const pageMetadata: Metadata = {
	title: "Privacy Policy - OpenCut",
	description:
		"Learn how OpenCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
	openGraph: {
		title: "Privacy Policy - OpenCut",
		description:
			"Learn how OpenCut handles your data and privacy. Our commitment to protecting your information while you edit videos.",
		type: "website",
	},
};

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

export default function PrivacyPage() {
	const t = useT();

	return (
		<BasePage
			title={t("Privacy policy")}
			description={t(
				"Learn how we handle your data and privacy. Contact us if you have any questions.",
			)}
		>
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem
					value="quick-summary"
					className="rounded-2xl border px-5"
				>
					<AccordionTrigger className="no-underline!">
						{t("Quick summary")}
					</AccordionTrigger>
					<AccordionContent>
						<h3 className="mb-3 text-lg font-medium">
							{t("Your content never leaves your device.")}
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								{t(
									"Basic editing happens locally in your browser - we never see your files",
								)}
							</li>
							<li>
								{t(
									"AI features like auto captions run locally in your browser too - nothing is uploaded",
								)}
							</li>
							<li>
								{t("OpenCut does not currently require an account or login")}
							</li>
							<li>{t("Project data stays on your device, not our servers")}</li>
							<li>
								{t(
									"We use anonymized analytics to improve the app, but no personal video content is tracked",
								)}
							</li>
							<li>
								{t("You can clear local data from your browser at any time")}
							</li>
							<li>
								{t(
									"We don't sell or share your data with anyone (we don't even have it)",
								)}
							</li>
						</ol>
						<p className="mt-4">
							{t("Questions? Email us at")}{" "}
							<a
								href="mailto:oss@opencut.app"
								className="text-primary hover:underline"
							>
								oss@opencut.app
							</a>
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					{t("How We Handle Your Content")}
				</h2>
				<p>
					<strong>
						{t("All editing and processing happens locally on your device.")}
					</strong>{" "}
					{t(
						"We never upload, store, or have access to your video or audio files. Your content remains completely private and under your control. AI-powered features like auto captions also run in your browser using on-device models - no content ever leaves your device.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					{t("Accounts & Authentication")}
				</h2>
				<p>
					{t(
						"OpenCut does not currently offer user accounts, login, or Google sign-in.",
					)}
				</p>
				<p>
					{t(
						"Because there is no account system today, we do not collect account emails, profile information, or OAuth identity data.",
					)}
				</p>
				<p>
					{t(
						"Your projects are never stored on our servers. All project data, including names, thumbnails, and creation dates, is stored locally in your browser using IndexedDB.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Analytics")}</h2>
				<p>
					{t("We use")}{" "}
					<a
						href="https://www.databuddy.cc"
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						Databuddy
					</a>{" "}
					{t(
						"for basic, anonymized visitor counts. We do not track clicks, interactions, or how you use the editor.",
					)}
				</p>
				<p>
					{t(
						"No personal information is collected, no individual users are tracked, and no data that could identify you is stored.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					{t("Local Storage & Cookies")}
				</h2>
				<p>{t("We use browser local storage and IndexedDB to:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("Save your projects locally on your device")}</li>
					<li>{t("Remember your editor preferences and settings")}</li>
					<li>
						{t(
							"Store app state needed for the editor to work between sessions",
						)}
					</li>
				</ul>
				<p>
					{t(
						"All data stays on your device and can be cleared at any time through your browser settings.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Third-Party Services")}</h2>
				<p>{t("OpenCut integrates with these services:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						<strong>Vercel:</strong> {t("For hosting and content delivery")}
					</li>
					<li>
						<strong>Databuddy:</strong> {t("For anonymized analytics")}
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Your Rights")}</h2>
				<p>{t("You have complete control over your data:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("No account is required to use OpenCut today")}</li>
					<li>{t("Clear local storage to remove all saved projects")}</li>
					<li>{t("Contact us with any privacy concerns")}</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					{t("Open Source Transparency")}
				</h2>
				<p>
					{t(
						"OpenCut is completely open source. You can review our code, see exactly how we handle data, and even self-host the application if you prefer.",
					)}
				</p>
				<p>
					{t("View our source code on")}{" "}
					<a
						href={SOCIAL_LINKS.github}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						GitHub
					</a>
					.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Contact Us")}</h2>
				<p>
					{t("Questions about this privacy policy or how we handle your data?")}
				</p>
				<p>
					{t("Open an issue on our")}{" "}
					<a
						href={`${SOCIAL_LINKS.github}/issues`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						{t("GitHub repository")}
					</a>
					{t(", email us at")}{" "}
					<a
						href="mailto:oss@opencut.app"
						className="text-primary hover:underline"
					>
						oss@opencut.app
					</a>
					{t(", or reach out on")}{" "}
					<a
						href={SOCIAL_LINKS.x}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary hover:underline"
					>
						X (Twitter)
					</a>
					.
				</p>
			</section>

			<Separator />

			<p className="text-muted-foreground text-sm">
				{t("Last updated: March 15, 2026")}
			</p>
		</BasePage>
	);
}
