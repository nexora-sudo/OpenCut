"use client";

import { ArrowLeft, Blend, Trash2 } from "lucide-react";
import { getTransitionState } from "opencut-wasm";
import { useEditor } from "@/editor/use-editor";
import { useT } from "@/i18n/use-t";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TICKS_PER_SECOND, roundMediaTime } from "@/wasm";
import type { ImageElement, VideoElement } from "@/timeline";
import { TRANSITIONS, type TransitionType } from "../types";

export function TransitionsView() {
	const t = useT();
	const editor = useEditor();
	const selected = useEditor((e) => e.selection.getSelectedElements());
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	const selection =
		selected.length === 1
			? editor.timeline.getElementsWithTracks({ elements: selected })[0]
			: undefined;
	return (
		<PanelView title={t("Transitions")}>
			{selection &&
			(selection.element.type === "video" ||
				selection.element.type === "image") ? (
				<TransitionControls
					element={selection.element}
					trackId={selection.track.id}
				/>
			) : (
				<p className="text-muted-foreground px-2 py-4 text-sm">
					{t(
						"Select the second of two adjacent video or image clips on the same track.",
					)}
				</p>
			)}
		</PanelView>
	);
}

export function TransitionControls({
	element,
	trackId,
}: {
	element: VideoElement | ImageElement;
	trackId: string;
}) {
	const t = useT();
	const editor = useEditor();
	const tracks = useEditor((e) => e.scenes.getActiveScene().tracks);
	const track = [tracks.main, ...tracks.overlay].find(
		(candidate) => candidate.id === trackId,
	);
	const elements =
		track?.type === "video"
			? track.elements
					.filter((clip) => !clip.hidden)
					.toSorted((a, b) => a.startTime - b.startTime)
			: [];
	const index = elements.findIndex((clip) => clip.id === element.id);
	const previous = index > 0 ? elements[index - 1] : undefined;
	const configured = element.transitionIn;
	const state = previous
		? getTransitionState({
				previousStart: previous.startTime,
				previousDuration: previous.duration,
				start: element.startTime,
				duration: element.duration,
				requestedDuration: configured?.duration ?? TICKS_PER_SECOND / 2,
				time: element.startTime,
				frameDuration: 1,
				moving: configured?.moving ?? false,
			})
		: null;
	const canApply = !!state?.duration;
	const canCrossfade =
		element.type === "video" &&
		previous?.type === "video" &&
		!(
			element.retime &&
			"mode" in element.retime &&
			element.retime.mode === "curve"
		) &&
		!(
			previous.retime &&
			"mode" in previous.retime &&
			previous.retime.mode === "curve"
		);
	const duration = (state?.duration || TICKS_PER_SECOND / 2) / TICKS_PER_SECOND;
	const update = ({
		type,
		seconds = duration,
		moving = configured?.moving ?? true,
		audioCrossfade = configured?.audioCrossfade ?? false,
	}: {
		type: TransitionType;
		seconds?: number;
		moving?: boolean;
		audioCrossfade?: boolean;
	}) => {
		if (!previous || !canApply || !Number.isFinite(seconds) || seconds <= 0)
			return;
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						transitionIn: {
							type,
							duration: roundMediaTime({ time: seconds * TICKS_PER_SECOND }),
							fromElementId: previous.id,
							moving,
							audioCrossfade,
						},
					},
				},
			],
		});
	};
	return (
		<div className="space-y-4 p-3">
			<h3 className="text-sm font-medium">{t("Transition into this clip")}</h3>
			<p className="text-muted-foreground text-xs">
				{canApply
					? t("From {v0} to {v1}", { v0: previous!.name, v1: element.name })
					: t(
							"Select the second of two adjacent video or image clips on the same track.",
						)}
			</p>
			<div className="grid grid-cols-2 gap-2">
				{TRANSITIONS.map((transition) => (
					<Button
						key={transition.type}
						variant={
							configured?.type === transition.type &&
							configured.fromElementId === previous?.id
								? "secondary"
								: "outline"
						}
						className="h-auto min-h-20 flex-col gap-2 whitespace-normal"
						disabled={!canApply}
						onClick={() => update({ type: transition.type })}
						aria-pressed={
							configured?.type === transition.type &&
							configured.fromElementId === previous?.id
						}
					>
						{transition.type === "dissolve" ? (
							<Blend className="size-5" />
						) : (
							<ArrowLeft className="size-5" />
						)}
						{t(transition.name)}
					</Button>
				))}
			</div>
			{canApply && configured && (
				<div className="space-y-2">
					<Label htmlFor={`transition-duration-${element.id}`}>
						{t("Transition duration (seconds)")}
					</Label>
					<Input
						id={`transition-duration-${element.id}`}
						type="number"
						min={0.01}
						max={2}
						step={0.1}
						value={Number(duration.toFixed(3))}
						onChange={(event) =>
							update({
								type: configured.type,
								seconds: Math.min(2, Number(event.target.value)),
							})
						}
					/>
					<div className="flex items-center gap-2">
						<Checkbox
							id={`transition-motion-${element.id}`}
							checked={configured.moving ?? false}
							onCheckedChange={(value) =>
								update({ type: configured.type, moving: value === true })
							}
						/>
						<Label htmlFor={`transition-motion-${element.id}`}>
							{t("Keep both clips moving")}
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<Checkbox
							id={`transition-audio-${element.id}`}
							disabled={!canCrossfade}
							checked={configured.audioCrossfade ?? false}
							onCheckedChange={(value) =>
								update({
									type: configured.type,
									audioCrossfade: value === true,
								})
							}
						/>
						<Label htmlFor={`transition-audio-${element.id}`}>
							{t("Crossfade clip audio")}
						</Label>
					</div>
					{!canCrossfade && (
						<p className="text-muted-foreground text-xs">
							{t(
								"Audio crossfade requires two video clips without a speed curve.",
							)}
						</p>
					)}
				</div>
			)}
			{configured && (
				<Button
					variant="ghost"
					className="w-full"
					onClick={() =>
						editor.timeline.updateElements({
							updates: [
								{
									trackId,
									elementId: element.id,
									patch: { transitionIn: undefined },
								},
							],
						})
					}
				>
					<Trash2 className="size-4" />
					{t("Remove transition")}
				</Button>
			)}
			<p className="text-muted-foreground text-xs">
				{t(
					"Moving transitions replay the outgoing clip's tail over the incoming clip. Crossfade blends their audio when both clips have enabled audio. Project duration stays unchanged.",
				)}
			</p>
		</div>
	);
}
