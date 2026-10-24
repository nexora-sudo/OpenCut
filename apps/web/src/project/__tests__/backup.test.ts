import { expect, test } from "bun:test";
import { createProjectBackup, readProjectBackup } from "../backup";
import type { TProject } from "../types";
const project = {
	metadata: {
		id: "original",
		name: "Demo",
		duration: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	settings: {
		canvasSize: { width: 640, height: 360 },
		fps: { numerator: 30, denominator: 1 },
		background: { type: "color", color: "#000000" },
	},
	currentSceneId: "scene",
	version: 31,
	scenes: [
		{
			id: "scene",
			name: "Main",
			isMain: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			bookmarks: [],
			tracks: {
				main: {
					id: "video",
					name: "Video",
					type: "video",
					muted: false,
					hidden: false,
					elements: [],
				},
				overlay: [],
				audio: [],
			},
		},
	],
} as TProject;
test("portable backup round-trips media bytes, settings, dates and metadata", async () => {
	const file = new File([new Uint8Array([1, 2, 3, 4])], "speech.mp4", {
		type: "video/mp4",
		lastModified: 12345,
	});
	const backup = createProjectBackup({
		project,
		mediaAssets: [
			{
				id: "source",
				name: "Speech",
				type: "video",
				file,
				hasAudio: true,
				fps: 30,
			},
		],
	});
	const restored = await readProjectBackup(backup);
	expect(restored.project).toEqual(project);
	expect(restored.mediaAssets[0].hasAudio).toBe(true);
	expect(await restored.mediaAssets[0].file.arrayBuffer()).toEqual(
		await file.arrayBuffer(),
	);
	expect(restored.mediaAssets[0].file.name).toBe("speech.mp4");
});
test("truncated or foreign backups are rejected before any write", async () => {
	const backup = createProjectBackup({
		project,
		mediaAssets: [
			{
				id: "source",
				name: "Clip",
				type: "video",
				file: new File(["1234"], "clip.mp4"),
			},
		],
	});
	await expect(
		readProjectBackup(backup.slice(0, backup.size - 1)),
	).rejects.toThrow();
	await expect(
		readProjectBackup(new Blob(["invalid backup"])),
	).rejects.toThrow();
});

test("a backup never reports success when referenced media are missing", () => {
	const broken = structuredClone(project);
	broken.scenes[0].tracks.main.elements.push({
		id: "clip",
		type: "video",
		mediaId: "missing",
		name: "Missing clip",
		startTime: project.metadata.duration,
		duration: project.metadata.duration,
		trimStart: project.metadata.duration,
		trimEnd: project.metadata.duration,
		params: {},
	});
	expect(() =>
		createProjectBackup({ project: broken, mediaAssets: [] }),
	).toThrow();
});
