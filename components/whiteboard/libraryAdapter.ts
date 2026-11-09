"use client";

import type { LibraryPersistenceAdapter } from "@excalidraw/excalidraw/data/library";
import type { LibraryItems } from "@excalidraw/excalidraw/types";

/** Where this browser keeps the items people add to their Library (like excalidraw.com does). */
const KEY = "whiteboard-library-v1";
/** Our own cards come from the code each time, so they are never stored or duplicated. */
const isOurs = (item: { id: string }) => item.id.startsWith("passionseed-");

/**
 * Keeps a person's Library (items they add, and libraries they install from
 * libraries.excalidraw.com) in this browser, with our cards always included.
 */
export function boardLibraryAdapter(defaults: () => LibraryItems): LibraryPersistenceAdapter {
  return {
    load() {
      let personal: LibraryItems = [];
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
        if (Array.isArray(saved)) personal = saved.filter((item) => item && typeof item.id === "string" && !isOurs(item));
      } catch {
        // A broken entry only loses the personal items; our cards still load.
      }
      return { libraryItems: [...personal, ...defaults()] };
    },
    save({ libraryItems }) {
      try {
        localStorage.setItem(KEY, JSON.stringify(libraryItems.filter((item) => !isOurs(item))));
      } catch {
        // Storage full or blocked: the Library still works for this visit.
      }
    },
  };
}
