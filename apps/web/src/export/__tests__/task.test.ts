import { expect, test } from "bun:test";
import { exportStep, ExportCancelled } from "../task";
test("a stalled codec rejects with an actionable error", async () => {
	await expect(
		exportStep({
			run: () => new Promise(() => {}),
			label: "audio",
			signal: new AbortController().signal,
			timeoutMs: 5,
		}),
	).rejects.toThrow();
});
test("cancel interrupts a pending decoder without waiting for it", async () => {
	const controller = new AbortController();
	const pending = exportStep({
		run: () => new Promise(() => {}),
		label: "audio",
		signal: controller.signal,
	});
	controller.abort();
	await expect(pending).rejects.toBeInstanceOf(ExportCancelled);
});
