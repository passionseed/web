import { useScroll, useTransform, type MotionValue } from "framer-motion";

type ScrollOptions = NonNullable<Parameters<typeof useScroll>[0]>;

/**
 * Scroll progress (0 to 1) through one section, for scroll-driven fades and
 * moves on the Elemental page.
 *
 * Use this instead of `useScroll` directly. framer-motion 12.34 hands opacity
 * transforms to the browser's scroll timeline, and that path reads the target
 * ref before React attaches it, so opacity follows the whole page instead of
 * the section: lines and pictures that should fade in stay invisible. Passing
 * the progress through a function transform keeps every value on the
 * JavaScript path, which tracks the section correctly.
 */
export function useSectionScroll(options: ScrollOptions): MotionValue<number> {
  const { scrollYProgress } = useScroll(options);
  return useTransform(scrollYProgress, (v) => v);
}
