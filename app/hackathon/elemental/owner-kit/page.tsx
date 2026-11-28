import type { Metadata } from "next";

import { OwnerKit } from "@/components/hackathon/elemental/owner-kit/OwnerKit";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { parseOwnerElement, verifyOwnerLink } from "@/lib/hackathon/elemental/owner-link";

/**
 * The Elemental problem-owner kit. Anyone can read the guide; the upload form
 * opens only on a signed link made with `pnpm elemental:owner-kit link`.
 * Not indexed: it's shared by link with problem owners.
 */
export const metadata: Metadata = {
  title: `${ELEMENTAL.edition} Hackathon: ชุดเจ้าของโจทย์`,
  description: "สิ่งที่เราขอจากเจ้าของโจทย์ วิธีถ่าย และที่อัปโหลดไฟล์",
  robots: { index: false, follow: false },
};

export default async function OwnerKitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const element = parseOwnerElement(one(params.el));
  const org = one(params.o);
  const signature = one(params.s);
  const upload = org && signature && verifyOwnerLink(org, element, signature) ? { org, signature } : null;
  // A link that tried to be signed but doesn't check out: say so, rather than quietly showing the public guide.
  const linkBroken = Boolean(org || signature) && !upload;
  return <OwnerKit element={element} upload={upload} linkBroken={linkBroken} />;
}
