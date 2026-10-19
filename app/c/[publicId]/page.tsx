import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { certificateBaseUrl, imageUrl } from "@/lib/shift-round/certificate/config";
import {
  CertificateUnavailableError,
  cleanRef,
  fetchCertificate,
  isBotUserAgent,
  logCertificateVisit,
} from "@/lib/shift-round/certificate/rpc";
import { isValidPublicId } from "@/lib/shift-round/certificate/types";
import { VerifyView } from "./verify-view";

/**
 * Public SHIFT certificate verification page: /c/<public_id> (spec 6.1).
 * Reads through the anon client only (E13). States: valid, revoked,
 * tombstone, not found (404), service failure (5xx via error.tsx, never
 * shown as not found or revoked).
 */
export const dynamic = "force-dynamic";

type Params = Promise<{ publicId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const lookupCertificate = cache((publicId: string) => fetchCertificate(publicId));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { publicId } = await params;
  const base: Metadata = {
    title: "SHIFT certificate · Passion Seed",
    robots: { index: false, follow: false, nocache: true },
  };
  if (!isValidPublicId(publicId)) return base;
  const lookup = await lookupCertificate(publicId);
  if (lookup.kind !== "valid") return base;
  const square = imageUrl(publicId, "square", lookup.data.render_version, certificateBaseUrl());
  return {
    ...base,
    openGraph: {
      title: "SHIFT certificate · Passion Seed",
      description: "This certificate is valid. ใบรับรองนี้ใช้ได้",
      images: [{ url: square, width: 1080, height: 1080 }],
    },
    twitter: { card: "summary", images: [square] },
  };
}

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { publicId: rawId } = await params;
  const query = await searchParams;

  // Typed or scanned ids may arrive lowercase; Crockford base32 is case-insensitive.
  const upper = rawId.toUpperCase();
  if (upper !== rawId && isValidPublicId(upper)) {
    const ref = cleanRef(query.ref);
    permanentRedirect(`/c/${upper}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`);
  }

  const lookup = await lookupCertificate(rawId);
  if (lookup.kind === "not_found") notFound();
  if (lookup.kind === "error") throw new CertificateUnavailableError(lookup.reason);

  const userAgent = (await headers()).get("user-agent");
  if (!isBotUserAgent(userAgent)) {
    const ref = cleanRef(query.ref);
    after(() => logCertificateVisit(lookup.publicId, ref));
  }

  return <VerifyView lookup={lookup} baseUrl={certificateBaseUrl()} />;
}
