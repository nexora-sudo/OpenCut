import { expect, test } from "bun:test";
import { serializeFrame } from "../serialize-frame";
import type { FrameDescriptor } from "../types";

test("scene effects use the published WASM field while layers keep their own schema", () => {
	const passes = [
		[
			{
				shader: "gaussian-blur",
				uniforms: { u_sigma: 3, u_step: 1, u_direction: [1, 0] },
			},
		],
	];
	const frame: FrameDescriptor = {
		width: 640,
		height: 360,
		clear: { color: [0, 0, 0, 1] },
		items: [
			{
				type: "layer",
				textureId: "video",
				transform: {
					centerX: 320,
					centerY: 180,
					width: 640,
					height: 360,
					rotationDegrees: 0,
					flipX: false,
					flipY: false,
				},
				opacity: 1,
				blendMode: "normal",
				effectPassGroups: passes,
				mask: null,
			},
			{ type: "sceneEffect", effectPassGroups: passes },
		],
	};
	const wire = serializeFrame(frame);
	expect(wire.items[0]).toBe(frame.items[0]);
	expect(wire.items[1]).toEqual({
		type: "sceneEffect",
		effect_pass_groups: passes,
	});
	expect(frame.items[1]).toEqual({
		type: "sceneEffect",
		effectPassGroups: passes,
	});
	expect(wire.width).toBe(640);
	expect(wire.clear).toBe(frame.clear);
});
