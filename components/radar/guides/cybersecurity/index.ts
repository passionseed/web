/**
 * Bespoke pieces of the cybersecurity guide, keyed by the `component` id that
 * page blocks name (lib/radar-guides/cybersecurity/pages/*). guides.test.ts
 * checks every id a page uses is listed here. This whole module is one lazy
 * chunk (components/radar/guides/registry.ts).
 */
import type { ComponentType } from "react";
import type { BespokeProps } from "@/lib/radar-guide/guide-types";
import BirthYearTimeline from "./BirthYearTimeline";
import BucketPipe from "./BucketPipe";

export const BESPOKE: Readonly<Record<string, ComponentType<BespokeProps>>> = {
  BirthYearTimeline: BirthYearTimeline as ComponentType<BespokeProps>,
  BucketPipe: BucketPipe as ComponentType<BespokeProps>,
};
