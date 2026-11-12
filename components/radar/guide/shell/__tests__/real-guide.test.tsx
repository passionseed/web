/**
 * Smoke test: every level of every code guide renders through the shell on
 * the server (the prerendered HTML), with each step in the markup for no-JS
 * readers. Engines and bespoke pieces load on the client, so they are stubbed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { GuideShellProvider } from "../GuideShellProvider";
import { GuidePageView } from "../GuidePageView";
import { buildLevelSteps } from "../level-steps";

jest.mock("server-only", () => ({}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSelectedLayoutSegment: () => null,
}));
jest.mock("@/lib/radar-guide/use-radar-visit", () => ({
  useRadarVisit: () => ({ tracker: { visitId: null, track: jest.fn(), submitCareerRequest: jest.fn() }, attribution: null }),
}));
jest.mock("@/components/radar/guide/games", () => ({
  ENGINE_LOADERS: new Proxy({}, { get: () => () => new Promise(() => {}) }),
}));
jest.mock("@/components/radar/guides/registry", () => ({ loadBespoke: () => new Promise(() => {}) }));
jest.mock("@/lib/radar/record-intent", () => ({ recordFieldIntent: jest.fn() }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { allGuides, loadGuidePage } = require("@/lib/radar-guides/registry.server");
/* eslint-enable @typescript-eslint/no-require-imports */

type Guide = { meta: { slug: string }; pages: { key: string; order: number }[] };
const CASES: [string, string][] = (allGuides() as Guide[]).flatMap((g) =>
  [...g.pages].sort((a, b) => a.order - b.order).map((p) => [g.meta.slug, p.key] as [string, string])
);

test.each(CASES)("%s/%s renders on the server with every step", (slug, key) => {
  const hit = loadGuidePage(slug, key, "preview");
  expect(hit).not.toBeNull();
  const html = renderToStaticMarkup(
    <GuideShellProvider index={hit.index} pageKey={key}>
      <GuidePageView index={hit.index} page={hit.page} clip={hit.clip} facts={hit.facts} />
    </GuideShellProvider>
  );
  expect(html).toContain(`data-page="${key}"`);
  const final = [...hit.index.pages].sort((a: { order: number }, b: { order: number }) => a.order - b.order).at(-1)?.key === key;
  for (const step of buildLevelSteps(hit.page, { final })) {
    if (step.kind === "clip" && !hit.clip) continue;
    expect(html).toContain(`data-testid="step-${step.id}"`);
  }
});
