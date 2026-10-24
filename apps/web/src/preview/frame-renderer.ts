// Only completed frames may be cached. A failed draw must release the queue so
// playback, scrubbing and scene edits can render again without reloading.
export class PreviewFrameRenderer<Scene> {
	private rendering = false;
	private lastScene: Scene | null = null;
	private lastFrame = -1;

	invalidate() {
		this.lastScene = null;
		this.lastFrame = -1;
	}

	async render({
		scene,
		frame,
		draw,
		onError,
	}: {
		scene: Scene;
		frame: number;
		draw: () => Promise<void>;
		onError: (error: unknown) => void;
	}): Promise<void> {
		if (
			this.rendering ||
			(scene === this.lastScene && frame === this.lastFrame)
		)
			return;
		this.rendering = true;
		try {
			await draw();
			this.lastScene = scene;
			this.lastFrame = frame;
		} catch (error) {
			onError(error);
		} finally {
			this.rendering = false;
		}
	}
}
