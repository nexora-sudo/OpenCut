import { effectsRegistry } from "../registry";
import { blurEffectDefinition } from "./blur";
import { grayscaleEffectDefinition } from "./grayscale";

const defaultEffects = [blurEffectDefinition, grayscaleEffectDefinition];

export function registerDefaultEffects(): void {
	for (const definition of defaultEffects) {
		if (effectsRegistry.has(definition.type)) {
			continue;
		}
		effectsRegistry.register({
			key: definition.type,
			definition,
		});
	}
}
