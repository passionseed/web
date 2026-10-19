import { Check } from "lucide-react";

import styles from "./shiftSchool.module.css";

interface SchoolListProps {
  title: string;
  items: readonly string[];
}

/** A titled checklist column, the building block of the data and school sections. */
export function SchoolList({ title, items }: SchoolListProps) {
  return (
    <div>
      <h3 className={`${styles.columnTitle} font-kodchasan`}>{title}</h3>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item}>
            <Check size={16} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
