/**
 * "Where did you find the post?" on the Elemental sign-up. The first answer
 * the person picks is stored as the value; the label is what they read.
 * Separate from `source`, which comes from tracked links (?src=).
 */
export const HEARD_FROM = [
  { value: "passion_seed", label: "Passion Seed" },
  { value: "next_decade", label: "The Next Decade" },
  { value: "doodee_future", label: "DooDee Future" },
  { value: "contester", label: "Contester" },
  { value: "camp_hub", label: "Camp Hub" },
  { value: "other", label: "อื่นๆ" },
] as const;

export type HeardFrom = (typeof HEARD_FROM)[number]["value"];

export const HEARD_FROM_VALUES = HEARD_FROM.map((o) => o.value) as [HeardFrom, ...HeardFrom[]];

export const heardFromLabel = (value: string | null | undefined): string =>
  HEARD_FROM.find((o) => o.value === value)?.label ?? "";
