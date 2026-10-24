// @ts-nocheck
"use client";
// Temporary local QA harness; removed before publishing.
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
	AudioBufferSink,
	CanvasSink,
} from "mediabunny";
import { EditorCore } from "@/core";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import {
	buildElementFromMedia,
	buildTextElement,
	buildEffectElement,
	buildStickerElement,
	buildLibraryAudioElement,
} from "@/timeline/element-utils";
import { roundMediaTime, TICKS_PER_SECOND } from "@/wasm";
import { registerDefaultStickerProviders } from "@/stickers/providers";
import { createProjectBackup, readProjectBackup } from "@/project/backup";
import { storageService } from "@/services/storage/service";
import { collectAudioClips } from "@/media/audio";

const sec = (s: number) =>
	roundMediaTime({ time: Math.round(s * TICKS_PER_SECOND) });
function wave(seconds: number, frequency: number) {
	const buffer = new AudioBuffer({
		length: Math.round(seconds * 44100),
		sampleRate: 44100,
		numberOfChannels: 1,
	});
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++)
		data[i] = 0.18 * Math.sin((2 * Math.PI * frequency * i) / 44100);
	return buffer;
}
function wav(buffer: AudioBuffer) {
	const a = new ArrayBuffer(44 + buffer.length * 2);
	const v = new DataView(a);
	const text = (o, s) => {
		for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
	};
	text(0, "RIFF");
	v.setUint32(4, a.byteLength - 8, true);
	text(8, "WAVE");
	text(12, "fmt ");
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true);
	v.setUint16(22, 1, true);
	v.setUint32(24, 44100, true);
	v.setUint32(28, 88200, true);
	v.setUint16(32, 2, true);
	v.setUint16(34, 16, true);
	text(36, "data");
	v.setUint32(40, buffer.length * 2, true);
	for (let i = 0; i < buffer.length; i++)
		v.setInt16(44 + i * 2, buffer.getChannelData(0)[i] * 32767, true);
	return new Blob([a], { type: "audio/wav" });
}
async function fixture(
	duration: number,
	fps: number,
	progress: (s: string) => void,
) {
	const output = new Output({
		format: new WebMOutputFormat(),
		target: new BufferTarget(),
	});
	const canvas = document.createElement("canvas");
	canvas.width = 160;
	canvas.height = 90;
	const ctx = canvas.getContext("2d");
	const video = new CanvasSource(canvas, { codec: "vp8", bitrate: 100000 });
	const audio = new AudioSampleSource({ codec: "opus", bitrate: 32000 });
	output.addVideoTrack(video, { frameRate: fps });
	output.addAudioTrack(audio);
	await output.start();
	for (let s = 0; s < duration; s++) {
		for (const sample of AudioSample.fromAudioBuffer(
			wave(Math.min(1, duration - s), 440),
			s,
		)) {
			await audio.add(sample);
			sample.close();
		}
		for (let i = 0; i < fps; i++) {
			ctx.fillStyle = s < duration / 2 ? "#d01820" : "#18c040";
			ctx.fillRect(0, 0, 160, 90);
			ctx.fillStyle = "#ffffff";
			ctx.fillRect((s * 13 + i * 4) % 120, 65, 15, 10);
			await video.add(s + i / fps, 1 / fps);
		}
		if (s % 50 === 0) {
			progress(`Generating fixture ${s}/${duration}`);
			await new Promise((r) => setTimeout(r, 0));
		}
	}
	video.close();
	audio.close();
	await output.finalize();
	return new File([output.target.buffer], "qa-with-embedded-audio.webm", {
		type: "video/webm",
	});
}
function assertion(v: boolean, message: string) {
	if (!v) throw Error(message);
}
export default function QA() {
	const [status, setStatus] = useState("Ready");
	const [result, setResult] = useState("");
	const [projectId, setProjectId] = useState("");
	const run = async (long: boolean, format = "webm", cancel = false) => {
		if (process.env.NODE_ENV !== "development") return;
		setResult("");
		const started = performance.now();
		try {
			await initializeGpuRenderer();
			registerDefaultStickerProviders();
			const editor = EditorCore.getInstance();
			editor.save.pause();
			const file = await fixture(long ? 1200 : 4, long ? 1 : 10, setStatus);
			const id = await editor.project.createNewProject({
				name: long
					? "QA 20 minute export"
					: "QA cuts, audio, effects, text and sticker",
			});
			setProjectId(id);
			await editor.project.loadProject({ id });
			editor.save.pause();
			await editor.project.updateSettings({
				settings: {
					canvasSize: { width: 160, height: 90 },
					fps: { numerator: long ? 1 : 10, denominator: 1 },
				},
				pushHistory: false,
			});
			const asset = await editor.media.addMediaAsset({
				projectId: id,
				asset: {
					name: file.name,
					type: "video",
					file,
					url: URL.createObjectURL(file),
					duration: long ? 1200 : 4,
					width: 160,
					height: 90,
					hasAudio: true,
				},
			});
			assertion(!!asset, "fixture storage failed");
			const scene = editor.scenes.getActiveScene();
			const tracks = structuredClone(scene.tracks);
			const video = (start, trim, duration) => ({
				...buildElementFromMedia({
					mediaId: asset.id,
					mediaType: "video",
					name: "Spoken video",
					duration: sec(duration),
					startTime: sec(start),
				}),
				id: crypto.randomUUID(),
				trimStart: sec(trim),
			});
			tracks.main.elements = long
				? [video(0, 0, 1200)]
				: [video(0, 1, 1), video(1.5, 2, 1)];
			if (!long) {
				const text = {
					...buildTextElement({
						raw: {
							duration: sec(1),
							params: { text: "QA TEXT", fontSize: 150 },
						},
						startTime: sec(0.25),
					}),
					id: crypto.randomUUID(),
				};
				const sticker = {
					...buildStickerElement({
						stickerId: "shapes:square",
						startTime: sec(1.5),
					}),
					duration: sec(1),
					id: crypto.randomUUID(),
				};
				const effect = {
					...buildEffectElement({
						effectType: "blur",
						startTime: sec(0),
						duration: sec(3),
					}),
					id: crypto.randomUUID(),
				};
				tracks.overlay = [
					{
						id: "fx",
						name: "Effect",
						type: "effect",
						hidden: false,
						elements: [effect],
					},
					{
						id: "text",
						name: "Text",
						type: "text",
						hidden: false,
						elements: [text],
					},
					{
						id: "sticker",
						name: "Sticker",
						type: "graphic",
						hidden: false,
						elements: [sticker],
					},
				];
				const musicUrl = URL.createObjectURL(wav(wave(2, 880)));
				const music = {
					...buildLibraryAudioElement({
						sourceUrl: musicUrl,
						name: "Music",
						duration: sec(2),
						startTime: sec(0.5),
					}),
					id: "music",
					params: { volume: -6, muted: false },
				};
				tracks.audio = [
					{
						id: "music",
						name: "Music",
						type: "audio",
						muted: false,
						elements: [music],
					},
				];
				const clips = await collectAudioClips({
					tracks,
					mediaAssets: [asset],
					strict: true,
				});
				assertion(
					clips.find((c) => c.id === "music")?.startTime === 0.5,
					"library audio uses wrong units",
				);
			}
			editor.scenes.initializeScenes({
				scenes: [{ ...scene, tracks }],
				currentSceneId: scene.id,
			});
			editor.save.resume();
			await editor.save.flush();
			const unsub = editor.project.subscribe(() => {
				const s = editor.project.getExportState();
				if (cancel && s.progress > 0.1) editor.project.cancelExport();
				if (s.isExporting)
					setStatus(`${s.stage} ${Math.round(s.progress * 100)}%`);
			});
			const exported = await editor.project.export({
				options: { format, quality: "low", includeAudio: true },
			});
			unsub();
			if (cancel) {
				assertion(exported.cancelled, "cancellation failed");
				setStatus("PASS cancellation");
				setResult(
					JSON.stringify({
						cancelled: exported.cancelled,
						elapsedSeconds: (performance.now() - started) / 1000,
					}),
				);
				return;
			}
			assertion(exported.success, exported.error ?? "Export failed");
			const blob =
				exported.blob ?? new Blob([exported.buffer], { type: "video/webm" });
			const input = new Input({
				source: new BlobSource(blob),
				formats: ALL_FORMATS,
			});
			const actualDuration = await input.computeDuration();
			assertion(
				Math.abs(actualDuration - (long ? 1200 : 3)) < 0.15,
				"wrong export duration " + actualDuration,
			);
			const audioTrack = await input.getPrimaryAudioTrack();
			assertion(!!audioTrack, "export missing audio track");
			const sink = new AudioBufferSink(audioTrack);
			const energies = [];
			for (const at of long
				? [0.1, 600.1, 1199.1]
				: [0.1, 0.75, 1.25, 1.75, 2.75]) {
				let sum = 0,
					n = 0,
					c440 = 0,
					s440 = 0,
					c880 = 0,
					s880 = 0;
				for await (const { buffer, timestamp } of sink.buffers(at, at + 0.1)) {
					const d = buffer.getChannelData(0);
					for (let i = 0; i < d.length; i++) {
						const t = timestamp + i / buffer.sampleRate;
						if (t < at || t >= at + 0.1) continue;
						sum += d[i] * d[i];
						c440 += d[i] * Math.cos(2 * Math.PI * 440 * t);
						s440 += d[i] * Math.sin(2 * Math.PI * 440 * t);
						c880 += d[i] * Math.cos(2 * Math.PI * 880 * t);
						s880 += d[i] * Math.sin(2 * Math.PI * 880 * t);
						n++;
					}
				}
				energies.push({
					at,
					rms: Math.sqrt(sum / Math.max(1, n)),
					tone440: (2 * Math.hypot(c440, s440)) / Math.max(1, n),
					tone880: (2 * Math.hypot(c880, s880)) / Math.max(1, n),
				});
			}
			assertion(energies[0].rms > 0.02, "embedded video audio is silent");
			if (!long) {
				assertion(
					energies[1].tone440 > 0.04 && energies[1].tone880 > 0.02,
					"video speech/music were not mixed",
				);
				assertion(
					energies[2].tone440 < 0.02 && energies[2].tone880 > 0.02,
					"cut gap or music timing incorrect",
				);
				assertion(
					energies[4].rms < 0.01,
					"audio extends beyond clip boundaries",
				);
			}
			const vt = await input.getPrimaryVideoTrack();
			const vs = new CanvasSink(vt);
			const frames = [];
			for (const at of long ? [0, 600, 1199] : [0.1, 0.5, 1.25, 1.75, 2.75]) {
				const f = await vs.getCanvas(at);
				assertion(!!f, "missing frame " + at);
				const ctx = f.canvas.getContext("2d");
				const pixels = ctx.getImageData(0, 0, 160, 90).data;
				let white = 0,
					energy = 0;
				for (let i = 0; i < pixels.length; i += 4) {
					if (pixels[i] > 160 && pixels[i + 1] > 160 && pixels[i + 2] > 160)
						white++;
					energy += pixels[i] + pixels[i + 1] + pixels[i + 2];
				}
				frames.push({
					at,
					white,
					energy,
					corner: [...ctx.getImageData(4, 4, 1, 1).data],
				});
			}
			if (!long) {
				assertion(
					frames[0].corner[0] > frames[0].corner[1],
					"first cut frame wrong",
				);
				assertion(
					frames[3].corner[1] > frames[3].corner[0],
					"second cut frame wrong",
				);
			}
			const active = editor.project.getActive();
			const backupProject = {
				...active,
				scenes: editor.scenes
					.getScenes()
					.map((s) => ({ ...s, tracks: { ...s.tracks, audio: [] } })),
			};
			const backup = createProjectBackup({
				project: backupProject,
				mediaAssets: [asset],
			});
			const restored = await readProjectBackup(backup);
			assertion(
				restored.mediaAssets[0].file.size === file.size,
				"backup lost media",
			);
			assertion(
				restored.project.scenes[0].tracks.overlay.length ===
					tracks.overlay.length,
				"backup lost overlays",
			);
			const newId = crypto.randomUUID();
			restored.project.metadata.id = newId;
			for (const mediaAsset of restored.mediaAssets)
				await storageService.saveMediaAsset({ projectId: newId, mediaAsset });
			await storageService.saveProject({ project: restored.project });
			const loaded = await storageService.loadMediaAsset({
				projectId: newId,
				id: asset.id,
			});
			assertion(loaded?.hasAudio === true, "audio metadata lost on reload");
			input.dispose();
			await exported.cleanup?.();
			setStatus("PASS");
			setResult(
				JSON.stringify(
					{
						long,
						format,
						actualDuration,
						bytes: blob.size,
						energies,
						frames,
						backupBytes: backup.size,
						elapsedSeconds: (performance.now() - started) / 1000,
						projectId: id,
					},
					null,
					2,
				),
			);
		} catch (e) {
			console.error(e);
			setStatus("FAIL");
			setResult(e instanceof Error ? e.stack : String(e));
		}
	};
	return (
		<main style={{ padding: 32 }}>
			<h1>Local export QA</h1>
			<button onClick={() => void run(false)}>
				Run short audiovisual checks
			</button>{" "}
			<button onClick={() => void run(true)}>Run 20-minute stress check</button>{" "}
			<button onClick={() => void run(false, "mp4")}>Run MP4 checks</button>{" "}
			<button onClick={() => void run(false, "webm", true)}>
				Check cancellation
			</button>
			<p role="status">{status}</p>
			<pre>{result}</pre>
			{projectId && <a href={`/editor/${projectId}`}>Open test project</a>}
		</main>
	);
}
