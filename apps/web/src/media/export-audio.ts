import { Input, ALL_FORMATS, BlobSource, AudioBufferSink } from "mediabunny";
import type { MediaAsset } from "./types";
import type { SceneTracks } from "@/timeline";
import {
	collectAudioClips,
	createAudioContext,
	type AudioClipSource,
} from "./audio";
import { getSourceTimeAtClipTime, renderRetimedBuffer } from "@/retime";
import { createAudioClipGainResolver } from "./transition-audio";
import {
	hasAnimatedVolume,
	resolveEffectiveAudioGain,
} from "@/timeline/audio-state";
import { applyAudioMasteringToBuffer } from "./audio-mastering";
import { exportStep } from "@/export/task";
import { translate } from "@/i18n/translate";

const SAMPLE_RATE = 44100;

// Browser codec adapter: only the requested source window is decoded. Never
// assemble a full 20-minute source (or the full timeline) into PCM memory.
export async function decodeAudioWindow({
	sink,
	context,
	start,
	end,
}: {
	sink: Pick<AudioBufferSink, "buffers">;
	context: BaseAudioContext;
	start: number;
	end: number;
}): Promise<AudioBuffer> {
	const result = context.createBuffer(
		2,
		Math.max(1, Math.ceil((end - start) * context.sampleRate)),
		context.sampleRate,
	);
	for await (const { buffer, timestamp } of sink.buffers(start, end)) {
		const from = Math.max(
			0,
			Math.ceil((timestamp - start) * context.sampleRate),
		);
		const to = Math.min(
			result.length,
			Math.ceil((timestamp + buffer.duration - start) * context.sampleRate),
		);
		for (let ch = 0; ch < 2; ch++) {
			const src = buffer.getChannelData(
				Math.min(ch, buffer.numberOfChannels - 1),
			);
			const dst = result.getChannelData(ch);
			for (let i = from; i < to; i++) {
				const x =
					(start + i / context.sampleRate - timestamp) * buffer.sampleRate;
				const lo = Math.max(0, Math.min(src.length - 1, Math.floor(x)));
				const hi = Math.min(src.length - 1, lo + 1);
				dst[i] =
					src[lo] + (src[hi] - src[lo]) * Math.max(0, Math.min(1, x - lo));
			}
		}
	}
	return result;
}

export class ExportAudioRenderer {
	private inputs = new Map<string, Input>();
	private sinks = new Map<string, AudioBufferSink | null>();
	private context: AudioContext;
	private clips: AudioClipSource[];
	private signal: AbortSignal;
	private constructor({
		clips,
		signal,
	}: {
		clips: AudioClipSource[];
		signal: AbortSignal;
	}) {
		this.clips = clips;
		this.signal = signal;
		this.context = createAudioContext({ sampleRate: SAMPLE_RATE });
	}

	static async create({
		tracks,
		mediaAssets,
		signal,
	}: {
		tracks: SceneTracks;
		mediaAssets: MediaAsset[];
		signal: AbortSignal;
	}) {
		const clips = await exportStep({
			run: () => collectAudioClips({ tracks, mediaAssets, strict: true }),
			label: translate("Preparing audio"),
			signal,
		});
		const renderer = new ExportAudioRenderer({
			clips: clips.filter((c) => !c.muted && c.duration > 0),
			signal,
		});
		try {
			for (const clip of renderer.clips) {
				if (renderer.sinks.has(clip.sourceKey)) continue;
				const input = new Input({
					source: new BlobSource(clip.file),
					formats: ALL_FORMATS,
				});
				renderer.inputs.set(clip.sourceKey, input);
				const track = await exportStep({
					run: () => input.getPrimaryAudioTrack(),
					label: clip.timelineElement.name,
					signal,
				});
				if (!track) {
					renderer.sinks.set(clip.sourceKey, null);
					continue;
				}
				const supported = await exportStep({
					run: () => track.canDecode(),
					label: clip.timelineElement.name,
					signal,
				});
				if (!supported)
					throw new Error(
						translate(
							"Cannot decode audio from {v0}. Convert this file to a supported audio codec and try again.",
							{ v0: clip.timelineElement.name },
						),
					);
				renderer.sinks.set(clip.sourceKey, new AudioBufferSink(track));
			}
			return renderer;
		} catch (e) {
			await renderer.dispose();
			throw e;
		}
	}
	get hasAudio() {
		return this.clips.some((c) => this.sinks.get(c.sourceKey));
	}
	async render({
		start,
		duration,
	}: {
		start: number;
		duration: number;
	}): Promise<AudioBuffer> {
		const output = this.context.createBuffer(
			2,
			Math.max(1, Math.round(duration * SAMPLE_RATE)),
			SAMPLE_RATE,
		);
		for (const clip of this.clips) {
			const sink = this.sinks.get(clip.sourceKey);
			const from = Math.max(start, clip.startTime);
			const to = Math.min(start + duration, clip.startTime + clip.duration);
			if (!sink || to <= from) continue;
			const localFrom = from - clip.startTime;
			const sourceStart =
				clip.trimStart +
				getSourceTimeAtClipTime({ clipTime: localFrom, retime: clip.retime });
			const sourceEnd =
				clip.trimStart +
				getSourceTimeAtClipTime({
					clipTime: to - clip.startTime,
					retime: clip.retime,
				});
			try {
				const decoded = await exportStep({
					run: () =>
						decodeAudioWindow({
							sink,
							context: this.context,
							start: sourceStart,
							end: sourceEnd,
						}),
					label: clip.timelineElement.name,
					signal: this.signal,
				});
				const rendered = await exportStep({
					run: () =>
						renderRetimedBuffer({
							audioContext: this.context,
							sourceBuffer: decoded,
							trimStart: 0,
							clipDuration: to - from,
							retime: clip.retime,
							maintainPitch: clip.retime?.maintainPitch,
						}),
					label: clip.timelineElement.name,
					signal: this.signal,
				});
				const offset = Math.round((from - start) * SAMPLE_RATE);
				const resolveGain = createAudioClipGainResolver({
					clip,
					resolveBaseGain: hasAnimatedVolume({ element: clip.timelineElement })
						? (localTime) =>
								resolveEffectiveAudioGain({
									element: clip.timelineElement,
									localTime,
								})
						: undefined,
				});
				for (
					let i = 0;
					i < rendered.length && offset + i < output.length;
					i++
				) {
					const gain = resolveGain(localFrom + i / SAMPLE_RATE);
					for (let ch = 0; ch < 2; ch++)
						output.getChannelData(ch)[offset + i] +=
							rendered.getChannelData(
								Math.min(ch, rendered.numberOfChannels - 1),
							)[i] * gain;
				}
			} catch (e) {
				if (this.signal.aborted) throw e;
				throw new Error(
					translate("Audio export failed for {v0}: {v1}", {
						v0: clip.timelineElement.name,
						v1: e instanceof Error ? e.message : String(e),
					}),
				);
			}
		}
		return exportStep({
			run: () => applyAudioMasteringToBuffer({ audioBuffer: output }),
			label: translate("Mixing audio"),
			signal: this.signal,
		});
	}
	async dispose() {
		for (const input of this.inputs.values()) input.dispose();
		this.inputs.clear();
		this.sinks.clear();
		await this.context.close().catch(() => {});
	}
}
