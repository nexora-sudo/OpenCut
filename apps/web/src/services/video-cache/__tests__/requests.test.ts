import { expect, mock, test } from "bun:test";
import { VideoCache } from "../service";

test("two clips reading one file keep both requested source times", async () => {
	const cache = new VideoCache();
	// Supply only the browser decoder boundary. Exercise the real public queue
	// without requiring WebCodecs or a canvas implementation in the test runner.
	const decode = mock(async ({ time }: { time: number }) => ({
		timestamp: time,
	}));
	Object.assign(cache, {
		sinks: new Map([["shared-video", { currentFrame: null }]]),
		resolveFrame: decode,
	});
	const file = new File([], "video.webm");
	const frames = await Promise.all([
		cache.getFrameAt({ mediaId: "shared-video", file, time: 1 }),
		cache.getFrameAt({ mediaId: "shared-video", file, time: 4 }),
	]);
	expect(frames.map((frame) => frame?.timestamp)).toEqual([1, 4]);
	expect(decode).toHaveBeenCalledTimes(2);
});
