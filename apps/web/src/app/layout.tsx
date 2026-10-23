import { getLocalizedMetadata } from "@/i18n/metadata";
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { BotIdClient } from "botid/client";
import { webEnv } from "@/env/web";
import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import { LanguageProvider } from "@/i18n/provider";
import { resolveLocale } from "@/i18n/config";

const siteFont = Inter({ subsets: ["latin"] });

const pageMetadata = baseMetaData;

export async function generateMetadata() {
	return getLocalizedMetadata(pageMetadata);
}

const protectedRoutes = [
	{
		path: "/none",
		method: "GET",
	},
];

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = resolveLocale(await getLocale());
	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<BotIdClient protect={protectedRoutes} />
				{process.env.NODE_ENV === "development" &&
					process.env.NEXT_PUBLIC_REACT_SCAN === "true" && (
						<>
							<Script
								src="//unpkg.com/react-scan/dist/auto.global.js"
								crossOrigin="anonymous"
								strategy="beforeInteractive"
							/>
						</>
					)}
			</head>
			<body className={`${siteFont.className} font-sans antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					disableTransitionOnChange={true}
				>
					<LanguageProvider initialLocale={locale}>
						<TooltipProvider>
							<Toaster />
							{webEnv.NODE_ENV === "production" && (
								<Script
									src="https://cdn.databuddy.cc/databuddy.js"
									strategy="afterInteractive"
									async
									data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
									data-track-attributes={false}
									data-track-errors={true}
									data-track-outgoing-links={false}
									data-track-web-vitals={false}
									data-track-sessions={false}
								/>
							)}
							{children}
						</TooltipProvider>
					</LanguageProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
