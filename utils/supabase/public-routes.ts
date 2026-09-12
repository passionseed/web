const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/auth",
  "/download",
  "/hackathon",
  "/hackathon-old",
  "/api/hackathon",
  "/app/beta",
  "/expert-interview",
  "/api/expert-interview",
  "/epic-sprint",
  "/about",
  // App Store / legal pages must be reachable without sign-in (Guideline 1.5)
  "/support",
  "/contact",
  "/privacy",
  "/terms",
  "/tos",
  "/cookies",
  "/link",
  "/experimental-graphic",
  "/experimental-wall",
  "/business-model-canvas",
  "/radar",
  "/plan",
  "/qr",
  "/pay",
  "/api/trials",
  "/faculty-radar",
  "/api/cron/parent-pathlab-updates",
  "/fireball",
  "/techseed",
  "/api/techseed",
  "/projectseed",
  "/talent",
  "/map",
  "/pathlab",
  "/shift",
  "/slide",
  "/worksheet",
  "/tips",
] as const;

export function isPublicRoute(pathname: string): boolean {
  // Query strings are not part of the route (e.g. "/plan?entry=...").
  const path = pathname.split("?")[0];
  return (
    path === "/" ||
    path.endsWith(".md") ||
    PUBLIC_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(prefix + "/")
    )
  );
}
