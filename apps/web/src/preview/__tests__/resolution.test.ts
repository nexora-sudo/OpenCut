import { expect, test } from "bun:test";
import { scaleFrameForPreview } from "@/services/renderer/preview-resolution";
import type {
	FrameDescriptor,
	TextureUploadDescriptor,
} from "@/services/renderer/compositor/types";

test("quarter preview scales translated/rotated layers and masks without mutating export coordinates", () => {
	const frame: FrameDescriptor = {
		width: 1920,
		height: 1080,
		clear: { color: [0, 0, 0, 1] },
		items: [
			{
				type: "layer",
				textureId: "clip",
				opacity: 0.6,
				blendMode: "normal",
				effectPassGroups: [],
				transform: {
					centerX: 1160,
					centerY: 640,
					width: 1280,
					height: 720,
					rotationDegrees: 15,
					flipX: true,
					flipY: false,
				},
				mask: { textureId: "mask", feather: 12, inverted: false },
			},
		],
	};
	const original = structuredClone(frame);
	const preview = scaleFrameForPreview({ frame, textures: [], scale: 0.25 });
	expect([preview.frame.width, preview.frame.height]).toEqual([480, 270]);
	expect(preview.frame.items[0]).toMatchObject({
		transform: {
			centerX: 290,
			centerY: 160,
			width: 320,
			height: 180,
			rotationDegrees: 15,
			flipX: true,
		},
		mask: { feather: 3 },
		opacity: 0.6,
	});
	expect(frame).toEqual(original);
	const exported = scaleFrameForPreview({ frame, textures: [], scale: 1 });
	expect(exported.frame).toBe(frame);
	expect(exported.frame.width).toBe(1920);
});

test("half preview rasterizes text and masks with a scaled drawing context, retaining native decode sources", () => {
	const calls: unknown[] = [];
	const frame: FrameDescriptor = {
		width: 1280,
		height: 720,
		clear: { color: [0, 0, 0, 1] },
		items: [],
	};
	const video: TextureUploadDescriptor = {
		kind: "external",
		id: "video",
		width: 1280,
		height: 720,
		// Only identity is inspected here; no decoder or DOM is invoked.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		source: {} as CanvasImageSource,
	};
	const text: TextureUploadDescriptor = {
		kind: "rendered",
		id: "text",
		width: 1280,
		height: 720,
		contentHash: "layout",
		draw: () => calls.push("draw"),
	};
	const preview = scaleFrameForPreview({
		frame,
		textures: [video, text],
		scale: 0.5,
	});
	expect(preview.textures[0]).toBe(video);
	const rendered = preview.textures[1];
	expect([rendered.width, rendered.height]).toEqual([640, 360]);
	if (rendered.kind !== "rendered")
		throw new Error("Expected a rasterized text texture");
	// Browser context boundary: only these three methods are used by the adapter.
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
	rendered.draw({
		save: () => calls.push("save"),
		// CanvasRenderingContext2D.scale uses positional arguments.
		// eslint-disable-next-line opencut/prefer-object-params
		scale: (x: number, y: number) => calls.push([x, y]),
		restore: () => calls.push("restore"),
	} as unknown as OffscreenCanvasRenderingContext2D);
	expect(calls).toEqual(["save", [0.5, 0.5], "draw", "restore"]);
	expect(text.width).toBe(1280);
	expect(text.contentHash).toBe("layout");
});

test("reduced presentation preserves blur radius for both clip and whole-scene effects", () => {
	const blur = [
		{
			shader: "gaussian-blur",
			uniforms: { u_sigma: 20, u_step: 2, u_direction: [1, 0] },
		},
	];
	const frame: FrameDescriptor = {
		width: 1280,
		height: 720,
		clear: { color: [0, 0, 0, 1] },
		items: [
			{ type: "sceneEffect", effectPassGroups: [blur] },
			{
				type: "layer",
				textureId: "clip",
				opacity: 1,
				blendMode: "normal",
				mask: null,
				transform: {
					centerX: 640,
					centerY: 360,
					width: 1280,
					height: 720,
					rotationDegrees: 0,
					flipX: false,
					flipY: false,
				},
				effectPassGroups: [blur],
			},
		],
	};
	const preview = scaleFrameForPreview({ frame, textures: [], scale: 0.25 });
	for (const item of preview.frame.items)
		expect(item.effectPassGroups[0][0].uniforms).toEqual({
			u_sigma: 5,
			u_step: 0.5,
			u_direction: [1, 0],
		});
	expect(frame.items[0].effectPassGroups[0][0].uniforms.u_sigma).toBe(20);
});
