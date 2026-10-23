"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogBody,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LanguageSelect } from "./provider";
import { useT } from "./use-t";

export function LanguageSettings() {
	const t = useT();
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={t("Settings")}
					title={t("Settings")}
				>
					<Settings className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("Settings")}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<div className="flex flex-col gap-2">
						<Label htmlFor="dialog-language">{t("Interface language")}</Label>
						<LanguageSelect id="dialog-language" />
						<p className="text-muted-foreground text-sm">
							{t(
								"Your language preference is saved in this browser. Your projects and media are not changed.",
							)}
						</p>
					</div>
				</DialogBody>
			</DialogContent>
		</Dialog>
	);
}
