"use client";

import { useState } from "react";

import type { ViewerCard } from "@/lib/supabase/shift-quests/types";

import { ISLAND } from "./copy";
import styles from "./island.module.css";

/** The signed-in student's Discord picture, or the first letter of their name. */
export function Avatar({ me }: { me: ViewerCard }) {
  const [broken, setBroken] = useState(false);
  const initial = initialOf(me.name);
  if (!me.avatarUrl || broken) {
    return (
      <span className={styles.avatar} role="img" aria-label={ISLAND.avatar(me.name)}>
        {initial}
      </span>
    );
  }
  return (
    // Discord's CDN avatar, already small; next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={me.avatarUrl}
      alt={ISLAND.avatar(me.name)}
      width={32}
      height={32}
      className={styles.avatar}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

/** Thai vowels written before their consonant (เ แ โ ใ ไ): never a name's initial on their own. */
const LEADING_VOWEL = /^[เ-ไ]$/;

/**
 * The first letter of a name as one whole grapheme (a Thai consonant with its
 * marks), skipping a leading Thai vowel: "เมย์" gives "ม", not "เ".
 */
export function initialOf(name: string): string {
  const text = name.trim();
  if (!text) return "?";
  const graphemes =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (s) => s.segment)
      : Array.from(text);
  const first = graphemes.find((g) => !LEADING_VOWEL.test(g) && g.trim());
  return first ?? graphemes[0] ?? "?";
}
