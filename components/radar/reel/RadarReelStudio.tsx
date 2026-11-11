"use client";

import { useEffect, useState } from "react";

import { isRadarReelPayload, type RadarReelPayload } from "./payload";
import { RadarMotionReel } from "./RadarMotionReel";

declare global {
  interface Window {
    /** Injected by scripts/radar-guide/reel.ts with Playwright's addInitScript. */
    __RADAR_REEL__?: unknown;
  }
}

type State = { status: "loading" } | { status: "missing" } | { status: "mismatch"; got: string } | { status: "ready"; payload: RadarReelPayload };

/**
 * Reads the reel's data from `window.__RADAR_REEL__` only: the studio route
 * never queries Supabase, so it builds and renders with placeholder env.
 */
export function RadarReelStudio({ slug, render, cover }: { slug: string; render: boolean; cover: boolean }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const injected = window.__RADAR_REEL__;
    if (!isRadarReelPayload(injected)) setState({ status: "missing" });
    else if (injected.slug !== slug) setState({ status: "mismatch", got: injected.slug });
    else setState({ status: "ready", payload: injected });
  }, [slug]);

  if (state.status === "ready") return <RadarMotionReel payload={state.payload} render={render} cover={cover} />;
  if (state.status === "loading") return null;
  return (
    <div className="max-w-xl rounded border border-neutral-800 p-6 font-mono text-sm text-neutral-400">
      <p className="text-base text-white">Render only</p>
      {state.status === "missing" ? (
        <p className="mt-2">
          This page shows nothing on its own. Run <code>pnpm radar:reel {slug}</code>, which injects the reel data as{" "}
          <code>window.__RADAR_REEL__</code> and films it.
        </p>
      ) : (
        <p className="mt-2">
          The injected reel is for &quot;{state.got}&quot;, not &quot;{slug}&quot;.
        </p>
      )}
    </div>
  );
}
