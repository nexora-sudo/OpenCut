import { z } from "zod";
import type { TProject } from "./types";
import type { MediaAsset } from "@/media/types";
import { translate } from "@/i18n/translate";

const MAGIC = "OPENCUT1";
const mediaSchema = z.object({
	id: z.string().min(1).max(256),
	name: z.string().min(1).max(4096),
	fileName: z.string().min(1).max(4096).optional(),
	type: z.enum(["audio", "video", "image"]),
	mime: z.string().max(256),
	size: z.number().int().nonnegative().safe(),
	lastModified: z.number().nonnegative(),
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	duration: z.number().nonnegative().optional(),
	fps: z.number().positive().optional(),
	hasAudio: z.boolean().optional(),
});
function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function validProject(value: unknown): value is TProject {
	if (
		!record(value) ||
		!record(value.metadata) ||
		!record(value.settings) ||
		!record(value.settings.fps) ||
		!record(value.settings.canvasSize)
	)
		return false;
	if (
		typeof value.metadata.id !== "string" ||
		typeof value.metadata.name !== "string" ||
		!finite(value.metadata.duration) ||
		!(value.metadata.createdAt instanceof Date) ||
		!(value.metadata.updatedAt instanceof Date) ||
		!Number.isInteger(value.version)
	)
		return false;
	const { fps, canvasSize, background } = value.settings;
	if (
		!finite(fps.numerator) ||
		fps.numerator <= 0 ||
		!finite(fps.denominator) ||
		fps.denominator <= 0 ||
		fps.numerator / fps.denominator > 240 ||
		!finite(canvasSize.width) ||
		canvasSize.width < 1 ||
		canvasSize.width > 16384 ||
		!finite(canvasSize.height) ||
		canvasSize.height < 1 ||
		canvasSize.height > 16384 ||
		!record(background) ||
		!["color", "blur"].includes(String(background.type))
	)
		return false;
	if (
		!Array.isArray(value.scenes) ||
		!value.scenes.length ||
		value.scenes.length > 1000 ||
		typeof value.currentSceneId !== "string"
	)
		return false;
	const ids = new Set<string>();
	for (const scene of value.scenes) {
		if (
			!record(scene) ||
			typeof scene.id !== "string" ||
			ids.has(scene.id) ||
			typeof scene.name !== "string" ||
			typeof scene.isMain !== "boolean" ||
			!(scene.createdAt instanceof Date) ||
			!(scene.updatedAt instanceof Date) ||
			!Array.isArray(scene.bookmarks) ||
			!record(scene.tracks)
		)
			return false;
		ids.add(scene.id);
		const { main, overlay, audio } = scene.tracks;
		if (
			!record(main) ||
			main.type !== "video" ||
			!Array.isArray(overlay) ||
			!Array.isArray(audio)
		)
			return false;
		for (const track of [main, ...overlay, ...audio]) {
			if (
				!record(track) ||
				typeof track.id !== "string" ||
				typeof track.name !== "string" ||
				!["video", "audio", "text", "effect", "graphic"].includes(
					String(track.type),
				) ||
				!Array.isArray(track.elements)
			)
				return false;
			for (const element of track.elements) {
				if (
					!record(element) ||
					typeof element.id !== "string" ||
					typeof element.name !== "string" ||
					![
						"video",
						"image",
						"audio",
						"text",
						"sticker",
						"graphic",
						"effect",
					].includes(String(element.type)) ||
					!finite(element.startTime) ||
					!finite(element.duration) ||
					!finite(element.trimStart) ||
					!finite(element.trimEnd) ||
					!record(element.params)
				)
					return false;
			}
		}
	}
	return ids.has(value.currentSceneId);
}
const projectSchema = z.custom<TProject>(
	validProject,
	"Invalid backup project",
);
const manifestSchema = z.object({
	format: z.literal("opencut-backup"),
	version: z.literal(1),
	project: projectSchema,
	media: z.array(mediaSchema).max(10000),
});

function checkMediaReferences({
	project,
	ids,
}: {
	project: TProject;
	ids: Set<string>;
}) {
	for (const scene of project.scenes)
		for (const track of [
			scene.tracks.main,
			...scene.tracks.overlay,
			...scene.tracks.audio,
		])
			for (const element of track.elements) {
				if ("mediaId" in element && !ids.has(element.mediaId))
					throw new Error(
						translate("A media file is missing from this backup."),
					);
			}
}

export function createProjectBackup({
	project,
	mediaAssets,
}: {
	project: TProject;
	mediaAssets: MediaAsset[];
}): Blob {
	checkMediaReferences({ project, ids: new Set(mediaAssets.map((a) => a.id)) });
	const manifest = JSON.stringify(
		{
			format: "opencut-backup",
			version: 1,
			project,
			media: mediaAssets.map((a) => ({
				id: a.id,
				name: a.name,
				fileName: a.file.name,
				type: a.type,
				mime: a.file.type,
				size: a.file.size,
				lastModified: a.file.lastModified,
				width: a.width,
				height: a.height,
				duration: a.duration,
				fps: a.fps,
				hasAudio: a.hasAudio,
			})),
		},
		(key, value: unknown) => (key === "buffer" ? undefined : value),
	);
	const json = new TextEncoder().encode(manifest);
	if (json.length > 16 * 1024 * 1024)
		throw new Error(
			translate("The project metadata is too large for a backup."),
		);
	const header = new Uint8Array(12);
	header.set(new TextEncoder().encode(MAGIC));
	new DataView(header.buffer).setUint32(8, json.length, true);
	return new Blob([header, json, ...mediaAssets.map((a) => a.file)], {
		type: "application/octet-stream",
	});
}

export async function readProjectBackup(
	file: Blob,
): Promise<{ project: TProject; mediaAssets: MediaAsset[] }> {
	if (file.size < 12)
		throw new Error(translate("Invalid or incomplete backup file."));
	const header = await file.slice(0, 12).arrayBuffer();
	const size = new DataView(header).getUint32(8, true);
	if (
		new TextDecoder().decode(header.slice(0, 8)) !== MAGIC ||
		size > 16 * 1024 * 1024 ||
		size > file.size - 12
	)
		throw new Error(translate("Invalid or incomplete backup file."));
	const raw: unknown = JSON.parse(
		await file.slice(12, 12 + size).text(),
		(key, value: unknown) => {
			if (
				(key === "createdAt" || key === "updatedAt") &&
				typeof value === "string"
			) {
				const date = new Date(value);
				if (!Number.isFinite(date.getTime())) throw new Error("Invalid date");
				return date;
			}
			return value;
		},
	);
	const parsed = manifestSchema.safeParse(raw);
	if (!parsed.success)
		throw new Error(translate("Invalid or incomplete backup file."));
	const manifest = parsed.data;
	const ids = new Set<string>();
	let offset = 12 + size;
	const mediaAssets: MediaAsset[] = manifest.media.map((meta) => {
		if (ids.has(meta.id) || meta.size > file.size - offset)
			throw new Error(translate("Invalid or incomplete backup file."));
		ids.add(meta.id);
		const media = new File(
			[file.slice(offset, offset + meta.size)],
			meta.fileName ?? meta.name,
			{ type: meta.mime, lastModified: meta.lastModified },
		);
		offset += meta.size;
		return { ...meta, file: media };
	});
	if (offset !== file.size)
		throw new Error(translate("Invalid or incomplete backup file."));
	checkMediaReferences({ project: manifest.project, ids });
	return { project: manifest.project, mediaAssets };
}
