import { Body, H2, v } from "./ui";

/** The fine print on the share and teacher pages, collapsed: the rule, the wifi cap, the refresh note. */
export function Rules({ rules, heading = "กติกา" }: { rules: readonly string[]; heading?: string }) {
  return (
    <details className="group mt-12 border-y" style={{ borderColor: v.rule }}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <H2>{heading}</H2>
        <span aria-hidden="true" className="text-2xl transition-transform motion-reduce:transition-none group-open:rotate-45" style={{ color: v.secondary }}>
          +
        </span>
      </summary>
      <ul className="space-y-2 pb-6">
        {rules.map((r) => (
          <li key={r} className="flex gap-2.5">
            <span aria-hidden="true" style={{ color: v.fine }}>
              ·
            </span>
            <Body secondary as="span">
              {r}
            </Body>
          </li>
        ))}
      </ul>
    </details>
  );
}
