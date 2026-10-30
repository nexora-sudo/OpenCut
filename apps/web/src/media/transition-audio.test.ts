/* eslint-disable opencut/prefer-object-params -- Test doubles implement the native Web Audio positional API. */
import { expect, test } from "bun:test";
import type { AudioClipSource } from "./audio";
import {
	createAudioClipGainResolver,
	scheduleAudioClipGain,
} from "./transition-audio";

const clip = (fade?: AudioClipSource["transitionFade"]) => ({
	volume: 0.8,
	transitionFade: fade,
});
test("transition envelopes preserve level through the blend and clamp outside its window", () => {
	const incoming = createAudioClipGainResolver({
		clip: clip({ kind: "in", duration: 1 }),
	});
	const outgoing = createAudioClipGainResolver({
		clip: clip({ kind: "out", duration: 1 }),
	});
	expect(incoming(-0.5)).toBe(0);
	expect(outgoing(1.5)).toBe(0);
	for (const time of [0, 0.1, 0.5, 0.9, 1]) {
		expect(incoming(time) + outgoing(time)).toBeCloseTo(0.8, 7);
	}
	expect(incoming(0.5)).toBeCloseTo(0.4);
	expect(outgoing(0.5)).toBeCloseTo(0.4);
});

test("preview scheduling starts a crossfade at its actual seek position and reaches silence", () => {
	const points: Array<{ value: number; time: number }> = [];
	const param = {
		cancelScheduledValues: () => {},
		setValueAtTime: (value: number, time: number) =>
			points.push({ value, time }),
		linearRampToValueAtTime: (value: number, time: number) =>
			points.push({ value, time }),
	};
	scheduleAudioClipGain({
		clip: clip({ kind: "out", duration: 1 }),
		gain: param,
		startTimestamp: 10,
		fromLocalTime: 0.5,
		toLocalTime: 1,
	});
	expect(points[0]).toEqual({ value: 0.4, time: 10 });
	expect(points.at(-1)).toEqual({ value: 0, time: 10.5 });
	expect(points.every((point) => point.time >= 10 && point.time <= 10.5)).toBe(
		true,
	);
});

test("an ordinary constant-volume clip does not generate a long automation schedule", () => {
	const points: number[] = [];
	const param = {
		cancelScheduledValues: () => {},
		setValueAtTime: (value: number) => points.push(value),
		linearRampToValueAtTime: () => {
			throw new Error("Unexpected automation");
		},
	};
	scheduleAudioClipGain({
		clip: clip(),
		gain: param,
		startTimestamp: 0,
		fromLocalTime: 0,
		toLocalTime: 3600,
	});
	expect(points).toEqual([0.8]);
});
