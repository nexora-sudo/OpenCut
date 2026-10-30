import type { EffectDefinition } from "@/effects/types";

const looks = [
	{
		type: "sepia",
		name: "Sepia",
		filter: "sepia(1)",
		keywords: ["vintage", "retro"],
	},
	{
		type: "warm",
		name: "Warm",
		filter: "sepia(.2) saturate(1.2)",
		keywords: ["temperature", "sunset"],
	},
	{
		type: "cool",
		name: "Cool",
		filter: "sepia(.1) hue-rotate(160deg)",
		keywords: ["temperature", "blue"],
	},
	{
		type: "vivid",
		name: "Vivid",
		filter: "saturate(1.5) contrast(1.15)",
		keywords: ["contrast", "saturation"],
	},
	{
		type: "negative",
		name: "Negative",
		filter: "invert(1)",
		keywords: ["invert", "colour"],
	},
] as const;

export const colourEffectDefinitions: EffectDefinition[] = looks.map(
	(look, mode) => ({
		type: look.type,
		name: look.name,
		keywords: [look.type, ...look.keywords],
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
			previewFilter: () => look.filter,
			passes: [
				{
					shader: "colour",
					uniforms: ({ effectParams }) => ({
						u_amount:
							Math.max(
								0,
								Math.min(100, Number(effectParams.intensity ?? 100)),
							) / 100,
						u_mode: mode,
					}),
				},
			],
		},
	}),
);
