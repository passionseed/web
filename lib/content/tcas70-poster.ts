/**
 * Shared shape for the TCAS70 Round 1 infographic posters
 * (app/shift/poster/tcas-*). Each field (Computer Engineering, Business,
 * Computer Science) supplies one TcasPosterData; the pixel components in
 * components/shift/poster/pixel/tcas render any of them the same way.
 */

export interface TcasProject {
  name: string;
  seats: string;
  gpax: string;
  /** What you must already have before you can apply. */
  requirement: string;
  /** True when an award, olympiad camp or similar is a gate to apply. */
  gated: boolean;
  portfolio: string;
  scoring: string;
  apply: string;
  applyClosed?: boolean;
  /** Set when this project's facts come from an earlier cycle. */
  refCycle?: string;
}

export interface TcasUniversity {
  key: string;
  nameTh: string;
  nameEn: string;
  /** Set when the whole university's facts come from an earlier cycle. */
  refCycle?: string;
  source: string;
  projects: TcasProject[];
}

/** Pixel icon names the takeaway cards can use. */
export type TcasIcon = "trophy" | "rocket" | "portfolio" | "screen" | "crew" | "question" | "sprout" | "chart" | "spark" | "signpost";

export interface TcasTakeaway {
  en: string;
  title: string;
  body: string;
  icon: TcasIcon;
}

export interface TcasDate {
  date: string;
  label: string;
  done?: boolean;
}

export interface TcasPosterData {
  /** Short id: element ids (#tcas-<key>-cover) and the QR code's utm tag. */
  key: string;
  /** Pixel-font field name, e.g. "COMPUTER ENGINEERING". */
  fieldEn: string;
  /** Cover title, two lines. */
  coverTitle: [string, string];
  /** Heading on each table sheet. */
  tableTitle: string;
  /** Which programs are covered, e.g. "หลักสูตรภาษาไทย วิทยาเขตหลัก". */
  scope: string;
  /** What was left out on purpose. */
  skipped: string;
  /** What an orange (gated) requirement cell means for this field. */
  gateLegend: string;
  /** Coverage notes shown on the cover, e.g. universities left out. */
  notes?: string[];
  asOf: string;
  universities: TcasUniversity[];
  /** University keys per table sheet, in order. */
  sheets: string[][];
  takeaways: TcasTakeaway[];
  dates: TcasDate[];
  sources: string[];
  /** What admitted students actually had, where published. Shown on the sources sheet. */
  reality?: TcasReality[];
  /** Which projects have no published outcome data. */
  realityGap?: string;
  /** Exact documents each university's rows came from. Shown on the sources sheet. */
  sourceLinks?: TcasSourceLink[];
}

/** A published outcome for one project: the minimum next to what admitted students had. */
export type TcasReality = {
  uni: string;
  project: string;
  min: string;
  actual: string;
  note?: string;
  source: string;
};

export type TcasSourceLink = { uni: string; links: string[] };

/** Table columns after the university label, in reading order. */
export const TCAS_COLUMNS: { key: "project" | keyof TcasProject; th: string; en: string; fr: number }[] = [
  { key: "project", th: "โครงการ", en: "PROJECT", fr: 1.3 },
  { key: "gpax", th: "GPAX", en: "MIN", fr: 0.95 },
  { key: "requirement", th: "ต้องมีก่อนสมัคร", en: "GATE", fr: 1.9 },
  { key: "portfolio", th: "พอร์ต", en: "FOLIO", fr: 1.2 },
  { key: "scoring", th: "คิดคะแนน", en: "SCORE", fr: 1.15 },
  { key: "apply", th: "รับสมัคร", en: "APPLY", fr: 0.95 },
];

export const countProjects = (d: TcasPosterData) => d.universities.reduce((n, u) => n + u.projects.length, 0);
