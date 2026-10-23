import { translate } from "@/i18n/translate";
import { toast } from "sonner";

export interface MediaUploadToastResult {
	uploadedCount: number;
	assetNames?: string[];
}

function getAssetLabel({ count }: { count: number }): string {
	return count === 1 ? translate("media asset") : translate("media assets");
}

function waitForNextPaint(): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

export async function showMediaUploadToast<T extends MediaUploadToastResult>({
	filesCount,
	promise,
}: {
	filesCount: number;
	promise: Promise<T> | (() => Promise<T>);
}) {
	const run = typeof promise === "function" ? promise : () => promise;
	const toastPromise = toast.promise(
		async () => {
			await waitForNextPaint();
			return run();
		},
		{
			loading: `Uploading ${getAssetLabel({ count: filesCount })}...`,
			success: ({ uploadedCount, assetNames }) => {
				if (uploadedCount === 1) {
					const assetName = assetNames?.[0];
					return assetName
						? translate("{v0} has been uploaded", { v0: assetName })
						: translate("1 media asset has been uploaded");
				}

				if (uploadedCount > 1) {
					return `${uploadedCount} media assets have been uploaded`;
				}

				return "No media assets were uploaded";
			},
			error: `Failed to upload ${getAssetLabel({ count: filesCount })}`,
		},
	);

	return toastPromise.unwrap();
}
