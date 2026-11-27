import { QUIZ_ELEMENTS, isQuizElement } from "@/lib/hackathon/elemental/quiz";
import { QUIZ_OG_SIZE, renderQuizOg } from "@/lib/og/elemental-quiz";

export const alt = "Elemental quiz: คุณคือธาตุอะไร";
export const size = QUIZ_OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export function generateStaticParams() {
  return QUIZ_ELEMENTS.map((element) => ({ element }));
}

export default async function Image({ params }: { params: Promise<{ element: string }> }) {
  const { element } = await params;
  if (!isQuizElement(element)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(renderQuizOg(element)), { headers: { "Content-Type": "image/png" } });
}
