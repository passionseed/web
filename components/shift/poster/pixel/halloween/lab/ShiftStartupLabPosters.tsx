import type { ReactElement } from "react";

import { CustomerPoster } from "./posters/CustomerPoster";
import { DemoDayPoster } from "./posters/DemoDayPoster";
import { FounderPoster } from "./posters/FounderPoster";
import { LabPoster } from "./posters/LabPoster";
import { ParentPoster } from "./posters/ParentPoster";

/**
 * SHIFT[3] pitched as a small startup lab, in the Halloween pixel style:
 * five 1080x1350 posters, one point of view each (the founder, the
 * customer, the Demo Day audience, the parent, the lab). Every poster ends
 * in the same offer window and asks for a "SHIFT" comment, no QR.
 * Process lines follow the SHIFT[3] run plan: interviews on night 1, a
 * prototype real people try, a Demo Day pitch with a link and who tested it.
 */

const id = (n: number) => `shift3-lab-${String(n).padStart(2, "0")}`;

const POSTERS: { key: string; Poster: (props: { id: string }) => ReactElement }[] = [
  { key: "founder", Poster: FounderPoster },
  { key: "customer", Poster: CustomerPoster },
  { key: "demo-day", Poster: DemoDayPoster },
  { key: "parent", Poster: ParentPoster },
  { key: "lab", Poster: LabPoster },
];

export const SHIFT3_LAB_IDS = POSTERS.map((_, i) => id(i + 1));
export const SHIFT3_LAB_KEYS = POSTERS.map((p) => p.key);
export const SHIFT3_LAB_POSTERS = POSTERS.map(({ key, Poster }, i) => <Poster key={key} id={id(i + 1)} />);
