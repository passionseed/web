/**
 * Excalidraw's fractional index, vendored so the bot can order new notes on a
 * board without Excalidraw (ESM-only, browser-bound) or a new dependency.
 *
 * This is the base-62 `generateKeyBetween` of the `fractional-indexing`
 * package (David Greenspan's algorithm, CC0), which Excalidraw 0.18 uses for
 * every element's `index`. Keys compare as plain strings (JS `<`, Postgres
 * `COLLATE "C"`), so a key made here sorts the same in the browser and in
 * whiteboard_merge_elements. scripts/elemental/excalidraw-roundtrip.ts checks
 * it against the real package.
 */

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ZERO = DIGITS[0];
const SMALLEST_INTEGER = "A" + ZERO.repeat(26);

function midpoint(a: string, b: string | null): string {
  if (b !== null && a >= b) throw new Error(`fractional index: ${a} >= ${b}`);
  if (a.slice(-1) === ZERO || (b && b.slice(-1) === ZERO)) throw new Error("fractional index: trailing zero");
  if (b) {
    let n = 0;
    while ((a[n] || ZERO) === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (digitB - digitA > 1) return DIGITS[Math.round(0.5 * (digitA + digitB))];
  if (b && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

function integerLength(head: string): number {
  if (head >= "a" && head <= "z") return head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  if (head >= "A" && head <= "Z") return "Z".charCodeAt(0) - head.charCodeAt(0) + 2;
  throw new Error(`fractional index: invalid head ${head}`);
}

function integerPart(key: string): string {
  const length = integerLength(key[0]);
  if (length > key.length) throw new Error(`fractional index: invalid key ${key}`);
  return key.slice(0, length);
}

function validateKey(key: string): void {
  if (key === SMALLEST_INTEGER) throw new Error(`fractional index: invalid key ${key}`);
  const int = integerPart(key);
  for (const ch of key) if (!DIGITS.includes(ch)) throw new Error(`fractional index: invalid key ${key}`);
  if (key.slice(int.length).slice(-1) === ZERO) throw new Error(`fractional index: invalid key ${key}`);
}

function incrementInteger(x: string): string | null {
  const [head, ...digs] = x.split("");
  let carry = true;
  for (let i = digs.length - 1; carry && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]) + 1;
    if (d === DIGITS.length) digs[i] = ZERO;
    else {
      digs[i] = DIGITS[d];
      carry = false;
    }
  }
  if (!carry) return head + digs.join("");
  if (head === "Z") return "a" + ZERO;
  if (head === "z") return null;
  const next = String.fromCharCode(head.charCodeAt(0) + 1);
  if (next > "a") digs.push(ZERO);
  else digs.pop();
  return next + digs.join("");
}

function decrementInteger(x: string): string | null {
  const [head, ...digs] = x.split("");
  let borrow = true;
  for (let i = digs.length - 1; borrow && i >= 0; i--) {
    const d = DIGITS.indexOf(digs[i]) - 1;
    if (d === -1) digs[i] = DIGITS.slice(-1);
    else {
      digs[i] = DIGITS[d];
      borrow = false;
    }
  }
  if (!borrow) return head + digs.join("");
  if (head === "a") return "Z" + DIGITS.slice(-1);
  if (head === "A") return null;
  const next = String.fromCharCode(head.charCodeAt(0) - 1);
  if (next < "Z") digs.push(DIGITS.slice(-1));
  else digs.pop();
  return next + digs.join("");
}

/** Whether `key` is a fractional index Excalidraw could have made. */
export function isValidIndex(key: unknown): key is string {
  if (typeof key !== "string" || key === "") return false;
  try {
    validateKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * A key strictly between `a` and `b` (null means the start or the end). With
 * `b` null it is the next key after `a`, so appending to a board is
 * `keyBetween(lastIndex, null)`. Throws on an invalid key or when a >= b.
 */
export function keyBetween(a: string | null, b: string | null): string {
  if (a !== null) validateKey(a);
  if (b !== null) validateKey(b);
  if (a !== null && b !== null && a >= b) throw new Error(`fractional index: ${a} >= ${b}`);
  if (a === null) {
    if (b === null) return "a" + ZERO;
    const ib = integerPart(b);
    const fb = b.slice(ib.length);
    if (ib === SMALLEST_INTEGER) return ib + midpoint("", fb);
    if (ib < b) return ib;
    const res = decrementInteger(ib);
    if (res === null) throw new Error("fractional index: cannot decrement any more");
    return res;
  }
  const ia = integerPart(a);
  const fa = a.slice(ia.length);
  if (b === null) {
    const next = incrementInteger(ia);
    return next === null ? ia + midpoint(fa, null) : next;
  }
  const ib = integerPart(b);
  const fb = b.slice(ib.length);
  if (ia === ib) return ia + midpoint(fa, fb);
  const next = incrementInteger(ia);
  if (next === null) throw new Error("fractional index: cannot increment any more");
  if (next < b) return next;
  return ia + midpoint(fa, null);
}

/**
 * The highest index on a board, as whiteboard_merge_elements orders them
 * (byte order), or null for an empty board. Elements without a valid index
 * are skipped: Excalidraw gives them one on load.
 */
export function lastIndex(elements: readonly { index?: unknown }[]): string | null {
  let last: string | null = null;
  for (const el of elements) {
    if (isValidIndex(el.index) && (last === null || el.index > last)) last = el.index;
  }
  return last;
}
