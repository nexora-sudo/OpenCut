import { translate } from "@/i18n/translate";

export class ExportCancelled extends Error {}
export async function exportStep<T>({
	run,
	label,
	signal,
	timeoutMs = 120000,
}: {
	run: () => Promise<T>;
	label: string;
	signal: AbortSignal;
	timeoutMs?: number;
}): Promise<T> {
	if (signal.aborted) throw new ExportCancelled();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let onAbort: (() => void) | undefined;
	try {
		return await Promise.race([
			Promise.resolve().then(run),
			new Promise<never>((_, reject) => {
				onAbort = () => reject(new ExportCancelled());
				signal.addEventListener("abort", onAbort, { once: true });
				timer = setTimeout(
					() =>
						reject(
							new Error(
								translate(
									"Export timed out during {v0}. Try a shorter clip or another format.",
									{ v0: label },
								),
							),
						),
					timeoutMs,
				);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
		if (onAbort) signal.removeEventListener("abort", onAbort);
	}
}
