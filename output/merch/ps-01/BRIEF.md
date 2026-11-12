# PS[01]: Dawn / Dusk

Small batch for the team, mentors and community. 40 numbered pieces.
Tech pack mockup: [techpack.html](techpack.html)

## What it is

One shirt, two skies, drawn in the PassionSeed design language: the Dawn and Dusk themes, the flame-seed mascot, and the SHIFT pixel grid.

- **DUSK** (team + mentors): aubergine-black body, the sun setting at the hem, embers rising.
- **DAWN** (community + alumni): night-navy body, the sun rising at the hem, a gold horizon.
- **Back is the hero**: pixel stars in glow-in-the-dark ink fading down into a dithered pixel horizon with the sun on it. The horizon wraps around the hem.
- **Front**: the flame-seed mascot (redrawn as pixels) peeking out of a real chest pocket.
- **Functional features**: a TAP label (NFC tag that opens what the wearer is building), a velcro panel on the left sleeve for pixel patches (role patches come with the shirt, SHIFT[n] patches are earned), and an ember locker loop.
- **Inside neck**: `PS[01] · DUSK · M · 07/40` + a Thai line (draft, needs review).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Audience | Team, mentors, community (not for sale) | Builds identity before building revenue |
| Editions | Dusk for team + mentors, Dawn for community | Matches the product's own Dusk (experts) / Dawn (students) mapping |
| Quantity | 40 + 4 spare, split by role | Small enough to absorb mistakes |
| Print | 4 flat screen-print colours + 1 glow ink per edition, dithered (no gradients), printed on cut panels | Pixel dither makes the gradient printable in spot colours; panel printing lines the horizon up across side seams |
| Fabric | 240 gsm cotton, garment-dyed in navy / aubergine | Heavy feel, wearable in Bangkok heat |
| Mascot | Flat-fill embroidery, 16 × 15 pixel grid | Pixel edges stay sharp in thread |
| Patches | PVC, 5 × 5 cm, hook back | PVC holds hard pixel edges better than embroidery |
| NFC | In v1, admin-managed | 40 tags = 40 database rows |

## Flow (about 6 to 8 weeks)

| Week | Step | Done when |
|---|---|---|
| 1 | Lock colour, artwork (labels, patches, neck print). Send a size survey to the 40 people. Run the Thai neck line through the multi-model review. | Size split is real, not guessed |
| 1-2 | Send the RFQ (below) to 3 garment workshops, 1 woven-label maker, 1 patch maker, 1 NFC tag seller | 3 garment quotes in hand |
| 2-3 | Proto sample (1-2 pcs). Order 10 sample NFC tags. Build `/t/[code]`. | Sample in hand, tap works end to end |
| 3-4 | Fit test on three people (S, M, XL). **30-wash test**: NFC, velcro, print, collar. | Tag still reads after 30 washes, collar flat |
| 4 | Pre-production sample signed off (the "golden sample") | Workshop has a physical standard to match |
| 5-6 | Production | |
| 6-7 | QC every piece. Write and **lock** every tag, tap-test each one. Pack with the role patch. Hand out at an event, e.g. a SHIFT demo day. | 40 shirts worn in one photo |

Two routes for a run of 40. Get quotes for both:

- **Cut-and-sew at a small Bangkok workshop.** Custom fit and pocket. Costs more per shirt at this quantity, and some workshops won't take 40.
- **Heavyweight blank + local modifications.** Add the pocket, velcro, labels and print to a blank. Faster and cheaper, but the fit is generic.

## Rough budget (guesses, replace with quotes)

| Item | Estimate (THB) |
|---|---|
| Pattern + 2 samples | 3,000–8,000 |
| 44 tees, cut-and-sew, 2 garment colours | 16,000–26,000 |
| Panel screen print, back + wrap hem (2 editions × 5 screens) | 6,000–12,000 |
| Mascot embroidery on pocket | 2,000–4,000 |
| Woven labels, 2 designs (MOQ ~100) | 2,000–4,000 |
| NFC tags (50–100) | 1,500–4,000 |
| Patches, 4 designs × ~50 | 6,000–12,000 |
| Neck print + packaging | 2,000–4,000 |
| **Total** | **~40,000–70,000** (about ฿900–1,600 per shirt) |

Screens and patches are the biggest variables: screen setup costs the same for 40 shirts as for 400, so a second edition roughly doubles the print setup. Ordering only the role patches (TEAM, MENTOR, COMMUNITY) now and the SHIFT round patch closer to the round spreads the cost.

## NFC: software (small)

- Migration: `merch_tags (code text primary key, holder_label text, target_url text, active boolean default false, tap_count int default 0, created_at timestamptz)`. Enable RLS with no public policies; only the server reads it.
- `app/t/[code]/route.ts`: look up the code with the admin client. If the tag is active, increment the count and redirect to `target_url`; otherwise redirect to a static PS-01 page.
- v1 has no admin UI: edit 40 rows in the Supabase dashboard.
- **Lock every tag after writing it.** An unlocked NTAG can be rewritten by anyone with a phone, which turns the shirt into a phishing link. The URL never changes (the redirect happens on the server), so locking costs nothing.
- Safeguarding: tags start inactive and point to a project, never to personal info. If anyone in "community" is a student, they opt in like everyone else.

## RFQ message (Thai, for workshops)

> สวัสดีครับ ทาง PassionSeed กำลังหาโรงงานตัดเย็บเสื้อยืดจำนวนน้อย รบกวนขอใบเสนอราคาตามสเปกนี้ครับ
>
> - เสื้อยืดทรง boxy ไหล่ตก ผ้าคอตตอน OE 240 แกรม ฟอกนุ่ม/กันหดก่อนตัด
> - 2 สี: กรมท่าเข้ม และม่วงเข้มเกือบดำ (แนบรูปตัวอย่างสี)
> - สกรีนหลังเต็มตัวและรอบชายเสื้อ 5 สี (รวมหมึกเรืองแสง) สกรีนบนชิ้นผ้าก่อนเย็บ
> - ปักลายมาสคอตบนกระเป๋า ประมาณ 5 × 5 ซม.
> - กระเป๋าหน้าอกซ้าย 11×13 ซม. มีช่องเสียบปากกา 2 ซม. เย็บ bartack ด้ายสีส้ม
> - เย็บตีนตุ๊กแก (ด้านขน) 5×5 ซม. ที่แขนซ้าย
> - ห่วงแขวนหลังคอ ผ้าเทปสีส้ม ยาว 5 ซม.
> - เย็บป้ายทอ 2 จุด (หน้ากระเป๋า และข้างตะเข็บชายเสื้อ) ทางเราส่งป้ายให้ หรือขอราคาทำป้ายด้วยก็ได้ครับ
> - สกรีนด้านในคอหลัง หมึก water-based พร้อมเลขรัน 01–40
> - จำนวน 40–44 ตัว 5 ไซซ์ (S–2XL) มีตารางไซซ์แนบ
>
> อยากทราบราคาต่อตัว ค่าแพทเทิร์นและค่าตัวอย่าง ขั้นต่ำการผลิต และระยะเวลาทำตัวอย่างและผลิตครับ ขอบคุณครับ

Check the Thai before sending (it's a business message, not marketing, but still).

## Open questions

- Keep both editions, or start with Dusk only (cuts print setup in half)?
- Split between Dusk and Dawn (draft: 15 / 25)?
- Who gets a number? Suggestion: 01–10 for the team, in order of joining, then mentors, then community.
- Which event do we hand them out at? That date sets the deadline.
