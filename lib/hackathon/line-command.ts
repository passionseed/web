export function parseMentorBookingCommand(
  text: string
): "confirmed" | "cancelled" | null {
  const normalized = text.trim().toLowerCase();

  if (normalized === "confirm") return "confirmed";
  if (normalized === "decline") return "cancelled";
  return null;
}
