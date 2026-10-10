/**
 * Where scripts/export-shift2-grid.mjs writes the SHIFT[2] grid PNGs. Kept out
 * of the "use client" download module so server components get the string,
 * not a client reference.
 */
export const GRID_PNG_DIR = "/shift/posters/shift2-grid";

export const gridPngUrl = (id: string) => `${GRID_PNG_DIR}/${id}.png`;
