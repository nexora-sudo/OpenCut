import type { MediaTime } from "@/wasm";

export const TRANSITIONS = [
	{ type: "dissolve", name: "Dissolve" },
	{ type: "slide-left", name: "Slide left" },
] as const;
export type TransitionType = (typeof TRANSITIONS)[number]["type"];
export interface ClipTransition {
	type: TransitionType;
	duration: MediaTime;
	fromElementId: string;
}
