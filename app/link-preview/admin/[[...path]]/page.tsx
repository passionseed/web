import type { Metadata } from "next";
import { adminMetadata, adminPosterUrl, adminRouteFromSegments } from "@/lib/admin/metadata";
import { OG_SIZE } from "@/lib/og/poster";

/**
 * What a chat app's crawler sees for an admin link (the proxy rewrites it
 * here). It renders tags only and never imports admin pages or data.
 */
interface PreviewParams {
  params: Promise<{ path?: string[] }>;
}

export async function generateMetadata({ params }: PreviewParams): Promise<Metadata> {
  const route = adminRouteFromSegments((await params).path);
  const metadata = adminMetadata(route);
  const image = { url: adminPosterUrl(route), ...OG_SIZE, alt: "PassionSeed Admin" };
  return {
    ...metadata,
    robots: { index: false, follow: false },
    openGraph: { ...metadata.openGraph, images: [image] },
    twitter: { card: "summary_large_image", images: [image.url] },
  };
}

export default function AdminLinkPreviewPage() {
  return null;
}
