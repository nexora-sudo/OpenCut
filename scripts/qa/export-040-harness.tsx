// @ts-nocheck -- Copy this development harness into the web app before running; dependencies resolve from that workspace.
"use client";

import { useState } from "react";
import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { RootNode } from "@/services/renderer/nodes/root-node";
import { ColorNode } from "@/services/renderer/nodes/color-node";
import { ImageNode } from "@/services/renderer/nodes/image-node";
import { TICKS_PER_SECOND } from "@/wasm";
import type { ExportStatistics } from "@/export";

function sample(canvas: HTMLCanvasElement | OffscreenCanvas, x: number) {
	const copy = document.createElement("canvas");
	copy.width = canvas.width;
	copy.height = canvas.height;
	const ctx = copy.getContext("2d")!;
	ctx.drawImage(canvas, 0, 0);
	return Array.from(
		ctx.getImageData(copy.width * x, copy.height / 2, 1, 1).data,
	).slice(0, 3);
}

/** Development-only verification: 15 minutes of simple graphics, not a
 * throughput benchmark for a 15-minute camera source or complex effects. */
export default function ExportHarness() {
	const [status, setStatus] = useState("Ready");
	const [result, setResult] = useState("");
	const [running, setRunning] = useState(false);
	const run = async () => {
		if (process.env.NODE_ENV !== "development" || running) return;
		setRunning(true);
		const results: Record<string, unknown> = {};
		try {
			await initializeGpuRenderer();
			const image = document.createElement("canvas");
			image.width = 1280;
			image.height = 720;
			const imageContext = image.getContext("2d")!;
			imageContext.fillStyle = "#e02020";
			imageContext.fillRect(0, 0, 1280, 720);
			const nativeScene = new RootNode({ duration: 2 * TICKS_PER_SECOND })
				.add(new ColorNode({ color: "#2020e0" }))
				.add(
					new ImageNode({
						url: image.toDataURL(),
						duration: 2 * TICKS_PER_SECOND,
						timeOffset: 0,
						trimStart: 0,
						trimEnd: 0,
						opacity: 1,
						transform: {
							scaleX: 0.25,
							scaleY: 0.25,
							position: { x: 320, y: 0 },
							rotate: 0,
						},
					}),
				);
			const scales = [];
			for (const scale of [1, 0.5, 0.25, 1]) {
				setStatus(`Checking preview scale ${scale}`);
				const renderer = new CanvasRenderer({
					width: 1280,
					height: 720,
					fps: { numerator: 30, denominator: 1 },
					renderScale: scale,
				});
				await renderer.render({ node: nativeScene, time: 0 });
				const canvas = renderer.getOutputCanvas();
				const center = sample(canvas, 0.5),
					right = sample(canvas, 0.75);
				if (
					canvas.width !== Math.round(1280 * scale) ||
					canvas.height !== Math.round(720 * scale)
				)
					throw Error("Preview output size mismatch");
				if (center[2] < 170 || right[0] < 170 || right[2] > 80)
					throw Error("Preview scaling changed translated clip geometry");
				scales.push({
					scale,
					width: canvas.width,
					height: canvas.height,
					center,
					right,
				});
			}
			results.preview = scales;
			const duration = 15 * 60;
			for (const format of ["mp4", "webm"] as const) {
				const root = new RootNode({ duration: duration * TICKS_PER_SECOND });
				const background = new ColorNode({ color: "#e02020" });
				root.add(background);
				const exporter = new SceneExporter({
					width: 128,
					height: 72,
					fps: { numerator: 10, denominator: 1 },
					format,
					quality: "low",
				});
				const stages = new Set<string>();
				let lastProgress = 0;
				let samples = 0;
				let lastStatistics: ExportStatistics | undefined;
				let etaObserved = false;
				exporter.on("progress", (progress, stage, statistics) => {
					if (progress + 1e-8 < lastProgress)
						throw Error("Export progress moved backwards");
					lastProgress = progress;
					stages.add(stage);
					if (statistics) {
						lastStatistics = statistics;
						if (statistics.estimatedRemainingSeconds !== undefined)
							etaObserved = true;
						background.params.color =
							statistics.encodedFrames < 4500 ? "#e02020" : "#2020e0";
					}
					samples++;
					if (samples % 100 === 0 || progress === 1)
						setStatus(
							`${format}: ${(progress * 100).toFixed(1)}%, ${statistics?.encodedFrames ?? 0}/9000 frames`,
						);
				});
				const started = performance.now();
				const exported = await exporter.export({ rootNode: root });
				if (!exported.success || (!exported.buffer && !exported.blob))
					throw Error(exported.error || "Export failed");
				const blob = exported.blob ?? new Blob([exported.buffer!]);
				const input = new Input({
					source: new BlobSource(blob),
					formats: ALL_FORMATS,
				});
				try {
					const track = await input.getPrimaryVideoTrack();
					if (!track) throw Error("Export has no video track");
					const sink = new CanvasSink(track);
					const first = await sink.getCanvas(0);
					if (!first) throw Error("Could not decode first export frame");
					const firstColor = sample(first.canvas, 0.5);
					const last = await sink.getCanvas(duration - 0.2);
					if (!last) throw Error("Could not decode last export frame");
					const lastColor = sample(last.canvas, 0.5);
					const actualDuration = await input.computeDuration();
					if (Math.abs(actualDuration - duration) > 0.11)
						throw Error(`Wrong long-export duration: ${actualDuration}`);
					if (firstColor[0] < 160 || lastColor[2] < 160)
						throw Error("Long-export endpoint pixels incorrect");
					if (
						!etaObserved ||
						lastStatistics?.encodedFrames !== 9000 ||
						lastProgress !== 1
					)
						throw Error("Missing frame progress or time estimate");
					results[format] = {
						seconds: (performance.now() - started) / 1000,
						duration: actualDuration,
						bytes: blob.size,
						stages: [...stages],
						progressEvents: samples,
						lastStatistics,
						etaObserved,
						firstColor,
						lastColor,
					};
				} finally {
					input.dispose();
					await exported.cleanup?.();
				}
				setResult(JSON.stringify(results, null, 2));
			}
			setStatus("PASS preview resolution and 15-minute MP4/WebM exports");
		} catch (error) {
			setStatus("FAIL");
			results.error = error instanceof Error ? error.stack : String(error);
		} finally {
			setResult(JSON.stringify(results, null, 2));
			setRunning(false);
		}
	};
	return (
		<main style={{ padding: 24 }}>
			<h1>0.4.0 preview and long export checks</h1>
			<p>
				128×72, 10 fps, 15 minutes, simple graphics, no audio. Does not
				benchmark real-world long source decoding.
			</p>
			<button disabled={running} onClick={() => void run()}>
				Run preview and long export checks
			</button>
			<p role="status">{status}</p>
			<pre>{result}</pre>
		</main>
	);
}
