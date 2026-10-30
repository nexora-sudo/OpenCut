"use client";
import { useState } from "react";
import { EditorCore } from "@/core";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import { storageService } from "@/services/storage/service";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { roundMediaTime, TICKS_PER_SECOND } from "@/wasm";
const check = (value: unknown, label: string) => {
	if (!value) throw new Error(label);
};
export default function HistoryQA() {
	const [status, setStatus] = useState("Ready");
	const [result, setResult] = useState("");
	const [ids, setIds] = useState<string[]>([]);
	const run = async () => {
		if (process.env.NODE_ENV !== "development") return;
		setStatus("Running browser storage recovery checks");
		try {
			await initializeGpuRenderer();
			const editor = EditorCore.getInstance();
			const projectId = await editor.project.createNewProject({
				name: "QA 0.4.0 History original",
			});
			if (!projectId) throw new Error("Project creation failed");
			await editor.project.loadProject({ id: projectId });
			editor.save.pause();
			const canvas = document.createElement("canvas");
			canvas.width = 320;
			canvas.height = 180;
			canvas.getContext("2d")!.fillStyle = "#da7020";
			canvas.getContext("2d")!.fillRect(0, 0, 320, 180);
			const blob = await new Promise<Blob>((resolve, reject) =>
				canvas.toBlob(
					(b) => (b ? resolve(b) : reject(Error("PNG creation"))),
					"image/png",
				),
			);
			const file = new File([blob], "qa-history.png", { type: "image/png" });
			const asset = await editor.media.addMediaAsset({
				projectId,
				asset: {
					file,
					name: file.name,
					type: "image",
					url: URL.createObjectURL(file),
					width: 320,
					height: 180,
				},
			});
			if (!asset) throw new Error("Media import failed");
			const scene = editor.scenes.getActiveScene();
			const tracks = structuredClone(scene.tracks);
			const element = buildElementFromMedia({
				mediaId: asset.id,
				mediaType: "image",
				name: "Saved original image",
				duration: roundMediaTime({ time: 5 * TICKS_PER_SECOND }),
				startTime: roundMediaTime({ time: 0 }),
			});
			tracks.main.elements = [element as (typeof tracks.main.elements)[number]];
			editor.scenes.initializeScenes({
				scenes: [{ ...scene, tracks }],
				currentSceneId: scene.id,
			});
			editor.save.resume();
			await editor.save.flush();
			await storageService.createProjectCheckpoint(projectId);
			const revisions = await storageService.listProjectHistory(projectId);
			const revision = revisions.find((r) =>
				r.project.scenes.some((s) =>
					s.tracks.main.elements.some(
						(e) => "mediaId" in e && e.mediaId === asset.id,
					),
				),
			);
			check(revision, "Snapshot contains media reference");
			const project = editor.project.getActive();
			const empty = structuredClone(project);
			empty.scenes[0].tracks.main.elements = [];
			await storageService.saveProject({ project: empty });
			await storageService.deleteMediaAsset({ projectId, id: asset.id });
			const visible = await storageService.loadAllMediaAssets({ projectId });
			check(visible.length === 0, "Removed media hidden from active bin");
			const archived = await storageService.loadMediaAsset({
				projectId,
				id: asset.id,
			});
			check(archived, "Snapshot media retained after deletion");
			if (archived) URL.revokeObjectURL(archived.url);
			const recoveredId = await storageService.restoreProjectRevision({
				projectId,
				revisionId: revision!.id,
				name: "QA 0.4.0 History recovered",
			});
			check(recoveredId !== projectId, "Restore uses independent project id");
			const original = await storageService.loadProject({ id: projectId }),
				restored = await storageService.loadProject({ id: recoveredId });
			check(
				original?.project.scenes[0].tracks.main.elements.length === 0,
				"Original current edit preserved",
			);
			check(
				restored?.project.scenes[0].tracks.main.elements.length === 1,
				"Recovered edit restored",
			);
			const media = await storageService.loadAllMediaAssets({
				projectId: recoveredId,
			});
			check(media.length === 1, "Restored media visible");
			check(
				await media[0].file
					.arrayBuffer()
					.then((b) => b.byteLength === file.size),
				"Restored file byte length unchanged",
			);
			const originalBytes = new Uint8Array(await file.arrayBuffer()),
				recoveredBytes = new Uint8Array(await media[0].file.arrayBuffer());
			check(
				originalBytes.every((v, i) => v === recoveredBytes[i]),
				"Restored bytes equal source",
			);
			media.forEach((a) => URL.revokeObjectURL(a.url));
			setIds([projectId, recoveredId]);
			setResult(
				JSON.stringify(
					{
						pass: true,
						projectId,
						recoveredId,
						revisionCount: revisions.length,
						sourceMediaBytes: file.size,
						checks: [
							"real IndexedDB + OPFS",
							"removed media retained and hidden",
							"restore creates independent id",
							"original edit unchanged",
							"restored timeline and media intact",
							"restored file bytes identical",
						],
					},
					null,
					2,
				),
			);
			setStatus("PASS");
		} catch (error) {
			setStatus("FAIL");
			setResult(String(error instanceof Error ? error.stack : error));
		}
	};
	return (
		<main className="p-8 space-y-4">
			<h1>OpenCut 0.4.0 recovery QA</h1>
			<button className="border p-3" onClick={() => void run()}>
				Run recovery checks
			</button>
			<p role="status">{status}</p>
			<pre className="whitespace-pre-wrap">{result}</pre>
			{ids.map((id, index) => (
				<p key={id}>
					<a href={`/editor/${id}`}>
						{index ? "Recovered project" : "Original project"}
					</a>
				</p>
			))}
		</main>
	);
}
