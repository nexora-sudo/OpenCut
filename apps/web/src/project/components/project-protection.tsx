"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { useT } from "@/i18n/use-t";
import { Button } from "@/components/ui/button";
import { createProjectBackup, readProjectBackup } from "@/project/backup";
import { downloadBlob } from "@/utils/browser";
import { storageService } from "@/services/storage/service";
import { CURRENT_PROJECT_VERSION } from "@/services/storage/migrations";

export function ProjectProtection() {
	const editor = useEditor();
	const t = useT();
	const save = useEditor((e) => e.save.getState());
	const [busy, setBusy] = useState(false);
	const backup = async () => {
		setBusy(true);
		try {
			const active = editor.project.getActive();
			// Snapshot the live editor, including edits that could not be saved to disk.
			const cleanTracks = (
				tracks: (typeof active.scenes)[number]["tracks"],
			) => ({
				...tracks,
				audio: tracks.audio.map((track) => ({
					...track,
					elements: track.elements.map((element) => ({
						...element,
						buffer: undefined,
					})),
				})),
			});
			const project = structuredClone({
				...active,
				scenes: editor.scenes
					.getScenes()
					.map((scene) => ({ ...scene, tracks: cleanTracks(scene.tracks) })),
			});
			const assets = [...editor.media.getAssets()];
			for (const scene of project.scenes)
				for (const track of [
					scene.tracks.main,
					...scene.tracks.overlay,
					...scene.tracks.audio,
				])
					for (let i = 0; i < track.elements.length; i++) {
						const element = track.elements[i];
						if (element.type === "audio" && element.sourceType === "library") {
							const response = await fetch(element.sourceUrl, {
								signal: AbortSignal.timeout(120000),
							});
							if (!response.ok)
								throw new Error(t("Cannot download library audio for backup."));
							const file = new File(
								[await response.blob()],
								`${element.name}.audio`,
								{ type: response.headers.get("content-type") ?? "audio/mpeg" },
							);
							const id = crypto.randomUUID();
							assets.push({ id, name: element.name, type: "audio", file });
							track.elements[i] = {
								...element,
								sourceType: "upload",
								mediaId: id,
							};
						}
					}
			const blob = createProjectBackup({ project, mediaAssets: assets });
			downloadBlob({
				blob,
				filename: `${active.metadata.name.replace(/[<>:"/\\|?*]/g, "-")}.opencut`,
			});
			toast.success(t("Backup ready. Keep this file somewhere safe."));
		} catch (e) {
			toast.error(t("Backup failed"), {
				description: e instanceof Error ? e.message : String(e),
			});
		} finally {
			setBusy(false);
		}
	};
	return (
		<div className="flex items-center gap-2 text-xs">
			<span
				role="status"
				className={
					save.status === "error" ? "text-destructive" : "text-muted-foreground"
				}
				title={
					save.error ??
					t(
						"Projects are stored only in this browser. A backup can be restored in another browser.",
					)
				}
			>
				{t(
					save.status === "saved"
						? "Saved in this browser"
						: save.status === "saving"
							? "Saving..."
							: save.status === "error"
								? "Save failed"
								: "Unsaved changes",
				)}{" "}
				{save.status === "saved" && save.savedAt
					? new Intl.DateTimeFormat(t.locale, {
							hour: "2-digit",
							minute: "2-digit",
							second: "2-digit",
						}).format(save.savedAt)
					: ""}
			</span>
			{save.status === "error" && (
				<Button
					size="sm"
					variant="outline"
					onClick={() =>
						void editor.save.flush().catch(() => toast.error(t("Save failed")))
					}
				>
					{t("Retry save")}
				</Button>
			)}
			<Button
				size="sm"
				variant="outline"
				disabled={busy}
				onClick={() => void backup()}
			>
				{t(busy ? "Preparing backup..." : "Download backup")}
			</Button>
		</div>
	);
}

export function RestoreProjectBackup() {
	const editor = useEditor();
	const t = useT();
	const router = useRouter();
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const restore = async (file: File) => {
		setBusy(true);
		const id = crypto.randomUUID();
		let started = false;
		try {
			const { project, mediaAssets } = await readProjectBackup(file);
			if (project.version > CURRENT_PROJECT_VERSION)
				throw new Error(
					t("This backup was created by a newer editor version."),
				);
			// Restores into a new project. Existing projects are never overwritten.
			project.metadata.id = id;
			project.metadata.name += ` (${t("Restored")})`;
			project.metadata.updatedAt = new Date();
			started = true;
			for (const mediaAsset of mediaAssets)
				await storageService.saveMediaAsset({ projectId: id, mediaAsset });
			await storageService.saveProject({ project });
			await editor.project.loadAllProjects();
			router.push(`/editor/${id}`);
		} catch (e) {
			if (started) {
				await storageService
					.deleteProjectMedia({ projectId: id })
					.catch(() => {});
				await storageService.deleteProject({ id }).catch(() => {});
			}
			toast.error(t("Restore failed"), {
				description: e instanceof Error ? e.message : String(e),
			});
		} finally {
			setBusy(false);
			if (input.current) input.current.value = "";
		}
	};
	return (
		<>
			<input
				ref={input}
				type="file"
				accept=".opencut"
				className="hidden"
				aria-label={t("Restore backup")}
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) void restore(file);
				}}
			/>
			<Button
				variant="outline"
				disabled={busy}
				onClick={() => input.current?.click()}
			>
				{t(busy ? "Restoring backup..." : "Restore backup")}
			</Button>
		</>
	);
}
