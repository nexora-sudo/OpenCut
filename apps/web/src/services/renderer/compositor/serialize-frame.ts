import type { FrameDescriptor } from "./types";

// The published WASM enum renames variants, but its sceneEffect fields use
// snake_case. Layer fields are a separate struct and remain camelCase.
export function serializeFrame(frame: FrameDescriptor) {
	return {
		...frame,
		items: frame.items.map((item) =>
			item.type === "sceneEffect"
				? { type: item.type, effect_pass_groups: item.effectPassGroups }
				: item,
		),
	};
}
