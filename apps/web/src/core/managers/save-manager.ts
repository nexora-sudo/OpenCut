import type { EditorCore } from "@/core";
export type SaveState = {
	status: "saved" | "pending" | "saving" | "error";
	savedAt: number | null;
	error: string | null;
};
export class SaveManager {
	private paused = false;
	private pending = false;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private inFlight: Promise<void> | null = null;
	private handlers: Array<() => void> = [];
	private listeners = new Set<() => void>();
	private state: SaveState = { status: "saved", savedAt: null, error: null };
	constructor(private options: { editor: EditorCore; debounceMs?: number }) {}
	private setState(state: SaveState) {
		this.state = state;
		this.listeners.forEach((fn) => fn());
	}
	getState() {
		return this.state;
	}
	subscribe(fn: () => void) {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}
	start() {
		if (this.handlers.length) return;
		const { editor } = this.options;
		this.handlers = [
			editor.scenes.subscribe(() => this.markDirty()),
			editor.timeline.subscribe(() => this.markDirty()),
			editor.media.subscribe(() => this.markDirty()),
		];
		if (typeof window !== "undefined") {
			const unload = (event: BeforeUnloadEvent) => {
				if (this.getIsDirty()) {
					event.preventDefault();
					event.returnValue = "";
				}
			};
			const hidden = () => {
				if (document.visibilityState === "hidden" && this.pending)
					void this.flush().catch(() => {});
			};
			window.addEventListener("beforeunload", unload);
			document.addEventListener("visibilitychange", hidden);
			this.handlers.push(() => {
				window.removeEventListener("beforeunload", unload);
				document.removeEventListener("visibilitychange", hidden);
			});
		}
	}
	stop() {
		this.handlers.forEach((fn) => fn());
		this.handlers = [];
		this.clearTimer();
	}
	pause() {
		this.paused = true;
		this.clearTimer();
	}
	resume() {
		this.paused = false;
		if (this.pending) this.queue();
	}
	reset() {
		this.clearTimer();
		this.pending = false;
		this.setState({ status: "saved", savedAt: null, error: null });
	}
	markDirty({ force = false }: { force?: boolean } = {}) {
		if (!this.options.editor.project.getActiveOrNull()) return;
		if (this.paused && !force) return;
		this.pending = true;
		this.setState({ ...this.state, status: "pending", error: null });
		this.queue();
	}
	getIsDirty() {
		return this.pending || this.inFlight !== null;
	}
	async flush() {
		if (!this.options.editor.project.getActiveOrNull()) return;
		this.pending = true;
		this.clearTimer();
		// A flush must await an existing write, then persist any edits made during it.
		while (this.inFlight || this.pending) {
			if (this.inFlight) await this.inFlight;
			else await this.saveNow();
			if (
				this.paused ||
				this.options.editor.project.getIsLoading() ||
				this.options.editor.project.getMigrationState().isMigrating ||
				!this.options.editor.project.getActiveOrNull()
			)
				break;
		}
	}
	private queue() {
		if (this.paused || this.inFlight) return;
		this.clearTimer();
		this.timer = setTimeout(() => {
			void this.saveNow().catch(() => {});
		}, this.options.debounceMs ?? 800);
	}
	private async saveNow(): Promise<void> {
		if (this.inFlight) return this.inFlight;
		if (!this.pending || this.paused) return;
		const { editor } = this.options;
		if (
			!editor.project.getActiveOrNull() ||
			editor.project.getIsLoading() ||
			editor.project.getMigrationState().isMigrating
		)
			return;
		this.pending = false;
		this.clearTimer();
		this.setState({ ...this.state, status: "saving", error: null });
		this.inFlight = Promise.resolve().then(() =>
			editor.project.saveCurrentProject(),
		);
		try {
			await this.inFlight;
			this.setState({
				status: this.pending ? "pending" : "saved",
				savedAt: Date.now(),
				error: null,
			});
		} catch (error) {
			this.pending = true;
			this.setState({
				...this.state,
				status: "error",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		} finally {
			this.inFlight = null;
			if (this.pending && this.state.status !== "error") this.queue();
		}
	}
	private clearTimer() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
	}
}
