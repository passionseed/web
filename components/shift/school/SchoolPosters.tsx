import Image from "next/image";
import { Download } from "lucide-react";

import { SCHOOL_POSTER_IMAGES } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

/**
 * The poster set as real images, for readers who skim: a teacher can save
 * one into a LINE group, a parent can keep the data-and-safety card. The
 * strip scroll-snaps on phones; every image has its own save link.
 */
export function SchoolPosters() {
  return (
    <SchoolSection
      id="posters"
      eyebrow={SCHOOL_POSTER_IMAGES.eyebrow}
      heading={SCHOOL_POSTER_IMAGES.heading}
      aside={SCHOOL_POSTER_IMAGES.aside}
    >
      <ol className={styles.posters}>
        {SCHOOL_POSTER_IMAGES.images.map((image, index) => (
          <li key={image.src} className={styles.poster}>
            <a href={image.src} target="_blank" rel="noopener noreferrer" className={styles.posterLink}>
              <Image
                src={image.src}
                alt={image.alt}
                width={1080}
                height={1350}
                sizes="(min-width: 1100px) 300px, (min-width: 640px) 40vw, 78vw"
                priority={index === 0}
                className={styles.posterImage}
              />
            </a>
            <a href={image.src} download={`shift-school-${index + 1}.png`} className={styles.posterSave}>
              <Download size={16} aria-hidden="true" />
              {SCHOOL_POSTER_IMAGES.save} {index + 1}/{SCHOOL_POSTER_IMAGES.images.length}
            </a>
          </li>
        ))}
      </ol>
    </SchoolSection>
  );
}
