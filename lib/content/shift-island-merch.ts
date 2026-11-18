/**
 * Artwork only. Prices, stock, eligibility and redemption remain in the
 * database catalog. Exact catalog names associate a live item with its art;
 * an unconfigured design can be browsed, but never redeemed.
 */
export const ISLAND_MERCH = [
  {
    key: "tee",
    catalogName: "PassionSeed Dust Tee",
    image: "/shift/island/merch/passionseed-dust-tee.png",
  },
  {
    key: "hoodie",
    catalogName: "PassionSeed Dust Hoodie",
    image: "/shift/island/merch/passionseed-dust-hoodie.png",
  },
  {
    key: "stickers",
    catalogName: "PassionSeed Builder Sticker Sheet",
    image: "/shift/island/merch/passionseed-sticker-sheet.png",
  },
  {
    key: "cap",
    catalogName: "PassionSeed Cap",
    image: "/shift/island/merch/passionseed-cap.png",
  },
  {
    key: "deskMat",
    catalogName: "PassionSeed Island Desk Mat",
    image: "/shift/island/merch/passionseed-desk-mat.png",
  },
] as const;

export function merchArtwork(name: string) {
  return ISLAND_MERCH.find((product) => product.catalogName.toLowerCase() === name.trim().toLowerCase());
}
