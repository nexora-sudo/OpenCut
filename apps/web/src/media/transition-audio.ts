import type { AudioClipSource } from "./audio";
type GainClip = Pick<
	AudioClipSource,
	"volume" | "transitionFade" | "gainTimeOffset"
>;

/** Browser audio adapter: use the same envelope for Web Audio scheduling and encoded samples. */
export function createAudioClipGainResolver({
	clip,
	resolveBaseGain,
}: {
	clip: GainClip;
	resolveBaseGain?: (localTime: number) => number;
}) {
	return (localTime: number) => {
		const base = resolveBaseGain
			? resolveBaseGain(localTime + (clip.gainTimeOffset ?? 0))
			: clip.volume;
		const fade = clip.transitionFade;
		if (!fade || fade.duration <= 0) return base;
		const progress = Math.max(0, Math.min(1, localTime / fade.duration));
		return base * (fade.kind === "in" ? progress : 1 - progress);
	};
}

export function scheduleAudioClipGain({
	clip,
	gain,
	startTimestamp,
	fromLocalTime,
	toLocalTime,
	resolveBaseGain,
}: {
	clip: GainClip;
	gain: {
		cancelScheduledValues(time: number): unknown;
		setValueAtTime(value: number, time: number): unknown;
		linearRampToValueAtTime(value: number, time: number): unknown;
	};
	startTimestamp: number;
	fromLocalTime: number;
	toLocalTime: number;
	resolveBaseGain?: (localTime: number) => number;
}) {
	const resolveGain = createAudioClipGainResolver({ clip, resolveBaseGain });
	gain.cancelScheduledValues(startTimestamp);
	gain.setValueAtTime(resolveGain(fromLocalTime), startTimestamp);
	if (!clip.transitionFade && !resolveBaseGain) return;
	for (let time = fromLocalTime + 1 / 60; time < toLocalTime; time += 1 / 60) {
		gain.linearRampToValueAtTime(
			resolveGain(time),
			startTimestamp + time - fromLocalTime,
		);
	}
	gain.linearRampToValueAtTime(
		resolveGain(toLocalTime),
		startTimestamp + Math.max(0, toLocalTime - fromLocalTime),
	);
}
