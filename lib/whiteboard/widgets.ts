/**
 * Board widgets: apps placed on the canvas itself (Excalidraw embeddable
 * elements whose link names the widget), so they move and zoom with the
 * board like FigJam widgets. The link is never loaded; WhiteboardCanvas
 * renders our own component for it.
 */

const WIDGET_BASE = "https://www.passionseed.org/whiteboard/widget/";
const WIDGET_LINK = /^https:\/\/www\.passionseed\.org\/whiteboard\/widget\/([a-z][a-z0-9-]{0,40})$/;

export const widgetLink = (id: string) => `${WIDGET_BASE}${id}`;

/** The widget id an embeddable's link points to, or null for a normal embed. */
export function widgetIdOf(link: string | null | undefined): string | null {
  return link?.match(WIDGET_LINK)?.[1] ?? null;
}
