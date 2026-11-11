/**
 * Small text helpers shared by the game engines (U2). Pure, no DOM.
 * Engine chrome copy lives in the engine files; content copy comes from the
 * guide data as props.
 */

export type TemplateVars = Readonly<Record<string, string | number | undefined | null>>;

const PLACEHOLDER = /\{([A-Za-z0-9_:.\-]+)\}/g;

/**
 * Fills `{name}` placeholders. Missing or empty values become "" so a student
 * never sees raw braces; names may contain ":" (`{c:triage:x}`).
 */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Names used in a template, in order (used by tests and the recap). */
export function templateNames(template: string): string[] {
  return Array.from(template.matchAll(PLACEHOLDER), (m) => m[1]);
}

/** Arabic digits with comma grouping ("35,500"), never Thai digits. Deterministic in every locale. */
export function formatNumber(n: number): string {
  const sign = n < 0 ? "-" : "";
  const [int, frac] = Math.abs(n).toString().split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

export interface HighlightPart {
  text: string;
  hit: boolean;
}

/** Splits `text` around every occurrence of `highlight` (used by FlipCards and chat flags). */
export function splitHighlight(text: string, highlight: string): HighlightPart[] {
  if (!highlight) return [{ text, hit: false }];
  const parts: HighlightPart[] = [];
  let rest = text;
  for (;;) {
    const i = rest.indexOf(highlight);
    if (i < 0) break;
    if (i > 0) parts.push({ text: rest.slice(0, i), hit: false });
    parts.push({ text: highlight, hit: true });
    rest = rest.slice(i + highlight.length);
  }
  if (rest) parts.push({ text: rest, hit: false });
  return parts;
}
