"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import styles from "./elemental-cinema.module.css";

/**
 * A text link with the page's slow underline. On touch screens, which can't
 * hover, the underline draws once the link is in view.
 */
export function EditorialLink({
  href,
  children,
  className,
  style,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className={`${styles.textLink} ${inView ? styles.textLinkInView : ""} ${className ?? ""}`}
      style={style}
    >
      {children}
    </Link>
  );
}
