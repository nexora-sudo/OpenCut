import type {
	FrameDescriptor,
	TextureUploadDescriptor,
} from "./compositor/types";

/** Scale the browser presentation surface without changing project coordinates.
 * Decode sources retain their native resolution; text/masks rasterize at the
 * selected size. Export uses the default scale of 1 and never reads UI settings.
 */
export function scaleFrameForPreview({
	frame,
	textures,
	scale,
}: {
	frame: FrameDescriptor;
	textures: TextureUploadDescriptor[];
	scale: number;
}): { frame: FrameDescriptor; textures: TextureUploadDescriptor[] } {
	if (scale === 1) return { frame, textures };
	const width = Math.max(1, Math.round(frame.width * scale));
	const height = Math.max(1, Math.round(frame.height * scale));
	const x = width / frame.width;
	const y = height / frame.height;
	const scalePassGroups = (
		groups: FrameDescriptor["items"][number]["effectPassGroups"],
	) =>
		groups.map((group) =>
			group.map((pass) => {
				if (pass.shader !== "gaussian-blur") return pass;
				const direction = pass.uniforms.u_direction;
				const factor =
					Array.isArray(direction) && direction.length >= 2
						? Math.hypot(direction[0] * x, direction[1] * y) /
							(Math.hypot(direction[0], direction[1]) || 1)
						: Math.min(x, y);
				return {
					...pass,
					uniforms: {
						...pass.uniforms,
						u_sigma:
							typeof pass.uniforms.u_sigma === "number"
								? pass.uniforms.u_sigma * factor
								: pass.uniforms.u_sigma,
						u_step:
							typeof pass.uniforms.u_step === "number"
								? pass.uniforms.u_step * factor
								: pass.uniforms.u_step,
					},
				};
			}),
		);
	return {
		frame: {
			...frame,
			width,
			height,
			items: frame.items.map((item) =>
				item.type === "sceneEffect"
					? {
							...item,
							effectPassGroups: scalePassGroups(item.effectPassGroups),
						}
					: {
							...item,
							effectPassGroups: scalePassGroups(item.effectPassGroups),
							transform: {
								...item.transform,
								centerX: item.transform.centerX * x,
								centerY: item.transform.centerY * y,
								width: item.transform.width * x,
								height: item.transform.height * y,
							},
							mask: item.mask
								? { ...item.mask, feather: item.mask.feather * Math.min(x, y) }
								: null,
						},
			),
		},
		textures: textures.map((texture) => {
			if (texture.kind === "external") return texture;
			const textureWidth = Math.max(1, Math.round(texture.width * x));
			const textureHeight = Math.max(1, Math.round(texture.height * y));
			return {
				...texture,
				contentHash: `${texture.contentHash}:preview=${width}x${height}`,
				width: textureWidth,
				height: textureHeight,
				draw: (ctx) => {
					ctx.save();
					ctx.scale(
						textureWidth / texture.width,
						textureHeight / texture.height,
					);
					texture.draw(ctx);
					ctx.restore();
				},
			};
		}),
	};
}
