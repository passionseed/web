import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TIPS_FILES, getTipsFile } from "@/lib/content/tips-files";
import { TipsRedirect } from "./tips-redirect";

const SITE_URL = "https://www.passionseed.org";
const OG_IMAGE = `${SITE_URL}/og-passionseed.jpg`;

type PageProps = { params: Promise<{ slug: string }> };

/** Pre-render every tips page so the crawler that builds the DM link preview
 *  gets a fully-formed card without waiting on a cold render. */
export function generateStaticParams() {
  return TIPS_FILES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const file = getTipsFile(slug);
  if (!file) return { title: "Passion Seed" };

  const url = `${SITE_URL}/tips/${file.slug}`;
  return {
    title: `${file.title} | Passion Seed`,
    description: file.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "Passion Seed",
      title: file.title,
      description: file.description,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: file.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: file.title,
      description: file.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function TipsPage({ params }: PageProps) {
  const { slug } = await params;
  const file = getTipsFile(slug);
  if (!file) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      {/* The page is a pass-through to the PDF, so it shows only a spinner.
          The title still lives in the document metadata, which is what the DM
          link preview reads. */}
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground"
        role="status"
        aria-label={`กำลังเปิด ${file.title}`}
      />

      {/* Anyone the auto-redirect fails for (blocked navigation, no JS) still
          has a way through, without the spinner turning into a landing page. */}
      <noscript>
        <a href={file.fileUrl} className="text-sm underline">
          เปิดไฟล์ PDF
        </a>
      </noscript>

      <TipsRedirect fileUrl={file.fileUrl} />
    </main>
  );
}
