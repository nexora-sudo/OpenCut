import { translate } from "@/i18n/translate";
import type { EditorCore } from "@/core";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import type { ExportOptions, ExportResult } from "@/export";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { SceneExporter } from "@/services/renderer/scene-exporter";
import { buildScene } from "@/services/renderer/scene-builder";
import { ExportAudioRenderer } from "@/media/export-audio";
import { formatTimecode } from "opencut-wasm";
import { downloadBlob } from "@/utils/browser";

type SnapshotResult =
	| { success: true; blob: Blob; filename: string }
	| { success: false; error: string };

export class RendererManager {
	private renderTree: RootNode | null = null;
	private _isDegraded = false;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	get isDegraded(): boolean {
		return this._isDegraded;
	}

	setDegraded(degraded: boolean): void {
		if (this._isDegraded === degraded) return;
		this._isDegraded = degraded;
		this.notify();
	}

	setRenderTree({ renderTree }: { renderTree: RootNode | null }): void {
		this.renderTree = renderTree;
		this.notify();
	}

	getRenderTree(): RootNode | null {
		return this.renderTree;
	}

	async saveSnapshot(): Promise<{ success: boolean; error?: string }> {
		const snapshot = await this.createSnapshot();
		if (!snapshot.success) {
			return snapshot;
		}

		downloadBlob({ blob: snapshot.blob, filename: snapshot.filename });
		return { success: true };
	}

	async copySnapshot(): Promise<{ success: boolean; error?: string }> {
		if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
			return {
				success: false,
				error: "Clipboard image copy is not supported in this browser",
			};
		}

		const snapshot = await this.createSnapshot();
		if (!snapshot.success) {
			return snapshot;
		}

		try {
			await navigator.clipboard.write([
				new ClipboardItem({
					[snapshot.blob.type || "image/png"]: snapshot.blob,
				}),
			]);
			return { success: true };
		} catch (error) {
			console.error("Copy snapshot failed:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : translate("Unknown error"),
			};
		}
	}

	private async createSnapshot(): Promise<SnapshotResult> {
		try {
			const renderTree = this.getRenderTree();
			const activeProject = this.editor.project.getActive();

			if (!renderTree || !activeProject) {
				return { success: false, error: "No project or scene to capture" };
			}

			const duration = this.editor.timeline.getTotalDuration();
			if (duration === 0) {
				return { success: false, error: "Project is empty" };
			}

			const { canvasSize, fps } = activeProject.settings;
			const renderTime = Math.min(
				this.editor.playback.getCurrentTime(),
				this.editor.timeline.getLastFrameTime(),
			);

			const renderer = new CanvasRenderer({
				width: canvasSize.width,
				height: canvasSize.height,
				fps,
			});

			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = canvasSize.width;
			tempCanvas.height = canvasSize.height;

			await renderer.renderToCanvas({
				node: renderTree,
				time: renderTime,
				targetCanvas: tempCanvas,
			});

			const blob = await new Promise<Blob | null>((resolve) => {
				tempCanvas.toBlob((result) => resolve(result), "image/png");
			});

			if (!blob) {
				return { success: false, error: "Failed to create image" };
			}

			const timecode = formatTimecode({ time: renderTime, rate: fps })!.replace(
				/:/g,
				"-",
			);
			const safeName =
				activeProject.metadata.name.replace(/[<>:"/\\|?*]/g, "-").trim() ||
				"snapshot";
			const filename = `${safeName}-${timecode}.png`;

			return { success: true, blob, filename };
		} catch (error) {
			console.error("Snapshot capture failed:", error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : translate("Unknown error"),
			};
		}
	}

	async exportProject({
		options,
		onProgress,
		onCancel,
	}: {
		options: ExportOptions;
		onProgress?: ({
			progress,
			stage,
		}: {
			progress: number;
			stage?: string;
		}) => void;
		onCancel?: () => boolean;
	}): Promise<ExportResult> {
		const { format, quality, fps, includeAudio } = options;

		let audio: ExportAudioRenderer | undefined;
		let exporter: SceneExporter | undefined;
		const controller = new AbortController();
		const cancelInterval = setInterval(() => {
			if (onCancel?.()) {
				controller.abort();
				exporter?.cancel();
			}
		}, 100);
		this.editor.playback.pause();
		try {
			const tracks = this.editor.scenes.getActiveScene().tracks;
			const mediaAssets = this.editor.media.getAssets();
			const activeProject = this.editor.project.getActive();
			if (!activeProject)
				return { success: false, error: translate("No active project") };
			const duration = this.editor.timeline.getTotalDuration();
			if (duration <= 0)
				return { success: false, error: translate("Project is empty") };
			onProgress?.({ progress: 0.01, stage: translate("Preparing audio") });
			if (includeAudio)
				audio = await ExportAudioRenderer.create({
					tracks,
					mediaAssets,
					signal: controller.signal,
				});
			if (controller.signal.aborted) return { success: false, cancelled: true };
			const scene = buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize: activeProject.settings.canvasSize,
				background: activeProject.settings.background,
			});
			exporter = new SceneExporter({
				...activeProject.settings.canvasSize,
				fps: fps ?? activeProject.settings.fps,
				format,
				quality,
				audio,
			});
			exporter.on("progress", (progress, stage) =>
				onProgress?.({ progress: 0.02 + progress * 0.98, stage }),
			);
			return await exporter.export({ rootNode: scene });
		} catch (error) {
			if (controller.signal.aborted) return { success: false, cancelled: true };
			console.error("Export failed:", error);
			const message =
				error instanceof Error
					? error.message
					: translate("Unknown export error");
			return {
				success: false,
				error: /allocation|out of memory|quota/i.test(message)
					? translate(
							"Not enough memory or disk space to export. Free some space, reduce resolution or export a shorter section.",
						)
					: message,
			};
		} finally {
			clearInterval(cancelInterval);
			await audio?.dispose();
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
