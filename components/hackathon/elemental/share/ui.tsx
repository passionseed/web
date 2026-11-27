import Image from "next/image";
import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, Ref } from "react";

import { EL, EL_FONT, EL_GROUND, EL_PAPER, type SurfaceTokens } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { GlyphLetter, PixelEdge, PixelIcon, TITLE_GLYPHS, type PixelIconName } from "@/components/hackathon/poster/elemental/pixel-art";

import cinema from "../elemental-cinema.module.css";
import { ElementalTopBar } from "../ElementalTopBar";
import { trirong } from "../fonts";
import { KEY_VISUAL_MEDIA } from "../media";
import shell from "./shell.module.css";

/**
 * The Elemental share pages' design system (merged direction, 2026-11-27:
 * scratchpad design-direction.md). Two surfaces: "ground" (the landing's dark
 * world: share, teacher, team editor, board) and "paper" (the cream pay page).
 * Every primitive reads its colours from the surface's CSS variables, so the
 * same component works on either, and inside a DarkSlab on the cream page.
 * Use them inside <Page surface> or <DarkSlab>; outside both they have no colours.
 *
 * Shell
 * - Page({ surface, back, topBarRight, sky, bar, footer, wordmark, wide }): the page root. ground =
 *   cinemaRoot + film grain + dark ElementalTopBar; paper = cream + ink top bar. Without surface it
 *   is the old cream page (until each screen moves over).
 * - SkyBand({ title, lead, facts, image, height }): the photo of the calm sky with the ink title, fading
 *   into the ground; facts sit on the fade line as a FactStrip. Ground only, passed as Page's sky.
 * - FactStrip({ facts: { tag, value, note?, icon? }[], onSky }): the hero's hairline fact grid.
 * - StickyBar({ children }): the one primary action, pinned to the bottom, clear of the home bar.
 *   Pass it as Page's bar so the page leaves room for it.
 * - FooterWordmark(): the pixel "Elemental →" back to /hackathon/elemental (Page adds it).
 * - DarkSlab({ edge, children }): a piece of the dark ground on the cream page (the share slab).
 *
 * Type (390px scale; colours inherit from the surface)
 * - H1 (Trirong 200, 40/1.15; board: 48/1.1), H2 (Trirong 300, 26/1.25),
 * - MeterTitle (Trirong 300 24/1.3, digits 400): the meter's "what's left" line,
 * - ItemTitle (Bai Jamjuree 600, 18/28), Body (16/26; secondary: 14/22), Fine (13/20),
 * - Tag (Space Mono 13/20, "[x]"): data labels and stamps only, never above a heading,
 * - BigCount({ value, goal, unit }): Trirong 300 44 with "/50" at 20, on one baseline.
 *
 * Controls (≥52px, square corners, Bai Jamjuree 600 16/24)
 * - PrimaryButton / SecondaryButton({ href | onClick, icon, full }): one primary per screen.
 * - EditorialLink({ href | onClick, size, tone, arrow }): the landing's Trirong italic "… →" link, 44px tall.
 * - TextInput({ id, label, hint, error, leading }): 52px field, 2px focus rule.
 * - PixelIcon({ name, size }): 9×9 pixel icons (ICON from the poster + UI_ICON), instead of lucide.
 *
 * The older exports below (btn, filled, outline, Title, Lead, TextLink …) are the cream style the
 * current screens still use; they go once every screen has moved over.
 */

// ---------- Surfaces ----------

export type Surface = "ground" | "paper";

const TOKENS: Record<Surface, SurfaceTokens> = { ground: EL_GROUND, paper: EL_PAPER };

/** The surface's colours as CSS variables, for a root element. */
export function surfaceVars(surface: Surface): CSSProperties {
  const t = TOKENS[surface];
  return {
    "--el-bg": t.bg,
    "--el-text": t.text,
    "--el-number": t.number,
    "--el-secondary": t.secondary,
    "--el-fine": t.fine,
    "--el-rule": t.rule,
    "--el-rule-soft": t.ruleSoft,
    "--el-cell": t.cell,
    "--el-outline": t.outline,
    "--el-input": t.inputFill,
    "--el-input-border": t.inputBorder,
    "--el-action": t.action,
    "--el-action-ink": t.actionInk,
    "--el-action-pressed": t.actionPressed,
    "--el-focus": t.focus,
    "--el-error": t.error,
    "--el-bar": t.bar,
  } as CSSProperties;
}

/** The variables as values, for inline styles: `color: v.secondary`. */
export const v = {
  text: "var(--el-text)",
  number: "var(--el-number)",
  secondary: "var(--el-secondary)",
  fine: "var(--el-fine)",
  rule: "var(--el-rule)",
  ruleSoft: "var(--el-rule-soft)",
  cell: "var(--el-cell)",
  action: "var(--el-action)",
  error: "var(--el-error)",
} as const;

// ---------- Type ----------

const display = (weight: 200 | 300 | 400, size: number, lineHeight: number | string): CSSProperties => ({
  fontFamily: EL_FONT.display,
  fontWeight: weight,
  fontSize: size,
  lineHeight,
});

export function H1({ children, board = false, id, className }: { children: ReactNode; board?: boolean; id?: string; className?: string }) {
  return (
    <h1 id={id} className={`text-balance ${className ?? ""}`} style={display(200, board ? 48 : 40, board ? 1.1 : 1.15)}>
      {children}
    </h1>
  );
}

export function H2({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={`text-balance ${className ?? ""}`} style={display(300, 26, 1.25)}>
      {children}
    </h2>
  );
}

/** Digits in a run of Trirong 300 text go up to 400, so numbers lead the line. */
function weightDigits(children: ReactNode): ReactNode {
  if (typeof children !== "string") return children;
  return children.split(/(\d[\d,]*)/).map((part, i) => (i % 2 ? <span key={i} style={{ fontWeight: 400 }}>{part}</span> : part));
}

/** The meter's headline: what's left ("อีก 38 เครื่อง ได้ที่นั่งฟรี"). */
export function MeterTitle({ children, as: El = "p", className }: { children: ReactNode; as?: "p" | "h2" | "h3"; className?: string }) {
  return (
    <El className={`text-balance ${className ?? ""}`} style={display(300, 24, 1.3)}>
      {weightDigits(children)}
    </El>
  );
}

export function ItemTitle({ children, as: El = "h3", className }: { children: ReactNode; as?: "h2" | "h3" | "h4" | "p"; className?: string }) {
  return (
    <El className={className} style={{ fontFamily: EL_FONT.body, fontWeight: 600, fontSize: 18, lineHeight: "28px" }}>
      {children}
    </El>
  );
}

export function Body({
  children,
  secondary = false,
  as: El = "p",
  className,
}: {
  children: ReactNode;
  /** 14/22 in the secondary colour. */
  secondary?: boolean;
  as?: "p" | "span" | "div";
  className?: string;
}) {
  return (
    <El
      className={`text-pretty ${className ?? ""}`}
      style={{ fontFamily: EL_FONT.body, fontWeight: 400, fontSize: secondary ? 14 : 16, lineHeight: secondary ? "22px" : "26px", color: secondary ? v.secondary : undefined }}
    >
      {children}
    </El>
  );
}

/** The smallest text: 13/20, nothing smaller for Thai. */
export function Fine({ children, as: El = "p", id, className }: { children: ReactNode; as?: "p" | "span"; id?: string; className?: string }) {
  return (
    <El id={id} className={`text-pretty ${className ?? ""}`} style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: v.fine }}>
      {children}
    </El>
  );
}

/** A Space Mono data label or stamp: "[เครื่อง]", "No. 1A2B 3C4D". Never above a heading. */
export function Tag({
  children,
  bracket = true,
  tone = "secondary",
  className,
}: {
  children: ReactNode;
  bracket?: boolean;
  tone?: "secondary" | "text" | "action";
  className?: string;
}) {
  return (
    <span
      className={`whitespace-nowrap ${className ?? ""}`}
      style={{ fontFamily: EL_FONT.mono, fontSize: 13, lineHeight: "20px", color: tone === "action" ? v.action : tone === "text" ? v.text : v.secondary }}
    >
      {bracket ? <>[{children}]</> : children}
    </span>
  );
}

/** "12/50": the count in Trirong 300 44 with the goal at 20, on one baseline. Without a goal, "64 เครื่อง". */
export function BigCount({ value, goal, unit, className }: { value: number; goal?: number; unit?: string; className?: string }) {
  const small = { ...display(300, 20, 1), color: v.secondary };
  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap tabular-nums ${className ?? ""}`}
      aria-label={goal != null ? `${value} จาก ${goal}${unit ? ` ${unit}` : ""}` : `${value}${unit ? ` ${unit}` : ""}`}
    >
      <span aria-hidden="true" style={{ ...display(300, 44, 1), color: v.number }}>
        {value}
      </span>
      {goal != null && (
        <span aria-hidden="true" style={small}>
          /{goal}
        </span>
      )}
      {unit && (
        <span aria-hidden="true" className="ml-1.5" style={small}>
          {unit}
        </span>
      )}
    </span>
  );
}

// ---------- Controls ----------

type ControlBase = {
  children: ReactNode;
  /** One 9×9 pixel icon before the label. */
  icon?: PixelIconName;
  /** Full width (the sticky bar). */
  full?: boolean;
  className?: string;
};
type LinkControl = ControlBase & {
  href: string;
  /** Opens in a new tab (LINE share links). */
  external?: boolean;
  /** Saves the file instead of opening it (the poster). */
  download?: string | true;
  onClick?: () => void;
};
type ButtonControl = ControlBase & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };
export type ControlProps = LinkControl | ButtonControl;

function Control(props: ControlProps & { kind: "primary" | "secondary" }) {
  const { kind, children, icon, full, className } = props;
  const cls = `${shell.button} ${shell[kind]} inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[2px] px-6 py-3 text-center text-base ${full ? "w-full" : ""} ${className ?? ""}`;
  const style: CSSProperties = { fontFamily: EL_FONT.body, fontWeight: 600, lineHeight: "24px" };
  const inner = (
    <>
      {icon && <PixelIcon name={icon} />}
      <span>{children}</span>
    </>
  );
  if (props.href !== undefined) {
    const { href, external, download, onClick } = props;
    if (external || download) {
      return (
        <a
          href={href}
          className={cls}
          style={style}
          onClick={onClick}
          download={download === true ? "" : download}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} style={style} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  const { kind: _kind, children: _children, icon: _icon, full: _full, className: _className, href: _href, type = "button", ...rest } = props;
  return (
    <button type={type} className={cls} style={style} {...rest}>
      {inner}
    </button>
  );
}

/** The screen's one main action: flameCore on the ground, flame on paper, with dark text. */
export function PrimaryButton(props: ControlProps) {
  return <Control kind="primary" {...props} />;
}

/** Everything else that is a button: a 1px outline in the text colour. */
export function SecondaryButton(props: ControlProps) {
  return <Control kind="secondary" {...props} />;
}

const LINK_SIZE = { sm: 15, md: 18, lg: 24 } as const;

/**
 * The landing's editorial link: Trirong 300 italic with "→" and the slow
 * underline (drawn once on touch screens). 44px tall without moving the line.
 */
export function EditorialLink({
  children,
  href,
  onClick,
  external,
  download,
  size = "md",
  tone = "text",
  arrow = true,
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  download?: string | true;
  size?: keyof typeof LINK_SIZE;
  /** action: flameCore on the ground, flame on paper. */
  tone?: "text" | "action";
  arrow?: boolean;
  className?: string;
}) {
  const cls = `-my-2 inline-flex min-h-11 items-center italic ${className ?? ""}`;
  const style: CSSProperties = { ...display(300, LINK_SIZE[size], 1.3), color: tone === "action" ? v.action : v.text };
  const inner = (
    <span className={`${cinema.textLink} ${cinema.textLinkInView}`}>
      {children}
      {arrow && " →"}
    </span>
  );
  if (href === undefined) {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {inner}
      </button>
    );
  }
  if (external || download) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={cls}
        style={style}
        download={download === true ? "" : download}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={cls} style={style}>
      {inner}
    </Link>
  );
}

/** A 52px text field with its label, hint and error. id is required (it ties them together). */
export function TextInput({
  id,
  label,
  hint,
  error,
  leading,
  className,
  ref,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** An icon inside the field, on the left (e.g. <PixelIcon name="search" />). */
  leading?: ReactNode;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2" style={{ color: v.secondary }}>
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={`${shell.input} block h-[52px] w-full rounded-[2px] pr-4 ${leading ? "pl-12" : "pl-4"}`}
          style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "24px" }}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: v.error }}>
          {error}
        </p>
      ) : hint ? (
        <Fine id={`${id}-hint`} className="mt-1.5">
          {hint}
        </Fine>
      ) : null}
    </div>
  );
}

export { PixelEdge, PixelIcon, type PixelIconName };

// ---------- Shell ----------

/** The "Elemental" wordmark with the poster's four corrupted letters, sized by font size. */
export function ElementalWordmark({ size = 48 }: { size?: number }) {
  return (
    <span style={{ ...display(200, size, 1), letterSpacing: "-0.01em" }}>
      {Array.from(ELEMENTAL.edition).map((ch, i) => (TITLE_GLYPHS[i] ? <GlyphLetter key={i} ch={ch} el={TITLE_GLYPHS[i]} on relative /> : ch))}
    </span>
  );
}

/**
 * The page's sign-off: the wordmark and "→" back to the hackathon page. On
 * the ground it sits on a strip of the sky, so the page opens and closes on
 * the key visual (and the glyphs keep the colours they have on the poster).
 */
export function FooterWordmark({ surface }: { surface: Surface }) {
  const link = (
    <Link href="/hackathon/elemental" aria-label={`${ELEMENTAL.edition} Hackathon`} className="inline-flex min-h-11 items-baseline gap-3" style={{ color: EL.ink }}>
      <ElementalWordmark />
      <span aria-hidden="true" className="italic" style={display(300, 28, 1)}>
        →
      </span>
    </Link>
  );
  if (surface === "paper") {
    return (
      <footer className="mx-auto max-w-xl px-5 pb-10 pt-8 sm:px-8">
        <div className="border-t pt-6" style={{ borderColor: v.ruleSoft }}>
          {link}
        </div>
      </footer>
    );
  }
  return (
    <footer className="relative isolate mt-16 h-[168px] overflow-hidden">
      <Image src={KEY_VISUAL_MEDIA.scenePoster} alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_0%]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[70%]" style={{ background: "linear-gradient(to bottom, #0c0d0c 0%, rgba(12,13,12,0.6) 45%, rgba(12,13,12,0) 100%)" }} />
      <div className="mx-auto flex h-full max-w-xl items-end px-5 pb-6 sm:px-8">{link}</div>
    </footer>
  );
}

export type Fact = { tag: ReactNode; value: ReactNode; note?: ReactNode; icon?: PixelIconName };

/** The landing hero's hairline fact grid: [tag], a Trirong value, an optional note. */
export function FactStrip({ facts, onSky = false, className }: { facts: Fact[]; onSky?: boolean; className?: string }) {
  return (
    <div
      className={`relative w-full ${onSky ? "border-t" : "border-y"} ${className ?? ""}`}
      style={{ borderColor: v.rule, backgroundColor: onSky ? "rgba(12,13,12,0.8)" : undefined }}
    >
      <div className={`grid ${onSky ? "mx-auto max-w-xl" : ""}`} style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
        {facts.map((f, i) => (
          <div
            key={i}
            className={`min-w-0 py-4 ${onSky ? "px-5 sm:px-8" : i === 0 ? "pr-4" : "pl-4"}`}
            style={{ borderLeft: i > 0 ? `1px solid ${v.rule}` : undefined }}
          >
            <span className="flex items-center gap-2" style={{ color: v.secondary }}>
              {f.icon && <PixelIcon name={f.icon} />}
              <Tag>{f.tag}</Tag>
            </span>
            <p className="mt-1" style={{ ...display(300, 24, 1.3), color: v.number }}>
              {weightDigits(f.value)}
            </p>
            {f.note && <Fine className="mt-0.5">{f.note}</Fine>}
          </div>
        ))}
      </div>
    </div>
  );
}

const SKY_FADE = "linear-gradient(to top, #0c0d0c 0%, rgba(12,13,12,0.95) 30%, rgba(12,13,12,0.45) 62%, transparent 100%)";

/**
 * The top of a ground page: a still of the calm sky (the landing hero's first
 * frame), the ink title on it, fading into the ground. facts sit on the fade
 * line. Pass it as Page's sky.
 */
export function SkyBand({
  title,
  lead,
  facts,
  image = KEY_VISUAL_MEDIA.scenePoster,
  height,
}: {
  /** Usually an <H1>. Ink on the sky. */
  title: ReactNode;
  /** One short line under the title, also ink (e.g. the school and a change link). */
  lead?: ReactNode;
  facts?: Fact[];
  image?: string;
  /** Total height in px; default 240, or 320 with facts. */
  height?: number;
}) {
  return (
    <section className="relative isolate flex flex-col overflow-hidden" style={{ minHeight: height ?? (facts ? 320 : 240) }}>
      <Image src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[50%_0%] sm:object-[50%_18%]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[58%]" style={{ background: SKY_FADE }} />
      <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-6 sm:px-8" style={{ color: EL_GROUND.skyInk }}>
        {title}
        {lead && (
          <div className="mt-2" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px", color: "rgba(29,33,31,0.8)" }}>
            {lead}
          </div>
        )}
      </div>
      <div className="flex-1" />
      {facts && <FactStrip facts={facts} onSky />}
    </section>
  );
}

/** The one primary action, pinned to the bottom (safe-area aware). Pass it as Page's bar. */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className={`${shell.stickyBar} fixed inset-x-0 bottom-0 z-40 border-t px-5 pt-3 sm:px-8`} style={{ backgroundColor: "var(--el-bar)", borderColor: v.rule }}>
      <div className="mx-auto flex max-w-xl items-stretch gap-2">{children}</div>
    </div>
  );
}

type PageProps = {
  children: ReactNode;
  /** ground (dark) or paper (cream). Without it: the old cream page, for screens not moved over yet. */
  surface?: Surface;
  /** The old page's small grey line at the top (old page only). */
  top?: string;
  /** "← หน้าของฉัน" in the top bar, back to the pay page. */
  back?: { href: string; label?: string };
  /** Anything else on the right of the top bar (instead of back). */
  topBarRight?: ReactNode;
  /** A <SkyBand> (ground only). */
  sky?: ReactNode;
  footer?: ReactNode;
  /** A <StickyBar>. */
  bar?: ReactNode;
  /** The wordmark sign-off at the bottom (default on). */
  wordmark?: boolean;
  /** A wider column (the board on a big screen). */
  wide?: boolean;
};

export function Page({ children, surface, top, back, topBarRight, sky, footer, bar, wordmark = true, wide = false }: PageProps) {
  if (!surface) return <LegacyPage top={top ?? ""} footer={footer} bar={bar}>{children}</LegacyPage>;

  const ground = surface === "ground";
  return (
    <main
      className={`${trirong.variable} ${shell.surface} ${ground ? cinema.cinemaRoot : "overflow-x-clip"} min-h-[100dvh]`}
      style={{ ...surfaceVars(surface), backgroundColor: TOKENS[surface].bg, color: TOKENS[surface].text }}
    >
      {ground && <div className={cinema.filmGrain} aria-hidden="true" />}
      <ElementalTopBar tone={surface} back={back} right={topBarRight} />
      {ground && sky}
      <div className={`mx-auto ${wide ? "max-w-3xl" : "max-w-xl"} px-5 pb-12 sm:px-8 ${ground && sky ? "pt-8" : "pt-10"}`}>
        {children}
        {footer}
      </div>
      {wordmark && <FooterWordmark surface={surface} />}
      {bar && (
        <>
          <div aria-hidden="true" className="h-28" />
          {bar}
        </>
      )}
    </main>
  );
}

/** A piece of the dark ground on the cream pay page: square, the pixel edge on top, grain inside. */
export function DarkSlab({ children, edge = true, as: El = "section", className }: { children: ReactNode; edge?: boolean; as?: "section" | "div" | "article"; className?: string }) {
  return (
    <El
      className={`${trirong.variable} ${shell.surface} relative isolate overflow-hidden rounded-[2px] ${className ?? ""}`}
      style={{ ...surfaceVars("ground"), backgroundColor: EL_GROUND.bg, color: EL_GROUND.text }}
    >
      {edge && <PixelEdge />}
      <div className="relative p-5 sm:p-6">{children}</div>
      <div className={shell.slabGrain} aria-hidden="true" />
    </El>
  );
}

// ---------- The older cream style (current screens; replaced screen by screen) ----------

// Every tap target is at least 44px tall.
export const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold disabled:opacity-50";
export const btnSmall = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50";
/** A text link or button in a line of text: padded to 44px tall without moving the line. */
export const inlineTap = "-my-3 inline-block py-3 text-sm underline underline-offset-4";
export const filled = { backgroundColor: EL.flame, color: EL.flameWhite };
export const outline = { boxShadow: `inset 0 0 0 1px ${EL.ink}` };
export const line = "rgba(29,33,31,0.2)";
export const hairline = "rgba(29,33,31,0.12)";

export const schoolLabel = (name: string, province?: string | null) => `โรงเรียน${name}${province ? ` · ${province}` : ""}`;

function LegacyPage({ top, children, footer, bar }: { top: string; children: ReactNode; footer?: ReactNode; bar?: ReactNode }) {
  return (
    <main
      className={`${shell.surface} min-h-[100dvh] overflow-x-clip px-5 pt-10 sm:px-8 sm:pt-16 ${bar ? "pb-32" : "pb-10 sm:pb-16"}`}
      style={{ ...surfaceVars("paper"), backgroundColor: EL.cream, color: EL.ink }}
    >
      <div className="mx-auto max-w-xl">
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {top}
        </p>
        <div className="mt-6">{children}</div>
        {footer}
      </div>
      {bar}
    </main>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance text-4xl sm:text-5xl" style={{ fontFamily: EL_FONT.display, fontWeight: 200, lineHeight: 1.12 }}>
      {children}
    </h1>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-pretty text-lg" style={{ color: EL.inkSoft }}>
      {children}
    </p>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={inlineTap} style={{ color: EL.inkSoft }}>
      {children}
    </Link>
  );
}

export function TextButton({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`${inlineTap} ${className ?? ""}`} style={{ color: EL.inkSoft }}>
      {children}
    </button>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm" style={{ color: EL.ember }}>
      {children}
    </p>
  );
}

/** A code in big spaced capitals: "1A2B 3C4D". */
export function CodeText({ code, className }: { code: string; className?: string }) {
  const c = code.toUpperCase();
  return (
    <span className={className} style={{ fontFamily: EL_FONT.mono, letterSpacing: "0.12em" }}>
      {c.slice(0, 4)}
      <span aria-hidden="true" className="inline-block w-[0.35em]" />
      {c.slice(4)}
    </span>
  );
}
