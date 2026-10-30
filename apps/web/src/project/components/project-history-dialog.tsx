"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { useT } from "@/i18n/use-t";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { storageService } from "@/services/storage/service";
import type { ProjectRevision } from "@/services/storage/project-history";

export function ProjectHistoryDialog() {
	const editor = useEditor();
	const t = useT();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
	const [error, setError] = useState<string | null>(null);
	const refresh = async () => {
		setBusy(true);
		setError(null);
		try {
			const id = editor.project.getActive().metadata.id;
			setRevisions(await storageService.listProjectHistory(id));
			setError(storageService.getProjectHistoryWarning(id));
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	};
	const checkpoint = async () => {
		setBusy(true);
		setError(null);
		try {
			await editor.save.flush();
			await storageService.createProjectCheckpoint(
				editor.project.getActive().metadata.id,
			);
			await refresh();
			toast.success(t("Editing snapshot saved"));
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	};
	const restore = async (revision: ProjectRevision) => {
		setBusy(true);
		setError(null);
		try {
			await editor.save.flush();
			const id = await storageService.restoreProjectRevision({
				projectId: editor.project.getActive().metadata.id,
				revisionId: revision.id,
				name: `${revision.project.metadata.name} (${t("Recovered")})`,
			});
			await editor.project.loadAllProjects();
			setOpen(false);
			router.push(`/editor/${id}`);
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	};
	return (
		<>
			<Button
				size="sm"
				variant="outline"
				onClick={() => {
					setOpen(true);
					void refresh();
				}}
			>
				{t("Editing history")}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(value) => {
					if (!busy) setOpen(value);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("Editing history")}</DialogTitle>
						<DialogDescription>
							{t(
								"Keep up to 20 recent editing snapshots in this browser. Automatic snapshots are spaced at least 30 seconds apart. Restoring creates a new project.",
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<p className="text-muted-foreground text-xs">
							{t(
								"History is not a portable backup. Clearing browser storage or deleting this project also removes its history.",
							)}
						</p>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => void checkpoint()}
						>
							{t("Save snapshot now")}
						</Button>
						{error && (
							<p role="alert" className="text-destructive text-sm">
								{error}
							</p>
						)}
						<div className="max-h-72 space-y-2 overflow-auto" aria-busy={busy}>
							{revisions.length === 0 && (
								<p className="text-muted-foreground text-sm">
									{t(busy ? "Loading history..." : "No editing snapshots yet.")}
								</p>
							)}
							{revisions.map((revision) => (
								<div
									key={revision.id}
									className="flex items-center justify-between gap-3 rounded border p-3"
								>
									<div className="min-w-0 text-sm">
										<p>
											{new Intl.DateTimeFormat(t.locale, {
												dateStyle: "short",
												timeStyle: "medium",
											}).format(revision.savedAt)}
										</p>
										<p className="text-muted-foreground text-xs">
											{t(
												revision.manual
													? "Manual snapshot"
													: "Automatic snapshot",
											)}
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={busy}
										onClick={() => void restore(revision)}
									>
										{t("Restore as new project")}
									</Button>
								</div>
							))}
						</div>
					</DialogBody>
				</DialogContent>
			</Dialog>
		</>
	);
}
