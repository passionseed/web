"use client";

import { FACE_RING, ringOf } from "./ring";

type Person = { userId: string; name: string; avatarUrl: string | null };

/** A face with a thin ring: indigo, vermilion or ultramarine, always the same one for a person. */
export function Face({ person, size = 28 }: { person: Person; size?: number }) {
  return (
    <span className={`wb-face ${FACE_RING[ringOf(person.userId)]}`} style={{ width: size, height: size }}>
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="wb-face__initial">{person.name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
