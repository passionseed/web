"use client";

import { gridPngUrl } from "./gridPng";

/**
 * Phone save button. Mobile browsers (and LINE/IG in-app browsers) ignore
 * <a download>, so: share the file when the browser can (iOS share sheet
 * offers "Save Image"), otherwise open the full image in this tab, where a
 * long press saves it to Photos. The share sheet needs HTTPS.
 *
 * Support is checked before any await: a popup or navigation started after
 * an await has lost the tap's user activation and gets blocked.
 */
function canShareImages(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  return navigator.canShare({ files: [new File([""], "probe.png", { type: "image/png" })] });
}

export function SaveImage({ id }: { id: string }) {
  const save = async () => {
    const url = gridPngUrl(id);
    if (!canShareImages()) {
      window.location.assign(url);
      return;
    }
    try {
      const blob = await (await fetch(url)).blob();
      await navigator.share({ files: [new File([blob], `${id}.png`, { type: "image/png" })] });
    } catch (error) {
      // AbortError means the user closed the share sheet: nothing to do.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Share failed, opening the image instead:", error);
      window.location.assign(url);
    }
  };
  return (
    <button
      type="button"
      onClick={save}
      className="w-full rounded-md bg-neutral-800 py-2 text-sm text-neutral-100 active:bg-neutral-700"
    >
      บันทึกรูป
    </button>
  );
}
