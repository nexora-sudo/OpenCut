// @ts-nocheck
"use client";
// Development-only synthetic media checks. Never publish this as an app route.
import { useState } from "react";
import {
	Output,
	BufferTarget,
	WebMOutputFormat,
	CanvasSource,
	AudioSampleSource,
	AudioSample,
	Input,
	BlobSource,
	ALL_FORMATS,
	CanvasSink,
	AudioBufferSink,
} from "mediabunny";
import { EditorCore } from "@/core";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import {
	buildElementFromMedia,
	buildEffectElement,
} from "@/timeline/element-utils";
import { buildDefaultEffectInstance } from "@/effects";
import { roundMediaTime, TICKS_PER_SECOND } from "@/wasm";
import { getExportSize } from "opencut-wasm";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { createProjectBackup, readProjectBackup } from "@/project/backup";
const sec = (n) => roundMediaTime({ time: n * TICKS_PER_SECOND });
function check(condition, message) {
	if (!condition) throw Error(message);
}
async function fixture() {
	const output = new Output({
		format: new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const canvas = document.createElement("canvas");
	canvas.width = 320;
	canvas.height = 180;
	const ctx = canvas.getContext("2d");
	const video = new CanvasSource(canvas, { codec: "vp8", bitrate: 200000 });
	const audio = new AudioSampleSource({ codec: "opus", bitrate: 64000 });
	output.addVideoTrack(video, { frameRate: 4 });
	output.addAudioTrack(audio);
	await output.start();
	for (let s = 0; s < 6; s++) {
		const buffer = new AudioBuffer({
			length: 44100,
			sampleRate: 44100,
			numberOfChannels: 1,
		});
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++)
			data[i] = 0.15 * Math.sin((2 * Math.PI * 440 * i) / 44100);
		for (const sample of AudioSample.fromAudioBuffer(buffer, s)) {
			await audio.add(sample);
			sample.close();
		}
		for (let f = 0; f < 4; f++) {
			ctx.fillStyle = s < 3 ? "#e02020" : "#2020e0";
			ctx.fillRect(0, 0, 320, 180);
			ctx.fillStyle = "white";
			ctx.fillRect(20, 20, 20, 20);
			await video.add(s + f / 4, 0.25);
		}
	}
	video.close();
	audio.close();
	await output.finalize();
	return new File([output.target.buffer], "synthetic-transition-audio.webm", {
		type: "video/webm",
	});
}
function pixels(canvas) {
	const ctx = canvas.getContext("2d");
	const at = (x, y) =>
		Array.from(
			ctx.getImageData(
				Math.floor(canvas.width * x),
				Math.floor(canvas.height * y),
				1,
				1,
			).data,
		).slice(0, 3);
	return { left: at(0.25, 0.5), right: at(0.75, 0.5), marker: at(0.09, 0.16) };
}
function gray(rgb) {
	return Math.max(...rgb) - Math.min(...rgb) < 12;
}
export default function QA033() {
	const [status, setStatus] = useState("Ready"),
		[result, setResult] = useState(""),
		[id, setId] = useState("");
	const run = async () => {
		if (process.env.NODE_ENV !== "development") return;
		const results = [];
		const started = performance.now();
		setStatus("Preparing synthetic media");
		try {
			await initializeGpuRenderer();
			const editor = EditorCore.getInstance();
			const file = await fixture();
			for (const scenario of [
				{ resolution: 480, type: "dissolve", gray: false, format: "webm" },
				{ resolution: 720, type: "slide-left", gray: false, format: "webm" },
				{ resolution: 1080, type: "dissolve", gray: "clip", format: "webm" },
				{ resolution: 1440, type: "slide-left", gray: "scene", format: "webm" },
				{ resolution: 720, type: "dissolve", gray: false, format: "mp4" },
			]) {
				editor.save.pause();
				const projectId = await editor.project.createNewProject({
					name: `QA 0.3.3 ${scenario.resolution}p ${scenario.type}`,
				});
				setId(projectId);
				await editor.project.loadProject({ id: projectId });
				editor.save.pause();
				await editor.project.updateSettings({
					settings: {
						canvasSize: { width: 320, height: 180 },
						fps: { numerator: 4, denominator: 1 },
					},
					pushHistory: false,
				});
				const asset = await editor.media.addMediaAsset({
					projectId,
					asset: {
						file,
						name: file.name,
						type: "video",
						url: URL.createObjectURL(file),
						duration: 6,
						width: 320,
						height: 180,
						hasAudio: true,
					},
				});
				const clip = (name, start, trim) => ({
					...buildElementFromMedia({
						mediaId: asset.id,
						mediaType: "video",
						name,
						duration: sec(2),
						startTime: sec(start),
					}),
					id: crypto.randomUUID(),
					trimStart: sec(trim),
				});
				const from = clip("Red outgoing", 0, 0);
				const to = clip("Blue incoming", 2, 3);
				to.transitionIn = {
					type: scenario.type,
					duration: sec(0.5),
					fromElementId: from.id,
				};
				if (scenario.gray === "clip")
					to.effects = [
						buildDefaultEffectInstance({ effectType: "grayscale" }),
					];
				const scene = editor.scenes.getActiveScene();
				const tracks = structuredClone(scene.tracks);
				tracks.main.elements = [from, to];
				tracks.audio = [];
				tracks.overlay =
					scenario.gray === "scene"
						? [
								{
									id: crypto.randomUUID(),
									name: "Black and white",
									type: "effect",
									hidden: false,
									elements: [
										{
											...buildEffectElement({
												effectType: "grayscale",
												startTime: sec(0),
												duration: sec(4),
											}),
											id: crypto.randomUUID(),
										},
									],
								},
							]
						: [];
				editor.scenes.initializeScenes({
					scenes: [{ ...scene, tracks }],
					currentSceneId: scene.id,
				});
				editor.save.resume();
				await editor.save.flush();
				const root = buildScene({
					tracks,
					mediaAssets: [asset],
					duration: sec(4),
					canvasSize: { width: 320, height: 180 },
					background: { type: "color", color: "#000000" },
				});
				const preview = document.createElement("canvas");
				preview.width = 320;
				preview.height = 180;
				const renderer = new CanvasRenderer({
					width: 320,
					height: 180,
					fps: { numerator: 4, denominator: 1 },
				});
				await renderer.renderToCanvas({
					node: root,
					time: sec(2.25),
					targetCanvas: preview,
				});
				const previewPixels = pixels(preview);
				const unsub = editor.project.subscribe(() => {
					const state = editor.project.getExportState();
					if (state.isExporting)
						setStatus(
							`${scenario.resolution}p ${scenario.type} ${Math.round(state.progress * 100)}%`,
						);
				});
				const exported = await editor.project.export({
					options: {
						format: scenario.format,
						quality: "high",
						resolution: scenario.resolution,
						includeAudio: true,
					},
				});
				unsub();
				check(exported.success, exported.error || "Export failed");
				const blob = exported.blob || new Blob([exported.buffer]);
				const input = new Input({
					source: new BlobSource(blob),
					formats: ALL_FORMATS,
				});
				const video = await input.getPrimaryVideoTrack();
				const expected = getExportSize({
					width: 320,
					height: 180,
					resolution: scenario.resolution,
				});
				const sink = new CanvasSink(video);
				const middle = await sink.getCanvas(2.25);
				check(
					middle.canvas.width === expected.width &&
						middle.canvas.height === expected.height,
					"Wrong output dimensions",
				);
				const mix = pixels(middle.canvas);
				const late = pixels((await sink.getCanvas(3)).canvas);
				if (scenario.gray === "clip")
					check(gray(late.left), "Clip grayscale missing");
				else if (scenario.gray === "scene")
					check(
						gray(mix.left) && gray(mix.right) && gray(late.left),
						"Scene grayscale missing",
					);
				else if (scenario.type === "slide-left")
					check(
						mix.left[0] > 150 &&
							mix.left[2] < 90 &&
							mix.right[2] > 150 &&
							mix.right[0] < 90,
						"Slide halves wrong",
					);
				else
					check(
						mix.left[0] > 80 && mix.left[2] > 80 && mix.left[1] < 70,
						"Dissolve midpoint wrong",
					);
				for (const key of ["left", "right"])
					for (let c = 0; c < 3; c++)
						check(
							Math.abs(mix[key][c] - previewPixels[key][c]) < 25,
							"Preview/export mismatch",
						);
				check(
					late.marker.every((v) => v > 200),
					"Marker layout changed with resolution",
				);
				const duration = await input.computeDuration();
				check(Math.abs(duration - 4) < 0.06, "Duration changed");
				const audio = await input.getPrimaryAudioTrack();
				check(!!audio, "Video audio missing");
				let energy = 0,
					n = 0;
				for await (const { buffer } of new AudioBufferSink(audio).buffers(
					2.1,
					2.3,
				))
					for (const v of buffer.getChannelData(0)) {
						energy += v * v;
						n++;
					}
				check(Math.sqrt(energy / n) > 0.02, "Audio silent during transition");
				await editor.project.saveCurrentProject();
				const backup = await createProjectBackup({
					project: editor.project.getActive(),
					mediaAssets: [asset],
				});
				const restored = await readProjectBackup(backup);
				check(
					restored.project.scenes[0].tracks.main.elements[1].transitionIn
						.type === scenario.type,
					"Transition lost from backup",
				);
				editor.selection.setSelectedElements({
					elements: [{ trackId: tracks.main.id, elementId: to.id }],
				});
				results.push({
					...scenario,
					dimensions: expected,
					duration,
					previewPixels,
					exportPixels: mix,
					latePixels: late,
					audioRms: Math.sqrt(energy / n),
					bytes: blob.size,
					backupBytes: backup.size,
					projectId,
				});
				input.dispose();
				await exported.cleanup?.();
				editor.project.clearExportState();
				setResult(
					JSON.stringify(
						{ results, elapsedSeconds: (performance.now() - started) / 1000 },
						null,
						2,
					),
				);
			}
			setStatus("PASS all 5 exports, preview, audio, transitions and backup");
		} catch (error) {
			console.error(error);
			setStatus("FAIL");
			setResult(
				JSON.stringify(
					{ results, error: error?.stack || String(error) },
					null,
					2,
				),
			);
		}
	};
	return (
		<main style={{ padding: 24 }}>
			<h1>OpenCut 0.3.3 local checks</h1>
			<button onClick={() => void run()}>Run feature checks</button>
			<p role="status">{status}</p>
			<pre>{result}</pre>
			{id && <a href={`/editor/${id}`}>Open test project</a>}
		</main>
	);
}
