"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

import type { IslandCanvasProps } from "./IslandCanvas";

/** The canvas code loads only in the browser, after the picture's first paint. */
const IslandCanvas = dynamic(() => import("./IslandCanvas"), { ssr: false });

interface BoundaryProps {
  onFail?: () => void;
  children: ReactNode;
}

/** A failed chunk load or render keeps the PNG instead of breaking the page. */
class LiveBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onFail?.();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** The living island over the picture: IslandCanvas, client-only, behind an error boundary. */
export function IslandLive(props: IslandCanvasProps) {
  return (
    <LiveBoundary onFail={props.onFail}>
      <IslandCanvas {...props} />
    </LiveBoundary>
  );
}
