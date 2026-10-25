import type { EffectDefinition } from "@/effects/types";

export const grayscaleEffectDefinition: EffectDefinition = {
	type: "grayscale",
	name: "Black and white",
	keywords: ["grayscale", "monochrome", "black", "white"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "grayscale",
				uniforms: ({ effectParams }) => ({
					u_amount: Number(effectParams.intensity ?? 100) / 100,
				}),
			},
		],
	},
};
