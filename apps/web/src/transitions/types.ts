import type { MediaTime } from "@/wasm";

export const TRANSITIONS = [
	{ type: "dissolve", name: "Dissolve" },
	{ type: "slide-left", name: "Slide left" },
	{ type: "slide-right", name: "Slide right" },
	{ type: "slide-up", name: "Slide up" },
	{ type: "slide-down", name: "Slide down" },
	{ type: "zoom-in", name: "Zoom in" },
] as const;
export type TransitionType = (typeof TRANSITIONS)[number]["type"];
export interface ClipTransition {
	type: TransitionType;
	duration: MediaTime;
	fromElementId: string;
	/** Undefined preserves the frozen-frame behavior of projects created before 0.4.0. */
	moving?: boolean;
	audioCrossfade?: boolean;
}
