/**
 * Meta rejects an Instagram message whose text is over 1000 bytes of UTF-8
 * ("Message text must be UTF-8 and be a 1000 bytes or less", Instagram
 * Messaging API docs). A Thai character is 3 bytes, so a DM that reads short
 * can still be too long to send.
 */
export const INSTAGRAM_MESSAGE_MAX_BYTES = 1000;

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
