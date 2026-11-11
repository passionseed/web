import { HAIR, HomeHeading, T, tint } from "./homeTheme";
import { HOME_FAQ_HEADING, homeFaqs } from "@/lib/content/home-faq";
import { getEffectiveCohort } from "@/lib/content/shift-cohort";

/** The last objections, answered before the closing button. First one open. */
export function HomeFaq() {
  return (
    <section className="py-10 sm:py-20">
      <HomeHeading>{HOME_FAQ_HEADING}</HomeHeading>
      <div className={`mt-10 border-t ${HAIR}`}>
        {homeFaqs(getEffectiveCohort()).map((faq, i) => (
          <details key={faq.q} open={i === 0} className={`home-faq border-b ${HAIR}`}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 py-5 font-kodchasan text-lg font-semibold leading-snug sm:text-xl">
              {faq.q}
              <span className="home-faq-mark font-mono text-2xl leading-none" style={{ color: T.accent3 }} aria-hidden="true">
                +
              </span>
            </summary>
            <p className="max-w-3xl pb-6 text-base leading-relaxed" style={{ color: tint("cc") }}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
