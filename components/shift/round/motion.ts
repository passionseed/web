/**
 * Class helpers for the round page motion in shiftRound.css. Neighbours get
 * staggered reveal ranges and different drift periods so a row never moves
 * in lockstep.
 */

const REVEAL = ["shift-reveal", "shift-reveal shift-reveal-2", "shift-reveal shift-reveal-3"];
const FLOAT = ["shift-float", "shift-float shift-float-b", "shift-float shift-float-c"];

export function revealClass(index = 0): string {
  return REVEAL[index % REVEAL.length];
}

export function floatClass(index = 0): string {
  return FLOAT[index % FLOAT.length];
}
