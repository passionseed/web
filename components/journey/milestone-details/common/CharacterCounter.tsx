/**
 * CharacterCounter - Shows character count with color coding
 * Green → Yellow → Red as approaching limit
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  show?: boolean;
}

export function CharacterCounter({ current, max, show = true }: CharacterCounterProps) {
  if (!show) return null;

  const percentage = (current / max) * 100;

  const colorClass = cn(
    "text-xs transition-colors",
    percentage < 70 ? "text-green-500" :
    percentage < 90 ? "text-yellow-500" :
    "text-red-500"
  );

  return (
    <span className={colorClass}>
      {current} / {max}
    </span>
  );
}
