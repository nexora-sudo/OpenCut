import type { SerializedProject, StorageAdapter } from "./types";

export type ProjectRevision = {
	id: string;
	savedAt: number;
	manual: boolean;
	project: SerializedProject;
};
export type ProjectHistoryData = { revisions: ProjectRevision[] };
export const PROJECT_HISTORY_LIMIT = 20;
const CHECKPOINT_INTERVAL_MS = 30_000;

// History belongs to this browser's storage. Files are retained once per project,
// rather than copied into every editing snapshot.
export class ProjectHistoryStorage {
	private writeQueue: Promise<unknown> = Promise.resolve();
	constructor(private adapter: StorageAdapter<ProjectHistoryData>) {}
	async list(projectId: string): Promise<ProjectRevision[]> {
		return (await this.adapter.get(projectId))?.revisions ?? [];
	}
	capture(options: {
		project: SerializedProject;
		manual?: boolean;
		now?: number;
	}): Promise<boolean> {
		// Freeze data before a queued IndexedDB read can yield to another edit.
		const snapshot = { ...options, project: structuredClone(options.project) };
		const operation = this.writeQueue
			.catch(() => {})
			.then(() => this.captureNow(snapshot));
		this.writeQueue = operation;
		return operation;
	}
	private async captureNow({
		project,
		manual = false,
		now = Date.now(),
	}: {
		project: SerializedProject;
		manual?: boolean;
		now?: number;
	}): Promise<boolean> {
		const revisions = await this.list(project.metadata.id);
		const last = revisions[0];
		if (!manual && last && now - last.savedAt < CHECKPOINT_INTERVAL_MS)
			return false;
		if (last && editingContent(last.project) === editingContent(project))
			return false;
		const revision: ProjectRevision = {
			id: crypto.randomUUID(),
			savedAt: now,
			manual,
			project: structuredClone(project),
		};
		await this.adapter.set({
			key: project.metadata.id,
			value: {
				revisions: [revision, ...revisions].slice(0, PROJECT_HISTORY_LIMIT),
			},
		});
		return true;
	}
	async referencesMedia({
		projectId,
		mediaId,
	}: {
		projectId: string;
		mediaId: string;
	}): Promise<boolean> {
		return (await this.list(projectId)).some((revision) =>
			getRevisionMediaIds(revision.project).has(mediaId),
		);
	}
	async remove(projectId: string): Promise<void> {
		await this.adapter.remove(projectId);
	}
	async clear(): Promise<void> {
		await this.adapter.clear();
	}
}

export function getRevisionMediaIds(project: SerializedProject): Set<string> {
	const ids = new Set<string>();
	for (const scene of project.scenes) {
		for (const track of [
			scene.tracks.main,
			...scene.tracks.overlay,
			...scene.tracks.audio,
		]) {
			for (const element of track.elements) {
				if ("mediaId" in element) ids.add(element.mediaId);
			}
		}
	}
	return ids;
}

function editingContent(project: SerializedProject): string {
	return JSON.stringify({
		name: project.metadata.name,
		settings: project.settings,
		currentSceneId: project.currentSceneId,
		scenes: project.scenes.map(({ updatedAt: _updatedAt, ...scene }) => scene),
	});
}
