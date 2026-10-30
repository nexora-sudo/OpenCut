// @ts-nocheck
"use client";
// Synthetic local-media regression harness. Copy to a temporary app route only in development.
import { useState } from "react";
import {
	Output,
	BufferTarget,
	WebMOutputFormat,
	CanvasSource,
	AudioBufferSource,
	Input,
	BlobSource,
	ALL_FORMATS,
	CanvasSink,
	AudioBufferSink,
} from "mediabunny";
import { EditorCore } from "@/core";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { buildDefaultEffectInstance } from "@/effects";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { videoCache } from "@/services/video-cache/service";
import { TICKS_PER_SECOND, roundMediaTime } from "@/wasm";
const sec = (n) => roundMediaTime({ time: n * TICKS_PER_SECOND });
const check = (ok, reason) => {
	if (!ok) throw new Error(reason);
};
function pixels(source) {
	const c = document.createElement("canvas");
	c.width = source.width;
	c.height = source.height;
	const ctx = c.getContext("2d");
	ctx.drawImage(source, 0, 0);
	const at = (x, y) =>
		Array.from(
			ctx.getImageData(Math.floor(x * c.width), Math.floor(y * c.height), 1, 1)
				.data,
		).slice(0, 3);
	return {
		left: at(0.25, 0.5),
		right: at(0.75, 0.5),
		top: at(0.5, 0.25),
		bottom: at(0.5, 0.75),
	};
}
async function fixture(update) {
	const c = document.createElement("canvas");
	c.width = 1280;
	c.height = 720;
	const ctx = c.getContext("2d");
	const output = new Output({
		format: new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const video = new CanvasSource(c, { codec: "vp8", bitrate: 1000000 });
	const audio = new AudioBufferSource({ codec: "opus", bitrate: 64000 });
	output.addVideoTrack(video, { frameRate: 30 });
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
			data[i] =
				0.15 * Math.sin((2 * Math.PI * (s < 3 ? 440 : 880) * i) / 44100);
		await audio.add(buffer);
		for (let f = 0; f < 30; f++) {
			ctx.fillStyle = s < 3 ? "#e02020" : "#2020e0";
			ctx.fillRect(0, 0, 1280, 720);
			ctx.fillStyle = "white";
			ctx.fillRect(((s * 30 + f) * 11) % 1200, 600, 60, 60);
			await video.add(s + f / 30, 1 / 30);
		}
		update(`Generating source ${s + 1}/6`);
	}
	video.close();
	audio.close();
	await output.finalize();
	return new File([output.target.buffer], "features040-motion-tones.webm", {
		type: "video/webm",
	});
}
const red = (p) => p[0] > 160 && p[2] < 70,
	blue = (p) => p[2] > 160 && p[0] < 70;
function validateTransition(type, p) {
	if (type === "slide-left") return red(p.left) && blue(p.right);
	if (type === "slide-right") return blue(p.left) && red(p.right);
	if (type === "slide-up") return red(p.top) && blue(p.bottom);
	if (type === "slide-down") return blue(p.top) && red(p.bottom);
	return p.left[0] > 60 && p.left[2] > 60;
}
async function tones(input, from, to) {
	const track = await input.getPrimaryAudioTrack();
	check(track, "Missing exported audio track");
	const sink = new AudioBufferSink(track);
	const acc = { 440: { sin: 0, cos: 0 }, 880: { sin: 0, cos: 0 } };
	let n = 0;
	for await (const { buffer, timestamp } of sink.buffers(from, to)) {
		const d = buffer.getChannelData(0);
		for (let i = 0; i < d.length; i++) {
			const t = timestamp + i / buffer.sampleRate;
			if (t < from || t >= to) continue;
			n++;
			for (const freq of [440, 880]) {
				acc[freq].sin += d[i] * Math.sin(2 * Math.PI * freq * t);
				acc[freq].cos += d[i] * Math.cos(2 * Math.PI * freq * t);
			}
		}
	}
	return Object.fromEntries(
		[440, 880].map((f) => [
			f,
			(2 * Math.hypot(acc[f].sin, acc[f].cos)) / Math.max(n, 1),
		]),
	);
}
export default function Features040() {
	const [status, setStatus] = useState("Ready"),
		[result, setResult] = useState(""),
		[id, setId] = useState("");
	const run = async () => {
		if (process.env.NODE_ENV !== "development") return;
		const results = { transitions: {}, effects: {} };
		try {
			await initializeGpuRenderer();
			const editor = EditorCore.getInstance();
			const file = await fixture(setStatus);
			const projectId = await editor.project.createNewProject({
				name: "QA 0.4.0 moving transitions and colour",
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
					hasAudio: true,
					fps: 30,
				},
			});
			check(asset, "Missing generated asset");
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
			const from = make("Moving red / 440 Hz", 0, 0),
				to = make("Moving blue / 880 Hz", 2, 3);
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
			const patch = (element, update) =>
				editor.timeline.updateElements({
					updates: [
						{ trackId: tracks.main.id, elementId: element.id, patch: update },
					],
				});
			for (const type of [
				"dissolve",
				"slide-left",
				"slide-right",
				"slide-up",
				"slide-down",
				"zoom-in",
			]) {
				setStatus(`Moving ${type}`);
				patch(to, {
					transitionIn: {
						type,
						duration: sec(0.8),
						fromElementId: from.id,
						moving: true,
						audioCrossfade: true,
					},
				});
				videoCache.clearAll();
				const root = tree();
				const original = videoCache.getFrameAt.bind(videoCache);
				const requests = [];
				videoCache.getFrameAt = async (args) => {
					requests.push({ role: args.mediaId, time: args.time });
					return original(args);
				};
				const times = [];
				let mid;
				try {
					for (let i = 0; i < 30; i++) {
						const t = 2 + i / 30;
						const started = performance.now();
						await renderer.renderToCanvas({
							node: root,
							time: sec(t),
							targetCanvas: canvas,
						});
						times.push(performance.now() - started);
						if (i === 12) mid = pixels(canvas);
					}
				} finally {
					videoCache.getFrameAt = original;
				}
				check(
					validateTransition(type, mid),
					`${type} preview pixels incorrect`,
				);
				const outgoing = requests.filter((r) =>
					r.role.includes(":transition-tail:"),
				);
				check(
					new Set(outgoing.map((r) => r.time)).size > 10,
					`${type} outgoing frame remained frozen`,
				);
				times.sort((a, b) => a - b);
				results.transitions[type] = {
					preview: mid,
					movingTailRequests: outgoing.length,
					p50ms: times[15],
					p95ms: times[28],
					exports: {},
				};
				for (const format of ["mp4", "webm"]) {
					setStatus(`Exporting ${type} ${format}`);
					const ex = await editor.project.export({
						options: {
							format,
							quality: "high",
							resolution: 720,
							includeAudio: type === "dissolve",
						},
					});
					check(ex.success, ex.error);
					const input = new Input({
						source: new BlobSource(ex.blob || new Blob([ex.buffer])),
						formats: ALL_FORMATS,
					});
					try {
						const sink = new CanvasSink(await input.getPrimaryVideoTrack());
						const p = pixels((await sink.getCanvas(2.4)).canvas);
						check(
							validateTransition(type, p),
							`${type} ${format} wrong pixels`,
						);
						const item = { pixels: p, duration: await input.computeDuration() };
						check(Math.abs(item.duration - 4) < 0.1, "Export duration changed");
						if (type === "dissolve") {
							item.audio = await tones(input, 2.3, 2.5);
							check(
								item.audio[440] > 0.025 && item.audio[880] > 0.025,
								`${format} audio did not crossfade both tones`,
							);
						}
						results.transitions[type].exports[format] = item;
					} finally {
						input.dispose();
						await ex.cleanup?.();
						editor.project.clearExportState();
					}
					setResult(JSON.stringify(results, null, 2));
				}
			}
			patch(to, { transitionIn: undefined });
			for (const type of ["sepia", "warm", "cool", "vivid", "negative"]) {
				setStatus(`Checking ${type}`);
				const effect = buildDefaultEffectInstance({ effectType: type });
				patch(from, { effects: [effect] });
				await renderer.renderToCanvas({
					node: tree(),
					time: sec(1),
					targetCanvas: canvas,
				});
				const p = pixels(canvas).left;
				patch(from, { effects: [] });
				await renderer.renderToCanvas({
					node: tree(),
					time: sec(1),
					targetCanvas: canvas,
				});
				const base = pixels(canvas).left;
				check(
					p.some((v, i) => Math.abs(v - base[i]) > 10),
					`${type} did not change the image`,
				);
				patch(from, { effects: [effect] });
				results.effects[type] = { preview: p, base, exports: {} };
				for (const format of ["mp4", "webm"]) {
					setStatus(`Exporting ${type} ${format}`);
					const ex = await editor.project.export({
						options: {
							format,
							quality: "high",
							resolution: 720,
							includeAudio: false,
						},
					});
					check(ex.success, ex.error);
					const input = new Input({
						source: new BlobSource(ex.blob || new Blob([ex.buffer])),
						formats: ALL_FORMATS,
					});
					try {
						const sink = new CanvasSink(await input.getPrimaryVideoTrack());
						const actual = pixels((await sink.getCanvas(1)).canvas).left;
						check(
							actual.every((v, i) => Math.abs(v - p[i]) < 15),
							`${type} ${format} differs from preview`,
						);
						results.effects[type].exports[format] = actual;
					} finally {
						input.dispose();
						await ex.cleanup?.();
						editor.project.clearExportState();
					}
				}
				const disabled = { ...effect, enabled: false };
				patch(from, { effects: [disabled] });
				await renderer.renderToCanvas({
					node: tree(),
					time: sec(1),
					targetCanvas: canvas,
				});
				const disabledPixel = pixels(canvas).left;
				check(
					disabledPixel.every((v, i) => Math.abs(v - base[i]) < 6),
					`${type} toggle off failed`,
				);
				patch(from, { effects: [{ ...effect, params: { intensity: 0 } }] });
				await renderer.renderToCanvas({
					node: tree(),
					time: sec(1),
					targetCanvas: canvas,
				});
				const zero = pixels(canvas).left;
				check(
					zero.every((v, i) => Math.abs(v - base[i]) < 6),
					`${type} intensity zero failed`,
				);
				results.effects[type].disabled = disabledPixel;
				results.effects[type].zeroIntensity = zero;
				setResult(JSON.stringify(results, null, 2));
			}
			patch(from, { effects: [] });
			patch(to, {
				transitionIn: {
					type: "slide-left",
					duration: sec(0.8),
					fromElementId: from.id,
					moving: true,
					audioCrossfade: true,
				},
			});
			await editor.save.flush();
			editor.playback.seek({ time: sec(2.4) });
			setStatus(
				"PASS 6 moving transitions, 5 effects, MP4/WebM, real audio crossfade",
			);
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
			<h1>0.4.0 features — synthetic 720p30</h1>
			<button onClick={() => void run()}>Run 0.4.0 audiovisual checks</button>
			<p role="status">{status}</p>
			<pre>{result}</pre>
			{id && <a href={`/editor/${id}`}>Open 0.4.0 test project</a>}
		</main>
	);
}
