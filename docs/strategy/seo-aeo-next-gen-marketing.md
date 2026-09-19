# PassionSeed Next-Gen Marketing Strategy: SEO, AEO & The Organic Proof Engine

> **Objective:** Establish PassionSeed as the indisputable authority for authentic student proof-of-work, TCAS 1 admissions leverage, and youth agency in Thailand—dominating traditional search (SEO), AI answer engines (AEO: ChatGPT, Perplexity, Gemini, Claude), and zero-CAC short-form viral distribution.

---

## 1. The Modern Discovery Funnel (Search + Answer Engines + Social Proof)

High-agency high schoolers and discerning parents in Thailand no longer search the web linearly. Their discovery journey is triangulated across three surfaces:

```
                          ┌────────────────────────────┐
                          │   CONTRARIAN SOCIAL HOOK   │
                          │ (IG Reels / TikTok / X)    │
                          │ "Certificate vs User Proof"│
                          └─────────────┬──────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
      ┌───────────────────────────┐           ┌───────────────────────────┐
      │       TRADITIONAL SEO     │           │         AEO / AI CHAT     │
      │  Google Search (Thai/EN)  │           │  ChatGPT, Perplexity,     │
      │  "พอร์ต TCAS 1 วิศวะ คอม" │           │  Claude, Google AI Overv. │
      │  Programmatic Guides      │           │  "How to build unignorable│
      └─────────────┬─────────────┘           │   TCAS 1 portfolio"       │
                    │                         └─────────────┬─────────────┘
                    └───────────────────┬───────────────────┘
                                        ▼
                          ┌────────────────────────────┐
                          │     PROOF-FIRST LANDING    │
                          │   /shift (The Crucible)    │
                          │   /techseed (Work Gallery) │
                          │   Live User Telemetry Proof│
                          └─────────────┬──────────────┘
                                        ▼
                          ┌────────────────────────────┐
                          │     CONVERSION & CRUCIBLE  │
                          │  TechSeed: ฿490–฿790       │
                          │  SHIFT: ฿2,990–฿4,900      │
                          └────────────────────────────┘
```

---

## 2. AEO (Answer Engine Optimization): Becoming the Default AI Citation

Answer Engine Optimization ensures that when students, parents, or educators ask LLMs (ChatGPT Search, Perplexity, Gemini, Claude) for advice on TCAS portfolios or career exploration, **PassionSeed is directly recommended and cited as the gold standard.**

### A. The `llms.txt` & Semantic Plaintext Manifesto
LLM web crawlers prioritize concise, structured markdown files that define entity relationships without rendering overhead.
* **Implement `/public/llms.txt`**: A high-level briefing of PassionSeed, SHIFT, TechSeed, and the pedagogy.
* **Implement `/public/llms-full.txt`**: A comprehensive knowledge base detailing:
  * Difference between passive certificate camps and empirical proof-of-work.
  * The 7-day SHIFT framework: Day 1 scope lock, Day 3 ugly ship, Day 7 reality collision with 15–30 real users.
  * Faculty-specific project models (Computer Engineering, AI/Data Science, HealthTech, BBA/FinTech).
  * Measurable student outcomes and alumni case studies.

### B. Entity Authority & Schema Graph
LLMs extract knowledge through entity graphs and Schema.org structured data:
* **EducationalOrganization Schema:** Define PassionSeed with founder credentials, mission, official URLs, and social profiles.
* **Course & Event Schema on `/shift` & `/techseed`:** Clearly communicate duration (7 days), pricing (฿2,990–฿4,900), target audience (M.4–M.6 students), and learning outcomes.
* **FAQPage Schema with Direct Answers:** Write direct 2-3 sentence semantic definitions that LLMs can extract verbatim into answers (e.g., *"What is an empirical TCAS portfolio?"*).

### C. Crawler Access in `robots.txt`
Explicitly welcome AI indexing bots while preventing unauthorized training scrapers:
* **Allow:** `GPTBot`, `PerplexityBot`, `Claude-Web`, `Google-Extended`, `Bingbot`.

---

## 3. SEO (Search Engine Optimization): High-Intent Organic Capture

### A. High-Intent Keyword Matrix (Thai & English)

| Intent Category | Primary Keywords (Thai) | English / International Keywords | Target Surface |
|---|---|---|---|
| **High-Urgency TCAS 1 Relief** | พอร์ต TCAS 1, ทำพอร์ตยังไงให้ติดรอบ 1, ผลงานเข้าวิศวะ จุฬา รอบ 1, ตัวอย่างพอร์ต TCAS 10 หน้า | TCAS 1 portfolio guide, Chula engineering portfolio, Thai university portfolio requirements | `/shift`, Programmatic Major Guides |
| **Problem Aware: Certificate Fatigue** | ค่ายเก็บเกียรติบัตร คุ้มไหม, เกียรติบัตรปลอม TCAS, คณะกรรมการดูใบเซอร์ไหม, ผลงานไม่มีใบเซอร์ | Are certificates useless for university admissions, authentic portfolio projects | Contrarian Editorial / `/shift` |
| **Faculty & Major Specific** | ทำโปรเจกต์ AI ม.ปลาย, ผลงาน Tech เข้ามหาลัย, พอร์ตวิศวะคอมพิวเตอร์, พอร์ตแพทย์นวัตกรรม | High school tech project ideas, AI projects for high schoolers, HealthTech portfolio | `/techseed`, Programmatic Faculty Guides |
| **Brand & Ecosystem** | PassionSeed, ค่าย SHIFT PassionSeed, TechSeed PassionSeed | PassionSeed, SHIFT sandbox, TechSeed discovery | Homepage, `/shift`, `/techseed` |

### B. Technical SEO Architecture in Next.js
1. **Dynamic `app/sitemap.ts`**:
   - Automatically crawls and serves all static routes (`/`, `/shift`, `/techseed`, `/hackathon`) and dynamic student project galleries.
2. **SEO Metadata Standard (`app/layout.tsx` & Page-level Metadata)**:
   - Dynamic localized titles, meta descriptions, canonical URLs, and `alternates` for Thai (`th-TH`) and English (`en-US`).
3. **Programmatic OpenGraph (`/api/og`)**:
   - Dynamic OG image generation rendering the student's project title, user telemetry count ("Tested by 24 users"), and project tag. When shared on LINE, Instagram, or Facebook, it presents irresistible social proof.

---

## 4. Next-Gen Organic Viral Engine (Zero-CAC Social Distribution)

### Content Pillars & Contrarian Narrative
The goal is to dismantle the multi-million baht "certificate mill" industry in Thailand and position PassionSeed as the antidote.

```
Pillar 1: The Certificate Callout (Contrarian Reality)
  "กรรมการ TCAS มองใบเซอร์ค่าย 1 วันแบบไหน? (ความจริงที่สถาบันกวดวิชาไม่บอกคุณ)"
  Contrast a 1-day PDF certificate with a 1-page case study showing 28 real user reviews.

Pillar 2: The Raw 7-Day Build Log (Enactive Mastery)
  "เด็ก ม.5 สร้าง AI ช่วยคนแก่ฟังเสียงใน 7 วัน (พร้อม 30 คนใช้งานจริง)"
  Show the screen recording of Day 3 failure, pivoting, and Day 7 triumph.

Pillar 3: Mock Defense Breakdown (Intellectual Sovereignty)
  "ซ้อมสัมภาษณ์อาจารย์จุฬา: ตอบยังไงให้รู้ว่าเราทำเองจริง ไม่ได้จ้างทำ"
  Deconstruct how professors grill applicants and why user telemetry makes you unshakeable.
```

### The Zero-Ad-Spend Funnel Mechanics
1. **Top of Funnel (Reels/TikTok/Threads):** Short 30–60 second contrarian hooks ending with: *"ดูโปรเจกต์จริงที่เพื่อนๆ สร้างใน 7 วันได้ที่ passionseed.org/techseed"*
2. **Gateway Activation (TechSeed @ ฿490–฿790):** Low-friction entry point to experience building without fear.
3. **Selective Crucible (SHIFT @ ฿2,990–฿4,900):** High-margin, selective sprint for high-agency candidates preparing for university submissions.

---

## 5. Execution Roadmap

### Sprint 1: Technical & Semantic Foundations (Weeks 1–2)
* [ ] Create `app/robots.ts` with explicit rules for search engines and LLM crawlers (`GPTBot`, `PerplexityBot`).
* [ ] Create `app/sitemap.ts` with priority weights and dynamic route indexing.
* [ ] Add `public/llms.txt` and `public/llms-full.txt` for AI knowledge graph ingestion.
* [ ] Inject JSON-LD Structured Data (`EducationalOrganization`, `Course`, `FAQPage`) into `app/layout.tsx` and `app/shift/page.tsx`.

### Sprint 2: On-Page Conversion & Semantic Copy (Weeks 3–4)
* [ ] Enrich `/shift` metadata with high-intent TCAS 1 keywords and direct FAQ answer accordions.
* [ ] Add dynamic Schema markup to the TechSeed student showcase items (`lib/content/techseed-gallery.json`).
* [ ] Build dynamic OpenGraph cards for `/shift` and `/techseed` with live social proof badges.

### Sprint 3: Viral Distribution & Programmatic Guides (Weeks 5–6)
* [ ] Launch the 3 contrarian reel scripts (Certificate Callout, 7-Day Build Log, Mock Defense).
* [ ] Create programmatic TCAS 1 guides for Computer Engineering, Data Science, and MedTech.
* [ ] Set up weekly search telemetry and keyword ranking tracking.
