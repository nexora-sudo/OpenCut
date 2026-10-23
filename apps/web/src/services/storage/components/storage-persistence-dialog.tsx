"use client";
import { useT } from "@/i18n/use-t";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useStoragePersistence } from "@/services/storage/use-storage-persistence";

export function StoragePersistenceDialog() {
	const t = useT();

	const { showDialog, onConfirm, onDismiss } = useStoragePersistence();

	return (
		<Dialog open={showDialog} onOpenChange={(open) => !open && onDismiss()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("Don't lose your projects")}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<p className="text-base text-muted-foreground">
						{t(
							"Your browser can automatically delete your projects when storage runs low.",
						)}
					</p>
					<p className="text-base text-muted-foreground">
						{t("Allow OpenCut to protect them?")}
					</p>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={onDismiss}>
						{t("Not now")}
					</Button>
					<Button onClick={onConfirm}>{t("Allow")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
