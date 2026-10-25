import { BaseNode } from "./base-node";
import type { VideoNode } from "./video-node";
import type { ImageNode } from "./image-node";
import type { ClipTransition } from "@/transitions/types";
import type { TransitionState } from "opencut-wasm";
import type { ResolvedVisualSourceNodeState } from "./visual-node";

export class TransitionNode extends BaseNode<
	{
		from: VideoNode | ImageNode;
		to: VideoNode | ImageNode;
		transition: ClipTransition;
	},
	TransitionState
> {
	// Decoder canvases are pooled and mutable. Keep an owned snapshot for the
	// outgoing frame, rather than seeking backwards into that pool every frame.
	frozenFrom: ResolvedVisualSourceNodeState | null = null;
}
