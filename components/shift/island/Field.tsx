"use client";

import { COMMON } from "./copy";
import styles from "./island.module.css";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  max: number;
  error?: string;
  rows: number;
  /** Extra class on the textarea (the send form writes on a line instead of in a box). */
  className?: string;
  onChange: (value: string) => void;
}

/** A labelled textarea with a counter that appears near the cap. */
export function Field({ id, label, hint, placeholder, value, max, error, rows, className, onChange }: FieldProps) {
  const near = value.length >= Math.floor(max * 0.8);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null, near ? `${id}-count` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        className={`ei-input ${styles.input} ${styles.textarea}${className ? ` ${className}` : ""}`}
        placeholder={placeholder}
        value={value}
        maxLength={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {near ? (
        <p id={`${id}-count`} className={styles.counter} data-over={value.length > max ? "true" : undefined}>
          {COMMON.counter(value.length, max)}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
