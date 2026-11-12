import type { LibraryItems } from "@excalidraw/excalidraw/types";

import { boardLibraryAdapter } from "./libraryAdapter";

const item = (id: string) => ({ id, status: "unpublished", elements: [], created: 1 }) as unknown as LibraryItems[number];
const ids = (loaded: { libraryItems: readonly unknown[] } | null) => loaded!.libraryItems.map((i) => (i as { id: string }).id);

describe("board library adapter", () => {
  beforeEach(() => localStorage.clear());

  it("always includes our cards, and keeps what a person adds", async () => {
    const adapter = boardLibraryAdapter(() => [item("passionseed-card-arrive")]);
    expect(ids(await adapter.load({ source: "load" }))).toEqual(["passionseed-card-arrive"]);

    await adapter.save({ libraryItems: [item("robot-1"), item("passionseed-card-arrive")] });
    expect(JSON.parse(localStorage.getItem("whiteboard-library-v1")!).map((i: { id: string }) => i.id)).toEqual(["robot-1"]);
    expect(ids(await adapter.load({ source: "load" }))).toEqual(["robot-1", "passionseed-card-arrive"]);
  });

  it("survives a broken entry", async () => {
    localStorage.setItem("whiteboard-library-v1", "{not json");
    const adapter = boardLibraryAdapter(() => [item("passionseed-card-help")]);
    expect(ids(await adapter.load({ source: "load" }))).toEqual(["passionseed-card-help"]);
  });
});
