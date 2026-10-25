"use client";
import { useT } from "@/i18n/use-t";

import { useEffect, useRef, useCallback } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { effectsRegistry, EFFECT_TARGET_ELEMENT_TYPES } from "@/effects";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import { useEditor } from "@/editor/use-editor";
import { buildEffectElement } from "@/timeline/element-utils";
import type { EffectDefinition } from "@/effects/types";
import { isVisualElement } from "@/timeline/element-utils";
import { ZERO_MEDIA_TIME } from "@/wasm";

export function EffectsView() {
	const t = useT();

	const effects = effectsRegistry.getAll();

	return (
		<PanelView title={t("Effects")}>
			<p className="text-muted-foreground mb-3 px-1 text-xs">
				{t(
					"Click an effect to apply it to the selected clip, or to the entire project when no clip is selected. Drag it to the timeline to choose a range.",
				)}
			</p>
			<EffectsGrid effects={effects} />
		</PanelView>
	);
}

function EffectsGrid({ effects }: { effects: EffectDefinition[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
		>
			{effects.map((effect) => (
				<EffectItem key={effect.type} effect={effect} />
			))}
		</div>
	);
}

function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const render = () => {
			if (canvasRef.current) {
				effectPreviewService.renderPreview({
					effectType,
					params: {},
					targetCanvas: canvasRef.current,
				});
			}
		};

		render();
		return effectPreviewService.onPreviewImageReady({ callback: render });
	}, [effectType]);

	return <canvas ref={canvasRef} className="size-full" />;
}

function EffectItem({ effect }: { effect: EffectDefinition }) {
	const t = useT();

	const editor = useEditor();
	const selected = useEditor((e) => e.selection.getSelectedElements());
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	const selectedTarget =
		selected.length === 1
			? editor.timeline.getElementsWithTracks({ elements: selected })[0]
			: undefined;
	const target =
		selectedTarget && isVisualElement(selectedTarget.element)
			? selectedTarget
			: undefined;
	const actionLabel = target
		? t("Apply to selected clip")
		: t("Apply to entire project");

	const handleAddToTimeline = useCallback(() => {
		if (target) {
			editor.timeline.addClipEffect({
				trackId: target.track.id,
				elementId: target.element.id,
				effectType: effect.type,
			});
			const time = editor.playback.getCurrentTime();
			if (
				time < target.element.startTime ||
				time >= target.element.startTime + target.element.duration
			)
				editor.playback.seek({ time: target.element.startTime });
			return;
		}
		const currentTime = editor.playback.getCurrentTime();
		const duration = editor.timeline.getTotalDuration();
		const element = buildEffectElement({
			effectType: effect.type,
			startTime: ZERO_MEDIA_TIME,
			duration: duration || undefined,
		});

		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
		if (duration > 0 && currentTime >= duration)
			editor.playback.seek({ time: editor.timeline.getLastFrameTime() });
	}, [editor, effect.type, target]);

	const preview = (
		<button
			type="button"
			className="block size-full cursor-pointer"
			aria-label={t("Apply {v0}", { v0: t(effect.name) })}
			title={actionLabel}
			onClick={handleAddToTimeline}
		>
			<EffectPreviewCanvas effectType={effect.type} />
		</button>
	);

	return (
		<div>
			<DraggableItem
				name={t(effect.name)}
				preview={preview}
				dragData={{
					id: effect.type,
					name: effect.name,
					type: "effect",
					effectType: effect.type,
					targetElementTypes: EFFECT_TARGET_ELEMENT_TYPES,
				}}
				onAddToTimeline={handleAddToTimeline}
				aspectRatio={1}
				isRounded
				variant="card"
				containerClassName="w-full"
			/>
			<p className="text-muted-foreground mt-1 text-[0.65rem]">{actionLabel}</p>
		</div>
	);
}
