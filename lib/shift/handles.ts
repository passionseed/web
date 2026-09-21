/** Normalize a social handle from form input: trim, drop one leading "@",
 *  and treat blank input as absent. */
export function cleanHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^@/, "").trim();
  return trimmed === "" ? null : trimmed;
}
