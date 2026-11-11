"use client";

/**
 * Shared pieces of the game and bespoke islands: load-when-near, an error
 * boundary that falls back to the static answers, and the loading tile.
 */
import { Component, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

/**
 * True once the element is within ~1.5 screens, or on idle, whichever first.
 * Islands start loading after the scene and dialogue have painted.
 */
export function useLoadWhenNear<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (load) return;
    const el = ref.current;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setLoad(true);
    };
    let observer: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) go();
        },
        { rootMargin: "150% 0px" }
      );
      observer.observe(el);
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 2500 }) : null;
    const timer = idle === null ? window.setTimeout(go, 1200) : null;
    return () => {
      done = true;
      observer?.disconnect();
      if (idle !== null) w.cancelIdleCallback?.(idle);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [load]);
  return [ref, load];
}

export class IslandBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // A chunk that fails to load on a flaky in-app connection: the static answers stand in.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function IslandLoading() {
  return (
    <div className="rg-island__loading" role="status">
      <span className="rg-island__dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      กำลังโหลดมินิเกม
    </div>
  );
}

/** The answers as plain lines: the no-JS view and the "ข้ามเกม ดูเฉลย" view. */
export function AnswerList({ lines, title = "เฉลย" }: { lines: readonly string[]; title?: string }) {
  if (!lines.length) return null;
  return (
    <div className="rg-answers">
      <p className="rg-answers__title">{title}</p>
      <ul className="rg-answers__list">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
