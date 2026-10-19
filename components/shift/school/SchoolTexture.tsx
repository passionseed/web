import { Grain, Speckle } from "@/components/shift/poster/riso";

/**
 * Riso grain printed on the paper, under the ink. The shared
 * RisoPageTexture is fixed above the content, which lays grain over the
 * text; a long proposal page needs the type clean, so here the grain sits
 * on the ground layer and every word prints on top of it.
 */
export function SchoolTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Grain opacity={0.2} />
      <Speckle opacity={0.04} />
    </div>
  );
}
