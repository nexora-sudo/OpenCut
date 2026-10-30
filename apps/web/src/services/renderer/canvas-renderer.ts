import { exportStep } from "@/export/task";
import { translate } from "@/i18n/translate";
import type { FrameRate } from "opencut-wasm";
import type { AnyBaseNode } from "./nodes/base-node";
import { createCanvasSurface } from "./canvas-utils";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import { wasmCompositor } from "./compositor/wasm-compositor";
import { scaleFrameForPreview } from "./preview-resolution";
import { resolveRenderTree } from "./resolve";
import {
	measureSpanAsync,
	measureSpanSync,
	onRenderPerfFrameComplete,
} from "@/diagnostics/render-perf";

export type CanvasRendererParams = {
	width: number;
	height: number;
	fps: FrameRate;
	/** Presentation resolution only; scene coordinates stay in project pixels. */
	renderScale?: number;
};

let renderQueue: Promise<unknown> = Promise.resolve();

export class CanvasRenderer {
	canvas: OffscreenCanvas;
	context: OffscreenCanvasRenderingContext2D;
	width: number;
	height: number;
	fps: FrameRate;
	private renderScale: number;

	constructor({ width, height, fps, renderScale = 1 }: CanvasRendererParams) {
		this.width = width;
		this.height = height;
		this.fps = fps;
		this.renderScale = renderScale;

		const surface = createCanvasSurface({ width, height });
		this.canvas = surface.canvas;
		this.context = surface.context;
	}

	getOutputCanvas(): HTMLCanvasElement {
		wasmCompositor.ensureInitialized({
			width: Math.max(1, Math.round(this.width * this.renderScale)),
			height: Math.max(1, Math.round(this.height * this.renderScale)),
		});
		return wasmCompositor.getCanvas();
	}

	setSize({ width, height }: { width: number; height: number }) {
		this.width = width;
		this.height = height;

		const surface = createCanvasSurface({ width, height });
		this.canvas = surface.canvas;
		this.context = surface.context;
	}

	async render(params: {
		node: AnyBaseNode;
		time: number;
		signal?: AbortSignal;
	}) {
		const pending = renderQueue.then(() => this.renderFrame(params));
		renderQueue = pending.catch(() => {});
		return pending;
	}

	private async renderFrame({
		node,
		time,
		signal,
	}: {
		node: AnyBaseNode;
		time: number;
		signal?: AbortSignal;
	}) {
		const prepare = async () => {
			await measureSpanAsync({
				name: "resolve",
				fn: () => resolveRenderTree({ node, renderer: this, time }),
			});
			return measureSpanAsync({
				name: "buildFrame",
				fn: () => buildFrameDescriptor({ node, renderer: this }),
			});
		};
		// Aborting an unresponsive decoder releases the shared render queue. A late
		// preparation result must never draw over a resumed preview or a new export.
		const descriptor = signal
			? await exportStep({
					run: prepare,
					label: translate("Rendering video"),
					signal,
				})
			: await prepare();

		const { frame, textures } = scaleFrameForPreview({
			...descriptor,
			scale: this.renderScale,
		});

		wasmCompositor.ensureInitialized({
			width: Math.max(1, Math.round(this.width * this.renderScale)),
			height: Math.max(1, Math.round(this.height * this.renderScale)),
		});
		measureSpanSync({
			name: "syncTextures",
			fn: () => wasmCompositor.syncTextures(textures),
		});
		measureSpanSync({
			name: "renderFrame",
			fn: () => wasmCompositor.render(frame),
		});
	}

	async renderToCanvas({
		node,
		time,
		targetCanvas,
	}: {
		node: AnyBaseNode;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}) {
		await this.render({ node, time });

		const ctx = targetCanvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get target canvas context");
		}

		measureSpanSync({
			name: "drawImage",
			fn: () =>
				ctx.drawImage(
					wasmCompositor.getCanvas(),
					0,
					0,
					targetCanvas.width,
					targetCanvas.height,
				),
		});
		onRenderPerfFrameComplete();
	}
}
