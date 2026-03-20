# Epic Sprint Report - PassionSeed

## 📄 Generated Report

**File:** `Epic_Sprint_Report_PassionSeed.pdf`

**Location:** `/pseed/Epic_Sprint_Report_PassionSeed.pdf`

**Size:** ~27KB

**Pages:** 11 pages

---

## 📊 Report Contents

1. **Cover Page** - Sprint status, total actions, achievement badge
2. **Table of Contents**
3. **Executive Summary** - Key metrics and sprint achievement
4. **Choice of MVP & Rationale** - Why hackathon + beta registration
5. **Customer Segments Discovered** - 3 key segments identified
6. **KPIs & Success Factors** - Table with all 6 KPIs and pass/fail status
7. **Email Campaign Results** - 208 recipients, 20.39% open rate
8. **Instagram & Social Media Campaign** - 704 followers, conversion rate
9. **Traffic Sources Analysis** - Bar chart with 6 traffic sources
10. **Results Evaluation** - Hackathon and beta performance
11. **Key Learnings** - What worked, what to fix, customer insights
12. **Next Steps** - Including post-hackathon survey plan
13. **Appendix** - Participant list template with export instructions

---

## 📧 Exporting Participant Emails

To include the actual email addresses in your submission, export them from Supabase:

### Hackathon Participants (349 total)

```sql
-- Export all hackathon participant emails
SELECT 
  id,
  email,
  full_name,
  school,
  grade_level,
  created_at
FROM hackathon_participants
ORDER BY created_at ASC;
```

### Beta Registrations (29 total)

```sql
-- Export beta registration emails from submissions
SELECT 
  s.id,
  s.created_at,
  MAX(CASE WHEN ff.label = 'Email address' THEN sa.answer_text END) as email,
  MAX(CASE WHEN ff.label = 'Full name' THEN sa.answer_text END) as full_name,
  MAX(CASE WHEN ff.label = 'School' THEN sa.answer_text END) as school
FROM ps_submissions s
JOIN ps_submission_answers sa ON s.id = sa.submission_id
JOIN ps_form_fields ff ON sa.field_id = ff.id
WHERE s.form_id = (
  SELECT id FROM ps_feedback_forms 
  WHERE token = '2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11'
)
GROUP BY s.id, s.created_at
ORDER BY s.created_at ASC;
```

### Via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Table Editor**
4. Select `hackathon_participants` table
5. Click **"..."** → **Export to CSV**

---

## 🎯 Sprint Achievement Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total Actions | 100 | 378 | ✅ PASS (378%) |
| Team Formation Rate | ≥50% | 66.2% | ✅ PASS |
| Beta Completion Rate | ≥50% | 64.1% | ✅ PASS |
| Email Open Rate | ≥20% | 20.39% | ✅ PASS |
| Cost Per Engaged User | <฿15 | ฿11.03 | ✅ PASS |

**Overall Status: ✅ SPRINT PASSED**

---

## 📱 Social Media Links

- **Main Instagram:** https://www.instagram.com/passion_seed.th/ (704 followers)
- **Hackathon Instagram:** https://www.instagram.com/thenextdecade.hackathon/reels/

---

## 🔗 Product URLs

- **Hackathon:** https://passionseed.org/hackathon
- **Beta Registration:** https://passionseed.org/app/beta
- **Main Site:** https://passionseed.org

---

## 📝 Key Customer Insights

### Segment 1: The Unknown/Untouched
- Students who don't know PassionSeed, no prior contact
- Never participated in hackathons or career events
- **Need:** Career exploration and awareness
- **Size:** Majority of hackathon participants

### Segment 2: The Eager Portfolio Builders
- Join all events to build portfolio for university admission
- **Need:** Certainty about university acceptance vs. TCAS3 preparation
- **Size:** Significant minority
- **Status:** Verified through direct engagement

### Segment 3: The Middle Ground
- Tried some events, not focused on portfolio
- Unsure about university/faculty/program choice
- Choose based on friends or feasibility
- **Need:** Exploration, guidance, confidence, reducing parent anxiety
- **Size:** Substantial portion

---

## 🛠️ Skills Taught Through Hackathon

The hackathon taught crucial skills aligned with PassionSeed's mission:
- Venture Building
- AI Rapid Prototyping
- Design Thinking
- Teamwork on Social Issues

---

## 📋 Next Steps

1. Survey all 349 hackathon participants to map customer segments
2. Implement post-event feedback collection
3. Improve email deliverability for future campaigns
4. Lower friction on beta referral gate
5. Continue Instagram content strategy with reels
6. Build on hackathon momentum with follow-up events

---

## 📞 Contact

**Prepared by:** PassionSeed Team
**Date:** March 2026
**Program:** FI Accelerator

---

*This report was generated automatically from the epic-sprint page data.*
