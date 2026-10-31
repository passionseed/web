# SHIFT parent consent (PDPA)

Under Thai law anyone under 20 is a minor (Civil and Commercial Code s.19).
PDPA s.20 says a minor's consent needs a parent's consent too. SHIFT applicants
are mostly ม.4 to ม.6, so nearly every applicant needs a parent.

## How it works

1. The apply form asks for a birth date. Under 20 (or no valid date) it also
   asks for a parent email and a phone or LINE. At 20 or older the parent
   question disappears and no parent details are stored.
2. The student applies alone and can join Discord right away. Applying is a
   step taken at their own request (PDPA s.24(3)); no consent is needed for it.
3. The apply API emails the parent a private link, `/shift/parent/{token}`,
   through Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Only the token's
   sha256 is stored.
4. The parent reads the round, fee, refund rule and the privacy notice
   (`SHIFT_NOTICE` in `lib/shift/parentConsent.ts`). They then type their full
   name, pick their relationship and tick to confirm. That is their electronic
   signature (Electronic Transactions Act s.9). The row keeps the name,
   relationship, time, IP and browser as evidence.
5. A second, optional tick covers AI progress tracking (SeedStack). Enrollment
   never depends on it (PDPA s.19). If ticked, the student's SeedStack consent
   needs no second parent link: `applyShiftParentAiConsent` fills it in,
   whether the student or the parent goes first.
6. **"Mark paid" is locked** on `/admin/shift` until the parent agrees. Paying
   admits the student to the round, and the paid contract needs the parent.

## Admin page

Each application shows a parent badge next to the paid switch:
"Waiting parent", "Parent agreed", "Parent declined" or "Parent withdrew".
Open the row for the details and two buttons:

- **Email parent link**: sends a fresh link to the parent email.
- **Copy link for LINE**: for parents who don't read email, and for
  applications from before 2026-10-29 that have no parent email.

Both make a new link, and the old one stops working.

Applications from before the consent flow (`consent_notice_version` is null)
are not locked. Send their parents a link when you can.

## When a parent withdraws

Withdrawing is recorded, not acted on automatically. SeedStack data is deleted
right away. The seat, the refund and the Discord role are the team's call:
decide them and contact the family.

## Changing the notice

Edit `SHIFT_NOTICE` and bump `SHIFT_NOTICE_VERSION`. Rows keep the version
they were shown. The retention promise in the notice (non-participants deleted
within a year of the round ending) still needs a cleanup job.

## Cookies

The Meta Pixel on SHIFT pages loads only after the visitor accepts the cookie
banner (`components/shift/MetaPixel.tsx`). Declining changes nothing else.
