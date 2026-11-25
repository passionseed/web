import { QUIZ_ELEMENTS, isQuizElement } from "@/lib/hackathon/elemental/quiz";
import { renderQuizStory } from "@/lib/og/elemental-quiz";

export const runtime = "nodejs";

export function generateStaticParams() {
  return QUIZ_ELEMENTS.map((element) => ({ element }));
}

/** The 9:16 result card, to save or share into an IG Story. */
export async function GET(_req: Request, { params }: { params: Promise<{ element: string }> }) {
  const { element } = await params;
  if (!isQuizElement(element)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(renderQuizStory(element)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Disposition": `inline; filename="elemental-${element}.png"`,
    },
  });
}
