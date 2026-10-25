// @ts-nocheck
"use client";
import { useState } from "react";
import {
	Output,
	BufferTarget,
	WebMOutputFormat,
	CanvasSource,
	Input,
	BlobSource,
	ALL_FORMATS,
	CanvasSink,
} from "mediabunny";
import { EditorCore } from "@/core";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import {
	buildElementFromMedia,
	buildEffectElement,
} from "@/timeline/element-utils";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import { videoCache } from "@/services/video-cache/service";
import { roundMediaTime, TICKS_PER_SECOND } from "@/wasm";
const sec = (n) => roundMediaTime({ time: n * TICKS_PER_SECOND });
const pixel = (canvas, x = 0.5) => {
	const c = document.createElement("canvas");
	c.width = canvas.width;
	c.height = canvas.height;
	c.getContext("2d").drawImage(canvas, 0, 0);
	return Array.from(
		c.getContext("2d").getImageData(c.width * x, c.height / 2, 1, 1).data,
	).slice(0, 3);
};
const gray = (p) => Math.max(...p) - Math.min(...p) < 12;
async function fixture(update) {
	const output = new Output({
		format: new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const c = document.createElement("canvas");
	c.width = 1280;
	c.height = 720;
	const ctx = c.getContext("2d");
	const source = new CanvasSource(c, { codec: "vp8", bitrate: 1000000 });
	output.addVideoTrack(source, { frameRate: 30 });
	await output.start();
	for (let f = 0; f < 180; f++) {
		ctx.fillStyle = f < 90 ? "#e02020" : "#2020e0";
		ctx.fillRect(0, 0, 1280, 720);
		ctx.fillStyle = "white";
		ctx.fillRect((f * 11) % 1200, 600, 60, 60);
		await source.add(f / 30, 1 / 30);
		if (f % 30 === 0) {
			update(`Generating ${f}/180`);
			await new Promise((r) => setTimeout(r, 0));
		}
	}
	source.close();
	await output.finalize();
	return new File([output.target.buffer], "motion-720p30.webm", {
		type: "video/webm",
	});
}
export default function QAPlayback() {
	const [status, setStatus] = useState("Ready"),
		[result, setResult] = useState(""),
		[id, setId] = useState("");
	const run = async () => {
		if (process.env.NODE_ENV !== "development") return;
		const results = {};
		setResult("");
		try {
			await initializeGpuRenderer();
			const file = await fixture(setStatus),
				editor = EditorCore.getInstance();
			const projectId = await editor.project.createNewProject({
				name: "QA moving video 720p30",
			});
			setId(projectId);
			await editor.project.loadProject({ id: projectId });
			editor.save.pause();
			await editor.project.updateSettings({
				settings: {
					canvasSize: { width: 1280, height: 720 },
					fps: { numerator: 30, denominator: 1 },
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
					width: 1280,
					height: 720,
					hasAudio: false,
					fps: 30,
				},
			});
			const make = (name, start, trim) => ({
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
			const from = make("Moving red", 0, 0),
				to = make("Moving blue", 2, 3);
			const scene = editor.scenes.getActiveScene();
			const tracks = structuredClone(scene.tracks);
			tracks.main.elements = [from, to];
			tracks.overlay = [];
			tracks.audio = [];
			editor.scenes.initializeScenes({
				scenes: [{ ...scene, tracks }],
				currentSceneId: scene.id,
			});
			editor.save.resume();
			await editor.save.flush();
			const canvas = document.createElement("canvas");
			canvas.width = 1280;
			canvas.height = 720;
			const renderer = new CanvasRenderer({
				width: 1280,
				height: 720,
				fps: { numerator: 30, denominator: 1 },
			});
			const tree = () =>
				buildScene({
					tracks: editor.scenes.getActiveScene().tracks,
					mediaAssets: [asset],
					duration: sec(4),
					canvasSize: { width: 1280, height: 720 },
					background: { type: "color", color: "#000000" },
					isPreview: true,
				});
			const original = videoCache.getFrameAt.bind(videoCache);
			let requests = [];
			videoCache.getFrameAt = async (args) => {
				requests.push(args.time);
				return original(args);
			};
			try {
				for (const type of ["dissolve", "slide-left"]) {
					editor.timeline.updateElements({
						updates: [
							{
								trackId: tracks.main.id,
								elementId: to.id,
								patch: {
									transitionIn: {
										type,
										duration: sec(0.8),
										fromElementId: from.id,
									},
								},
							},
						],
					});
					videoCache.clearAll();
					const root = tree();
					requests = [];
					const samples = [];
					const times = [];
					for (let i = 0; i < 45; i++) {
						const at = 1.6 + i / 30,
							start = performance.now();
						await renderer.renderToCanvas({
							node: root,
							time: sec(at),
							targetCanvas: canvas,
						});
						times.push(performance.now() - start);
						if (i % 3 === 0) samples.push({ at, rgb: pixel(canvas) });
						if (i % 10 === 0) setStatus(`${type} ${i}/45`);
					}
					times.sort((a, b) => a - b);
					results[type] = {
						requests: requests.length,
						outgoingRequests: requests.filter(
							(t) => Math.abs(t - (2 - 1 / 30)) < 0.005,
						).length,
						p50ms: times[Math.floor(times.length * 0.5)],
						p95ms: times[Math.floor(times.length * 0.95)],
						maxMs: times.at(-1),
						samples,
					};
					setResult(JSON.stringify(results, null, 2));
					for (const format of ["webm", "mp4"]) {
						setStatus(`Exporting ${type} at 720p30`);
						const exportedTransition = await editor.project.export({
							options: {
								format,
								quality: "high",
								resolution: 720,
								includeAudio: false,
							},
						});
						if (!exportedTransition.success)
							throw Error(exportedTransition.error);
						const input = new Input({
							source: new BlobSource(
								exportedTransition.blob ||
									new Blob([exportedTransition.buffer]),
							),
							formats: ALL_FORMATS,
						});
						const sink = new CanvasSink(await input.getPrimaryVideoTrack());
						const frame = (await sink.getCanvas(2.4)).canvas;
						const left = pixel(frame, 0.25),
							right = pixel(frame, 0.75);
						results[type].exports ??= {};
						results[type].exports[format] = {
							left,
							right,
							duration: await input.computeDuration(),
						};
						if (
							type === "dissolve"
								? !(left[0] > 60 && left[2] > 60)
								: !(
										left[0] > 170 &&
										left[2] < 60 &&
										right[2] > 170 &&
										right[0] < 60
									)
						)
							throw Error(`${type} export did not match the transition`);
						input.dispose();
						await exportedTransition.cleanup?.();
						editor.project.clearExportState();
					}
				}
			} finally {
				videoCache.getFrameAt = original;
			}
			editor.timeline.updateElements({
				updates: [
					{
						trackId: tracks.main.id,
						elementId: to.id,
						patch: { transitionIn: undefined },
					},
				],
			});
			editor.timeline.addClipEffect({
				trackId: tracks.main.id,
				elementId: to.id,
				effectType: "grayscale",
			});
			await renderer.renderToCanvas({
				node: tree(),
				time: sec(3.2),
				targetCanvas: canvas,
			});
			results.clipGray = { rgb: pixel(canvas), pass: gray(pixel(canvas)) };
			editor.timeline.insertElement({
				placement: { mode: "auto", trackType: "effect" },
				element: buildEffectElement({
					effectType: "grayscale",
					startTime: sec(0),
				}),
			});
			await renderer.renderToCanvas({
				node: tree(),
				time: sec(1),
				targetCanvas: canvas,
			});
			results.sceneGray = { rgb: pixel(canvas), pass: gray(pixel(canvas)) };
			const outputCanvas = renderer.getOutputCanvas(),
				before = {
					width: outputCanvas.width,
					height: outputCanvas.height,
					rgb: pixel(outputCanvas),
				};
			const thumbnail = document.createElement("canvas");
			effectPreviewService.renderPreview({
				effectType: "grayscale",
				params: {},
				targetCanvas: thumbnail,
			});
			results.thumbnailInterference = {
				before,
				after: {
					width: outputCanvas.width,
					height: outputCanvas.height,
					rgb: pixel(outputCanvas),
				},
			};
			setStatus("Exporting through UI command path");
			const exported = await editor.project.export({
				options: {
					format: "webm",
					quality: "high",
					resolution: 720,
					includeAudio: false,
				},
			});
			if (!exported.success) throw new Error(exported.error);
			const input = new Input({
				source: new BlobSource(exported.blob || new Blob([exported.buffer])),
				formats: ALL_FORMATS,
			});
			const sink = new CanvasSink(await input.getPrimaryVideoTrack());
			results.exportGray = { rgb: pixel((await sink.getCanvas(1)).canvas) };
			results.exportGray.pass = gray(results.exportGray.rgb);
			input.dispose();
			await exported.cleanup?.();
			editor.project.clearExportState();
			editor.playback.seek({ time: sec(0) });
			const middle = results.dissolve.samples.find(
				(sample) => Math.abs(sample.at - 2.4) < 0.001,
			).rgb;
			if (!(middle[0] > 60 && middle[2] > 60))
				throw Error("Dissolve did not blend two distinct frames");
			if (
				results.dissolve.outgoingRequests > 2 ||
				results["slide-left"].outgoingRequests > 2
			)
				throw Error(
					"Outgoing video was decoded repeatedly during a transition",
				);
			if (
				!results.clipGray.pass ||
				!results.sceneGray.pass ||
				!results.exportGray.pass
			)
				throw Error("Grayscale did not render");
			if (
				results.thumbnailInterference.before.width !==
					results.thumbnailInterference.after.width ||
				results.thumbnailInterference.before.height !==
					results.thumbnailInterference.after.height
			)
				throw Error("Thumbnail resized the shared compositor");
			const clean = structuredClone(editor.scenes.getActiveScene().tracks);
			clean.overlay = [];
			clean.main.elements = clean.main.elements.map((clip) => ({
				...clip,
				effects: [],
			}));
			editor.timeline.updateTracks(clean);
			await editor.save.flush();
			setStatus("PASS motion transitions, effects and export");
			setResult(JSON.stringify(results, null, 2));
		} catch (error) {
			setStatus("FAIL");
			setResult(
				JSON.stringify(
					{ ...results, error: error.stack || String(error) },
					null,
					2,
				),
			);
		}
	};
	return (
		<main style={{ padding: 24 }}>
			<h1>Playback regression 720p30</h1>
			<button onClick={() => void run()}>Run motion and effect checks</button>
			<p role="status">{status}</p>
			<pre>{result}</pre>
			{id && <a href={`/editor/${id}`}>Open moving test project</a>}
		</main>
	);
}
