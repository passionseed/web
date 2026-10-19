import { Bot, MessagesSquare, Sparkles, Users, type LucideIcon } from "lucide-react";

import { NOTES } from "@/lib/content/pathlab-page";
import { SCHOOL_LEARNING, type SchoolLearningIcon } from "@/lib/content/shift-school";

import { SchoolSection } from "./SchoolSection";
import styles from "./shiftSchool.module.css";

const ICONS: Record<SchoolLearningIcon, LucideIcon> = {
  ai: Sparkles,
  mentorBot: Bot,
  peers: Users,
  circle: MessagesSquare,
};

/** AI collaboration, AI mentor, near-peer mentors and community, then the one rule over all four. */
export function SchoolLearning() {
  return (
    <SchoolSection
      id="learning"
      eyebrow={SCHOOL_LEARNING.eyebrow}
      heading={SCHOOL_LEARNING.heading}
      aside={SCHOOL_LEARNING.aside}
      note={NOTES.schoolLearning}
      noteTilt="right"
    >
      <ul className={styles.modes}>
        {SCHOOL_LEARNING.modes.map((mode) => {
          const Icon = ICONS[mode.icon];
          return (
            <li key={mode.title} className={styles.mode}>
              <span className={styles.modeIcon} aria-hidden="true">
                <Icon />
              </span>
              <div>
                <h3 className={`${styles.modeTitle} font-kodchasan`}>{mode.title}</h3>
                <p className={styles.modeBody}>{mode.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.callout}>
        <p className={`${styles.calloutTitle} font-kodchasan`}>{SCHOOL_LEARNING.principle.title}</p>
        <p className={styles.calloutBody}>{SCHOOL_LEARNING.principle.body}</p>
      </div>
    </SchoolSection>
  );
}
