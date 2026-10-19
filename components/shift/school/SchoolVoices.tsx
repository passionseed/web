import { ShieldCheck } from "lucide-react";

import { TestimonialQuote } from "@/components/shift/TestimonialQuote";
import { SCHOOL_VOICES } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/** Real quotes only, pulled by reference from shift-testimonials / shift-voices. */
export function SchoolVoices() {
  return (
    <SchoolSection id="voices" eyebrow={SCHOOL_VOICES.eyebrow} heading={SCHOOL_VOICES.heading}>
      <p className={styles.source}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{SCHOOL_VOICES.source}</span>
      </p>
      <div className={styles.voices}>
        {SCHOOL_VOICES.cards.map((card) => (
          <figure key={card.quote} className={styles.voice}>
            <TestimonialQuote card={card} />
            <figcaption>
              {card.name}
              <span className={styles.voiceMeta}>{card.meta}</span>
              {card.project && (
                <a href={card.project.url} target="_blank" rel="noopener noreferrer">
                  {card.project.title}
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </SchoolSection>
  );
}
