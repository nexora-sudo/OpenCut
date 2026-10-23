"use client";
import { useT } from "@/i18n/use-t";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useEditor } from "@/editor/use-editor";
import { Loader2 } from "lucide-react";

export function MigrationDialog() {
	const t = useT();

	const editor = useEditor();
	const migrationState = editor.project.getMigrationState();

	if (!migrationState.isMigrating) return null;

	const title = migrationState.projectName
		? t("Updating project")
		: t("Updating projects");
	const description = migrationState.projectName
		? t('Upgrading "{v0}" from v{v1} to v{v2}', {
				v0: migrationState.projectName,
				v1: migrationState.fromVersion,
				v2: migrationState.toVersion,
			})
		: t("Upgrading projects from v{v0} to v{v1}", {
				v0: migrationState.fromVersion,
				v1: migrationState.toVersion,
			});

	return (
		<Dialog open={true}>
			<DialogContent
				className="sm:max-w-md"
				onPointerDownOutside={(event) => event.preventDefault()}
				onEscapeKeyDown={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>{t(title)}</DialogTitle>
					<DialogDescription>{t(description)}</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-center py-4">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
				</div>
			</DialogContent>
		</Dialog>
	);
}
