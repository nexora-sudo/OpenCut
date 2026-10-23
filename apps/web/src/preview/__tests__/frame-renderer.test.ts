import { describe, expect, test } from "bun:test";
import { PreviewFrameRenderer } from "../frame-renderer";

describe("preview recovery", () => {
	test("retries the same frame after a failure and renders subsequent edits", async () => {
		const queue = new PreviewFrameRenderer<object>();
		const scene = {};
		let draws = 0;
		const errors: unknown[] = [];
		await queue.render({
			scene,
			frame: 0,
			draw: async () => {
				throw new Error("bad effect");
			},
			onError: (e) => errors.push(e),
		});
		await queue.render({
			scene,
			frame: 0,
			draw: async () => {
				draws++;
			},
			onError: (e) => errors.push(e),
		});
		await queue.render({
			scene: {},
			frame: 0,
			draw: async () => {
				draws++;
			},
			onError: (e) => errors.push(e),
		});
		await queue.render({
			scene,
			frame: 1,
			draw: async () => {
				draws++;
			},
			onError: (e) => errors.push(e),
		});
		expect(errors).toHaveLength(1);
		expect(draws).toBe(3);
	});

	test("serializes draws and only skips frames successfully completed for the same scene", async () => {
		const queue = new PreviewFrameRenderer<object>();
		const scene = {};
		let complete!: () => void;
		let draws = 0;
		const draw = async () => {
			draws++;
		};
		const onError = (e: unknown) => {
			throw e;
		};
		const pending = queue.render({
			scene,
			frame: 0,
			draw: () =>
				new Promise<void>((resolve) => {
					complete = resolve;
				}),
			onError,
		});
		await queue.render({ scene, frame: 1, draw, onError });
		expect(draws).toBe(0);
		complete();
		await pending;
		await queue.render({ scene, frame: 0, draw, onError });
		expect(draws).toBe(0);
		await queue.render({ scene, frame: 1, draw, onError });
		expect(draws).toBe(1);
	});
});
