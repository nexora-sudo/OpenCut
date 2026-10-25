import { BaseNode } from "./base-node";
import type { VideoNode } from "./video-node";
import type { ImageNode } from "./image-node";
import type { ClipTransition } from "@/transitions/types";
import type { TransitionState } from "opencut-wasm";

export class TransitionNode extends BaseNode<
	{
		from: VideoNode | ImageNode;
		to: VideoNode | ImageNode;
		transition: ClipTransition;
	},
	TransitionState
> {}
