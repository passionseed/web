import { QUIZ_ELEMENTS, isQuizElement } from "@/lib/hackathon/elemental/quiz";
import { QUIZ_OG_SIZE, renderQuizOg } from "@/lib/og/elemental-quiz";

export const alt = "Elemental quiz: เธอคือธาตุอะไร";
export const size = QUIZ_OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export function generateStaticParams() {
  return QUIZ_ELEMENTS.map((element) => ({ element }));
}

export default async function Image({ params }: { params: Promise<{ element: string }> }) {
  const { element } = await params;
  const png = renderQuizOg(isQuizElement(element) ? element : "fire");
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
