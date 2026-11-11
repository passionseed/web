/**
 * Which of the three ring colours (indigo, vermilion, ultramarine) a person wears. It comes from
 * their id, so the same person has the same ring in the people card, the "everyone here" list
 * and in games, whatever order they are listed in.
 */
export function ringOf(userId: string): 0 | 1 | 2 {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (Math.imul(h, 31) + userId.charCodeAt(i)) >>> 0;
  return (h % 3) as 0 | 1 | 2;
}

/** Modifier for `.wb-face` (people card). */
export const FACE_RING = ["", "wb-face--verm", "wb-face--ultra"] as const;
