import { describe, expect, test } from "bun:test";
import {
	ProjectHistoryStorage,
	PROJECT_HISTORY_LIMIT,
} from "../project-history";
import type { ProjectHistoryData } from "../project-history";
import type { SerializedProject, StorageAdapter } from "../types";

function makeStorage() {
	const values = new Map<string, ProjectHistoryData>();
	const adapter: StorageAdapter<ProjectHistoryData> = {
		async get(key) {
			return structuredClone(values.get(key) ?? null);
		},
		async set({ key, value }) {
			values.set(key, structuredClone(value));
		},
		async remove(key) {
			values.delete(key);
		},
		async list() {
			return [...values.keys()];
		},
		async clear() {
			values.clear();
		},
	};
	return new ProjectHistoryStorage(adapter);
}
function project({
	name = "Original",
	mediaId = "video-1",
}: { name?: string; mediaId?: string } = {}): SerializedProject {
	return {
		metadata: {
			id: "project-1",
			name,
			duration: 10,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		},
		currentSceneId: "scene-1",
		version: 1,
		settings: {
			fps: { numerator: 30, denominator: 1 },
			canvasSize: { width: 1280, height: 720 },
			background: { type: "color", color: "#000000" },
		},
		scenes: [
			{
				id: "scene-1",
				name: "Main scene",
				isMain: true,
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				bookmarks: [],
				tracks: {
					main: {
						id: "main",
						name: "Main",
						type: "video",
						muted: false,
						hidden: false,
						elements: [
							{
								id: "clip",
								type: "video",
								name: "Clip",
								mediaId,
								startTime: 0,
								duration: 10,
								trimStart: 0,
								trimEnd: 0,
								params: {},
							},
						],
					},
					overlay: [],
					audio: [],
				},
			},
		],
	};
}

describe("browser editing history", () => {
	test("automatic snapshots are spaced, while explicit checkpoints bypass the interval", async () => {
		const history = makeStorage();
		expect(await history.capture({ project: project(), now: 0 })).toBe(true);
		expect(
			await history.capture({
				project: project({ name: "Edit 1" }),
				now: 1000,
			}),
		).toBe(false);
		expect(
			await history.capture({
				project: project({ name: "Edit 1" }),
				now: 1000,
				manual: true,
			}),
		).toBe(true);
		expect(
			await history.capture({
				project: project({ name: "Edit 2" }),
				now: 31000,
			}),
		).toBe(true);
		expect(
			(await history.list("project-1")).map(
				(item) => item.project.metadata.name,
			),
		).toEqual(["Edit 2", "Edit 1", "Original"]);
	});
	test("view changes and timestamps do not consume editing history", async () => {
		const history = makeStorage();
		const snapshot = project();
		await history.capture({ project: snapshot, now: 0 });
		snapshot.metadata.updatedAt = "2026-02-01T00:00:00Z";
		snapshot.metadata.thumbnail = "different thumbnail";
		snapshot.scenes[0].updatedAt = snapshot.metadata.updatedAt;
		snapshot.timelineViewState = {
			zoomLevel: 2,
			scrollLeft: 10,
			playheadTime: 5,
		};
		expect(await history.capture({ project: snapshot, now: 31000 })).toBe(
			false,
		);
		expect(await history.list("project-1")).toHaveLength(1);
	});
	test("retains only the newest 20 independent snapshots and releases expired media references", async () => {
		const history = makeStorage();
		for (let index = 0; index < 23; index++)
			await history.capture({
				project: project({ name: `Edit ${index}`, mediaId: `media-${index}` }),
				now: index * 31000,
			});
		const revisions = await history.list("project-1");
		expect(revisions).toHaveLength(PROJECT_HISTORY_LIMIT);
		expect(revisions[0].project.metadata.name).toBe("Edit 22");
		expect(
			await history.referencesMedia({
				projectId: "project-1",
				mediaId: "media-0",
			}),
		).toBe(false);
		expect(
			await history.referencesMedia({
				projectId: "project-1",
				mediaId: "media-3",
			}),
		).toBe(true);
		revisions[0].project.metadata.name = "Mutated outside storage";
		expect((await history.list("project-1"))[0].project.metadata.name).toBe(
			"Edit 22",
		);
		await history.remove("project-1");
		expect(await history.list("project-1")).toEqual([]);
	});
	test("queued saves preserve the moment captured and do not lose concurrent snapshots", async () => {
		const history = makeStorage();
		const source = project({ name: "First" });
		const first = history.capture({ project: source, manual: true });
		source.metadata.name = "Second";
		const second = history.capture({ project: source, manual: true });
		await Promise.all([first, second]);
		expect(
			(await history.list("project-1")).map(
				(item) => item.project.metadata.name,
			),
		).toEqual(["Second", "First"]);
	});
});
