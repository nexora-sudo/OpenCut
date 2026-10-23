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
	title: "Terms of Service - OpenCut",
	description:
		"OpenCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
	openGraph: {
		title: "Terms of Service - OpenCut",
		description:
			"OpenCut's Terms of Service. Fair, transparent terms for our free and open-source video editor.",
		type: "website",
	},
};

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

export default function TermsPage() {
	const t = useT();

	return (
		<BasePage
			title={t("Terms of service")}
			description={t(
				"Fair and transparent terms for our free, open-source video editor. Contact us if you have any questions.",
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
							{t("You own your content, we own nothing.")}
						</h3>
						<ol className="list-decimal space-y-2 pl-6">
							<li>
								{t(
									"Everything runs locally in your browser - nothing is ever uploaded to our servers",
								)}
							</li>
							<li>{t("We never claim ownership of your content")}</li>
							<li>
								{t(
									"Free for personal and commercial use with no watermarks or restrictions",
								)}
							</li>
							<li>
								{t(
									"You're responsible for how you use it - don't break the law",
								)}
							</li>
							<li>
								{t(
									'Service provided "as is" - we can\'t guarantee perfect uptime',
								)}
							</li>
							<li>
								{t(
									"Open source means you can review our code and self-host if needed",
								)}
							</li>
							<li>
								{t(
									"No account required - your exported videos are always yours",
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
					{t("Your Content, Your Rights")}
				</h2>
				<p>
					<strong>{t("You own everything you create.")}</strong>{" "}
					{t(
						"All editing and processing happens locally on your device. We never see, store, or have access to your files. We make no claims to ownership, licensing, or rights over your videos, projects, or any content you create using OpenCut.",
					)}
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("Your content never leaves your device")}</li>
					<li>
						{t("You retain all intellectual property rights to your content")}
					</li>
					<li>{t("You can export and use your content however you choose")}</li>
					<li>{t("No watermarks, no licensing restrictions from OpenCut")}</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">
					{t("How You Can Use OpenCut")}
				</h2>
				<p>{t("OpenCut is free for personal and commercial use. You can:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>
						{t(
							"Create videos for personal, educational, or commercial purposes",
						)}
					</li>
					<li>{t("Use OpenCut for client work and paid projects")}</li>
					<li>{t("Share and distribute videos created with OpenCut")}</li>
					<li>
						{t(
							"Modify and distribute the OpenCut software (under MIT license)",
						)}
					</li>
				</ul>
				<p>
					{t(
						"You're responsible for how you use OpenCut and the content you create. Don't use it for anything illegal in your jurisdiction.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("AI Features")}</h2>
				<p>
					{t(
						"AI features like auto captions run entirely in your browser using on-device models. No content is uploaded to any server. These features are optional - you can use OpenCut without them.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Service")}</h2>
				<p>
					{t(
						'OpenCut does not currently require an account. The service is provided "as is" without warranties. While we strive for reliability, we can\'t guarantee uninterrupted service.',
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Open Source Benefits")}</h2>
				<p>
					{t("Because OpenCut is open source, you have additional rights:")}
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("Review our code to see exactly how we handle your data")}</li>
					<li>{t("Self-host OpenCut on your own servers")}</li>
					<li>{t("Modify the software to suit your needs")}</li>
					<li>{t("Contribute improvements back to the community")}</li>
				</ul>
				<p>
					{t("View our source code and license on")}{" "}
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
				<h2 className="text-2xl font-semibold">
					{t("Limitations and Liability")}
				</h2>
				<p>
					{t(
						"OpenCut is provided free of charge. To the extent permitted by law:",
					)}
				</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("We're not liable for any loss of data or content")}</li>
					<li>
						{t(
							"Projects are stored in your browser and may be lost if you clear browser data",
						)}
					</li>
					<li>{t("We're not responsible for how you use the service")}</li>
					<li>
						{t("Our liability is limited to the maximum extent allowed by law")}
					</li>
				</ul>
				<p>
					{t(
						"Since your content stays on your device, we have no way to recover lost projects. Consider exporting important videos when finished editing.",
					)}
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Service Changes")}</h2>
				<p>{t("We may update OpenCut and these terms:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("We'll notify you of significant changes to these terms")}</li>
					<li>{t("Continued use means you accept any updates")}</li>
					<li>
						{t("You can always self-host an older version if you prefer")}
					</li>
					<li>
						{t("Major changes will be discussed with the community on GitHub")}
					</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Stopping Use")}</h2>
				<p>{t("You can stop using OpenCut at any time:")}</p>
				<ul className="list-disc space-y-2 pl-6">
					<li>{t("Clear your browser data to remove local projects")}</li>
				</ul>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-2xl font-semibold">{t("Contact Us")}</h2>
				<p>{t("Questions about these terms or need to report an issue?")}</p>
				<p>
					{t("Contact us through our")}{" "}
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
				<p>
					{t(
						"These terms are governed by applicable law in your jurisdiction. We prefer to resolve disputes through friendly discussion in our open-source community.",
					)}
				</p>
			</section>
			<Separator />
			<p className="text-muted-foreground text-sm">
				{t("Last updated: March 15, 2026")}
			</p>
		</BasePage>
	);
}
