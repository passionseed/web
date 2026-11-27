import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { clientIp } from "@/lib/hackathon/elemental/link-views";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { parseOptionalPhone, parseTeacherContact } from "@/lib/hackathon/elemental/share-rules";
import { resolveSchool, schoolBody } from "@/lib/hackathon/elemental/share-school";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { createTeacherLink } from "@/lib/supabase/hackathon-share-links";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(3).max(120),
  phone: z.string().trim().max(30).optional(),
  school: schoolBody,
});

/**
 * Per hour. Loose per network, since a school's teachers often share one
 * wifi; tight per contact, which is what stops one person making many links.
 */
const LIMITS = { ip: 20, contact: 3 };
const limitKey = (kind: string, value: string) => createHash("sha256").update(`elemental-teacher:${kind}:${value}`).digest("hex");

/**
 * A teacher makes their share link (no sign-up). Returns the private token
 * for /hackathon/elemental/teacher/<token>. One live link per email or LINE ID.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!shareOpen()) return NextResponse.json({ error: "closed" }, { status: 409 });

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { name, contact: rawContact, phone: rawPhone } = parsed.data;
    const contact = parseTeacherContact(rawContact);
    if (!contact) return NextResponse.json({ error: "contact" }, { status: 400 });
    const phone = parseOptionalPhone(rawPhone);
    if (!phone.ok) return NextResponse.json({ error: "phone" }, { status: 400 });
    if (isRudeTeamName(name)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const school = await resolveSchool(parsed.data.school);
    if (!school) return NextResponse.json({ error: "school" }, { status: 400 });

    // The limiter fails closed: if it can't count, no link is made.
    const [ipLimit, contactLimit] = await Promise.all([
      checkRateLimit(limitKey("ip", clientIp(request.headers)), LIMITS.ip),
      checkRateLimit(limitKey("contact", contact.key), LIMITS.contact),
    ]);
    if (!ipLimit.allowed || !contactLimit.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const result = await createTeacherLink(ELEMENTAL.slug, {
      name,
      school,
      contact: contact.value,
      contactKey: contact.key,
      phone: phone.value,
    });
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ token: result.token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeServerError("Could not make the teacher link", error);
  }
}
