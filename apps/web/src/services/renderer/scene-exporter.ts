import EventEmitter from "eventemitter3";
import {
	Output,
	Mp4OutputFormat,
	WebMOutputFormat,
	CanvasSource,
	AudioSample,
	AudioSampleSource,
	canEncodeAudio,
	canEncodeVideo,
	QUALITY_LOW,
	QUALITY_MEDIUM,
	QUALITY_HIGH,
	QUALITY_VERY_HIGH,
} from "mediabunny";
import type { FrameRate } from "opencut-wasm";
import { TICKS_PER_SECOND } from "@/wasm";
import { frameRateToFloat } from "@/fps/utils";
import type { RootNode } from "./nodes/root-node";
import {
	getExportMimeType,
	type ExportFormat,
	type ExportQuality,
	type ExportResult,
	type ExportStatistics,
} from "@/export";
import { CanvasRenderer } from "./canvas-renderer";
import type { ExportAudioRenderer } from "@/media/export-audio";
import { createExportOutput } from "@/export/output-target";
import { exportStep, ExportCancelled } from "@/export/task";
import { translate } from "@/i18n/translate";

const qualityMap = {
	low: QUALITY_LOW,
	medium: QUALITY_MEDIUM,
	high: QUALITY_HIGH,
	very_high: QUALITY_VERY_HIGH,
};
export class SceneExporter extends EventEmitter<{
	progress: [progress: number, stage: string, statistics?: ExportStatistics];
}> {
	private renderer: CanvasRenderer;
	private controller = new AbortController();
	constructor(
		private options: {
			width: number;
			height: number;
			fps: FrameRate;
			format: ExportFormat;
			quality: ExportQuality;
			sourceSize?: { width: number; height: number };
			audio?: ExportAudioRenderer;
		},
	) {
		super();
		this.renderer = new CanvasRenderer({ ...options, ...options.sourceSize });
	}
	cancel() {
		this.controller.abort();
	}
	async export({ rootNode }: { rootNode: RootNode }): Promise<ExportResult> {
		const signal = this.controller.signal;
		// Keep each timed browser operation readable as step(label, action).
		// eslint-disable-next-line opencut/prefer-object-params
		const step = <T>(label: string, run: () => Promise<T>) =>
			exportStep({ run, label, signal });
		const fps = frameRateToFloat(this.renderer.fps);
		const duration = rootNode.duration / TICKS_PER_SECOND;
		const frameCount = Math.ceil(duration * fps);
		let statistics: ExportStatistics | undefined;
		let completedFrames = 0;
		let progress = 0;
		const report = (stage: string) =>
			this.emit("progress", progress, stage, statistics);
		let output: Output | undefined;
		let destination: Awaited<ReturnType<typeof createExportOutput>> | undefined;
		let succeeded = false;
		try {
			report(translate("Checking video codec"));
			const codec = this.options.format === "webm" ? "vp9" : "avc";
			const encoding = {
				width: this.options.width,
				height: this.options.height,
				bitrate: qualityMap[this.options.quality],
			};
			const hardwareAcceleration = (await step(
				translate("Checking video codec"),
				() =>
					canEncodeVideo(codec, {
						...encoding,
						hardwareAcceleration: "prefer-hardware",
					}),
			))
				? "prefer-hardware"
				: "no-preference";
			if (
				!(await step(translate("Checking video codec"), () =>
					canEncodeVideo(codec, { ...encoding, hardwareAcceleration }),
				))
			)
				throw new Error(
					translate(
						"This browser cannot encode the selected video format. Try another format or browser.",
					),
				);

			let audioSource: AudioSampleSource | undefined;
			if (this.options.audio?.hasAudio) {
				const audioCodec =
					this.options.format === "mp4" &&
					(await step(translate("Checking audio codec"), () =>
						canEncodeAudio("aac", { sampleRate: 44100, numberOfChannels: 2 }),
					))
						? "aac"
						: "opus";
				if (
					!(await step(translate("Checking audio codec"), () =>
						canEncodeAudio(audioCodec, {
							sampleRate: 44100,
							numberOfChannels: 2,
						}),
					))
				)
					throw new Error(
						translate(
							"This browser cannot encode audio. Try another browser or export without audio.",
						),
					);
				audioSource = new AudioSampleSource({
					codec: audioCodec,
					bitrate: 192000,
				});
			}
			report(translate("Preparing output file"));
			destination = await step(translate("Preparing output file"), () =>
				createExportOutput({
					mimeType: getExportMimeType({ format: this.options.format }),
				}),
			);
			output = new Output({
				format:
					this.options.format === "webm"
						? new WebMOutputFormat()
						: new Mp4OutputFormat({ fastStart: false }),
				target: destination.target,
			});
			const renderedCanvas = this.renderer.getOutputCanvas();
			const needsResize =
				this.options.width !== this.renderer.width ||
				this.options.height !== this.renderer.height;
			const outputCanvas = needsResize
				? document.createElement("canvas")
				: renderedCanvas;
			if (needsResize) {
				outputCanvas.width = this.options.width;
				outputCanvas.height = this.options.height;
			}
			const resizeContext = needsResize
				? (outputCanvas.getContext("2d") as CanvasRenderingContext2D | null)
				: null;
			if (needsResize && !resizeContext)
				throw new Error(translate("Failed to resize export canvas."));
			const video = new CanvasSource(outputCanvas, {
				codec,
				bitrate: qualityMap[this.options.quality],
				hardwareAcceleration,
			});
			output.addVideoTrack(video, { frameRate: fps });
			if (audioSource) output.addAudioTrack(audioSource);
			report(translate("Starting encoder"));
			await step(translate("Starting encoder"), () => output!.start());
			const startedAt = performance.now();
			let audioUntil = 0;
			for (let i = 0; i < frameCount; i++) {
				const seconds = i / fps;
				if (audioSource && this.options.audio && seconds >= audioUntil - 1e-8) {
					const audioDuration = Math.min(1, duration - audioUntil);
					if (audioDuration > 0) {
						report(translate("Mixing audio"));
						const audio = await step(translate("Mixing audio"), () =>
							this.options.audio!.render({
								start: audioUntil,
								duration: audioDuration,
							}),
						);
						for (const sample of AudioSample.fromAudioBuffer(
							audio,
							audioUntil,
						)) {
							try {
								await step(translate("Encoding audio"), () =>
									audioSource!.add(sample),
								);
							} finally {
								sample.close();
							}
						}
						audioUntil += audioDuration;
					}
				}
				await step(translate("Rendering video"), () =>
					this.renderer.render({
						node: rootNode,
						time: Math.round(seconds * TICKS_PER_SECOND),
						signal,
					}),
				);
				if (resizeContext) {
					resizeContext.clearRect(
						0,
						0,
						outputCanvas.width,
						outputCanvas.height,
					);
					resizeContext.drawImage(
						renderedCanvas,
						0,
						0,
						outputCanvas.width,
						outputCanvas.height,
					);
				}
				await step(translate("Encoding video"), () =>
					video.add(seconds, Math.min(1 / fps, duration - seconds)),
				);
				completedFrames = i + 1;
				if (
					i % Math.max(1, Math.round(fps / 4)) === 0 ||
					completedFrames === frameCount
				) {
					const elapsedSeconds = (performance.now() - startedAt) / 1000;
					const framesPerSecond =
						elapsedSeconds > 0 ? completedFrames / elapsedSeconds : 0;
					statistics = {
						encodedFrames: completedFrames,
						totalFrames: frameCount,
						elapsedSeconds,
						framesPerSecond,
						estimatedRemainingSeconds:
							elapsedSeconds >= 1 && completedFrames >= 3 && framesPerSecond > 0
								? (frameCount - completedFrames) / framesPerSecond
								: undefined,
					};
					progress = (completedFrames / frameCount) * 0.97;
					report(translate("Rendering and encoding video"));
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
			}
			video.close();
			audioSource?.close();
			progress = 0.98;
			if (statistics)
				statistics = { ...statistics, estimatedRemainingSeconds: undefined };
			report(translate("Finalizing file"));
			await step(translate("Finalizing file"), () => output!.finalize());
			progress = 0.99;
			report(translate("Preparing download"));
			const result = await step(translate("Preparing download"), () =>
				destination!.finish(),
			);
			this.emit("progress", 1, translate("Complete"));
			succeeded = true;
			return { success: true, ...result };
		} catch (error) {
			if (output)
				await exportStep({
					run: () => output!.cancel(),
					label: translate("Cancelling export"),
					signal: new AbortController().signal,
					timeoutMs: 5000,
				}).catch(() => {});
			if (error instanceof ExportCancelled || signal.aborted)
				return { success: false, cancelled: true };
			throw error;
		} finally {
			if (!succeeded && destination)
				await exportStep({
					run: () => destination!.cleanup(),
					label: translate("Cleaning temporary file"),
					signal: new AbortController().signal,
					timeoutMs: 5000,
				}).catch(() => {});
		}
	}
}
