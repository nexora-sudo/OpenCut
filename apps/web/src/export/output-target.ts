import { BufferTarget, StreamTarget, type Target } from "mediabunny";
import { translate } from "@/i18n/translate";

export type ExportOutput = {
	target: Target;
	finish: () => Promise<{
		buffer?: ArrayBuffer;
		blob?: Blob;
		cleanup?: () => Promise<void>;
	}>;
	cleanup: () => Promise<void>;
};
export async function createExportOutput({
	mimeType,
}: {
	mimeType: string;
}): Promise<ExportOutput> {
	if (!navigator.storage?.getDirectory) {
		const target = new BufferTarget();
		return {
			target,
			finish: async () => {
				if (!target.buffer)
					throw new Error(translate("Failed to export video"));
				return { buffer: target.buffer };
			},
			cleanup: async () => {},
		};
	}
	// Disk-backed output avoids a single growing ArrayBuffer for long exports.
	const dir = await navigator.storage.getDirectory();
	const name = `opencut-export-${crypto.randomUUID()}`;
	const file = await dir.getFileHandle(name, { create: true });
	const writer = await file.createWritable();
	let closed = false;
	const cleanup = async () => {
		if (!closed) {
			closed = true;
			await writer.abort().catch(() => {});
		}
		await dir.removeEntry(name).catch(() => {});
	};
	const target = new StreamTarget(
		new WritableStream({
			write: async ({ data, position }) => {
				await writer.write({ type: "write", data, position });
			},
			close: async () => {
				await writer.close();
				closed = true;
			},
			abort: async () => {
				await cleanup();
			},
		}),
		{ chunked: true, chunkSize: 1024 * 1024 },
	);
	return {
		target,
		cleanup,
		finish: async () => {
			if (!closed) {
				await writer.close();
				closed = true;
			}
			const blob = await file.getFile();
			return { blob: blob.slice(0, blob.size, mimeType), cleanup };
		},
	};
}
