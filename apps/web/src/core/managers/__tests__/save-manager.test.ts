/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- Deliberate minimal EditorCore test doubles isolate persistence failures. */
import { expect, test } from "bun:test";
import { SaveManager } from "../save-manager";
import type { EditorCore } from "@/core";
function editor(save: () => Promise<void>) {
	return {
		project: {
			getActiveOrNull: () => ({}),
			getIsLoading: () => false,
			getMigrationState: () => ({ isMigrating: false }),
			saveCurrentProject: save,
		},
	} as unknown as EditorCore;
}
test("failed persistence remains dirty, is visible and can be retried", async () => {
	let fails = true;
	let count = 0;
	const manager = new SaveManager({
		editor: editor(async () => {
			count++;
			if (fails) throw new Error("disk full");
		}),
	});
	await expect(manager.flush()).rejects.toThrow("disk full");
	expect(manager.getState().status).toBe("error");
	expect(manager.getIsDirty()).toBe(true);
	fails = false;
	await manager.flush();
	expect(manager.getState().status).toBe("saved");
	expect(manager.getIsDirty()).toBe(false);
	expect(count).toBe(2);
});
test("flush waits for an in-flight save and writes edits made during that save", async () => {
	let release!: () => void;
	let count = 0;
	const manager = new SaveManager({
		editor: editor(async () => {
			count++;
			if (count === 1)
				await new Promise<void>((r) => {
					release = r;
				});
		}),
	});
	const first = manager.flush();
	await Promise.resolve();
	await Promise.resolve();
	manager.markDirty();
	let completed = false;
	const second = manager.flush().then(() => {
		completed = true;
	});
	await Promise.resolve();
	expect(completed).toBe(false);
	release();
	await Promise.all([first, second]);
	expect(count).toBe(2);
	expect(manager.getState().status).toBe("saved");
	manager.stop();
});
