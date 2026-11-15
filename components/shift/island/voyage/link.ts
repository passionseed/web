/**
 * The crossing's address, shared by the server page (which reads `?at=`), the
 * game (which drops it once crossed) and the invite's ticket (which links to
 * it). Plain module, no "use client": the server page imports it.
 */

/** `/shift/island?at=voyage` plays the crossing even on a browser that has crossed before. */
export const VOYAGE_PARAM = "voyage";

/** Where the ticket's "ขึ้นเรือไปเกาะ" goes: the same page, which then shows the island or the ticket's door. */
export const VOYAGE_HREF = `/shift/island?at=${VOYAGE_PARAM}`;
