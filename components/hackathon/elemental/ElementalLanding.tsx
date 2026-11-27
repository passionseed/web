import { ElementalExperience } from "./ElementalExperience";
import { trirong } from "./fonts";

/**
 * /hackathon: The Next Decade, Elemental.
 * Cinematic landing experience built on the Elemental media reel, looping key
 * visual scene, and five corrupted-place films. All dates, prices, prizes, and
 * schedule rows come strictly from ../poster/elemental/facts.ts.
 */
export function ElementalLanding({ joinHref, open, shareLive = false }: { joinHref: string; open: boolean; shareLive?: boolean }) {
  return <ElementalExperience joinHref={joinHref} open={open} fontClassName={trirong.variable} shareLive={shareLive} />;
}
