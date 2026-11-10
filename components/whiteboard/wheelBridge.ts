/**
 * Wheel and pinch over things drawn on top of the board, so they move the
 * board instead of the page.
 *
 * Our chips (canvas teams, "+ เพิ่ม", note versions, comment pins) sit outside
 * Excalidraw, so a trackpad pinch over them (a ctrl+wheel) zoomed the whole
 * web page. Excalidraw's own canvas names sit inside it, but it only zooms for
 * wheels on its canvas, so a pinch there did nothing. Both now pass the wheel
 * to the canvas, which zooms or pans around the pointer as usual.
 */

/** Marks an overlay element that should let wheel and pinch reach the board beneath it. */
export const WHEEL_THROUGH = { "data-wheel-through": "" } as const;

/** Overlays that pass the wheel on: ours, and Excalidraw's canvas (frame) names. */
const PASS_THROUGH = '[data-wheel-through], [id*="-frame-name-"]';
const CANVAS = "canvas.excalidraw__canvas.interactive";

/** Starts passing wheel events over the board's overlays to its canvas; returns a function that stops it. */
export function bridgeWheel(root: HTMLElement): () => void {
  const onWheel = (event: WheelEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const canvas = root.querySelector<HTMLCanvasElement>(CANVAS);
    if (!target || !canvas || target === canvas) return;

    if (target.closest(PASS_THROUGH)) {
      event.preventDefault();
      event.stopPropagation();
      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaZ: event.deltaZ,
          deltaMode: event.deltaMode,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        }),
      );
      return;
    }
    // Panels and windows keep their own scrolling, but a pinch over them must not zoom the page.
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  };

  root.addEventListener("wheel", onWheel, { capture: true, passive: false });
  return () => root.removeEventListener("wheel", onWheel, { capture: true });
}
