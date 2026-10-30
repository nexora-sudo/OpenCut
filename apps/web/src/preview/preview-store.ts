import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isGuideId, type GuideId } from "@/guides";
import { DEFAULT_GRID_CONFIG } from "@/guides/grid";
import type { GridConfig } from "@/guides/types";

export type PreviewQuality = "original" | "half" | "quarter";

type PreviewOverlaysState = Record<string, boolean>;

interface PersistedPreviewState {
	quality?: PreviewQuality;
	activeGuide?: string | null;
	layoutGuide?: {
		platform?: string | null;
	};
	overlays?: PreviewOverlaysState;
	gridConfig?: GridConfig;
}

interface PreviewState {
	quality: PreviewQuality;
	setQuality: (quality: PreviewQuality) => void;
	activeGuide: GuideId | null;
	overlays: PreviewOverlaysState;
	gridConfig: GridConfig;
	toggleGuide: (guideId: GuideId) => void;
	setGridConfig: (config: Partial<GridConfig>) => void;
	setOverlayVisibility: ({
		overlayId,
		isVisible,
	}: {
		overlayId: string;
		isVisible: boolean;
	}) => void;
	toggleOverlayVisibility: ({ overlayId }: { overlayId: string }) => void;
}

const DEFAULT_PREVIEW_OVERLAYS: PreviewOverlaysState = {};

function getPersistedActiveGuide(
	state: PersistedPreviewState | undefined,
): GuideId | null {
	const persistedGuide =
		state?.activeGuide ?? state?.layoutGuide?.platform ?? null;

	if (typeof persistedGuide !== "string") {
		return null;
	}

	return isGuideId(persistedGuide) ? persistedGuide : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readPersistedState(value: unknown): PersistedPreviewState {
	if (!isRecord(value)) return {};
	const layout = isRecord(value.layoutGuide) ? value.layoutGuide : {};
	const grid = isRecord(value.gridConfig) ? value.gridConfig : {};
	return {
		quality:
			value.quality === "half" || value.quality === "quarter"
				? value.quality
				: "original",
		activeGuide:
			typeof value.activeGuide === "string" ? value.activeGuide : null,
		layoutGuide: {
			platform: typeof layout.platform === "string" ? layout.platform : null,
		},
		gridConfig: {
			rows:
				typeof grid.rows === "number" &&
				Number.isFinite(grid.rows) &&
				grid.rows > 0
					? grid.rows
					: DEFAULT_GRID_CONFIG.rows,
			cols:
				typeof grid.cols === "number" &&
				Number.isFinite(grid.cols) &&
				grid.cols > 0
					? grid.cols
					: DEFAULT_GRID_CONFIG.cols,
		},
	};
}

export const usePreviewStore = create<PreviewState>()(
	persist(
		(set) => ({
			quality: "original",
			setQuality: (quality) => set({ quality }),
			activeGuide: null,
			overlays: DEFAULT_PREVIEW_OVERLAYS,
			gridConfig: DEFAULT_GRID_CONFIG,
			toggleGuide: (guideId) => {
				set((state) => ({
					activeGuide: state.activeGuide === guideId ? null : guideId,
				}));
			},
			setGridConfig: (config) => {
				set((state) => ({
					gridConfig: { ...state.gridConfig, ...config },
				}));
			},
			setOverlayVisibility: ({ overlayId, isVisible }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlayId]: isVisible,
					},
				}));
			},
			toggleOverlayVisibility: ({ overlayId }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlayId]: !state.overlays[overlayId],
					},
				}));
			},
		}),
		{
			name: "preview-settings",
			version: 7,
			migrate: (persistedState) => {
				const state = readPersistedState(persistedState);

				return {
					quality:
						state?.quality === "half" || state?.quality === "quarter"
							? state.quality
							: "original",
					activeGuide: getPersistedActiveGuide(state),
					overlays: DEFAULT_PREVIEW_OVERLAYS,
					gridConfig: {
						rows: state?.gridConfig?.rows ?? DEFAULT_GRID_CONFIG.rows,
						cols: state?.gridConfig?.cols ?? DEFAULT_GRID_CONFIG.cols,
					},
				};
			},
			partialize: (state) => ({
				quality: state.quality,
				activeGuide: state.activeGuide,
				overlays: state.overlays,
				gridConfig: state.gridConfig,
			}),
		},
	),
);
