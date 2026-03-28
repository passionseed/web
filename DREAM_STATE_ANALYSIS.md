# Passion Seed - 12-Month Dream State Analysis

**Date:** March 28, 2026  
**Team:** PS (Passion Seed)  
**Status:** Gap analysis complete, tickets created

---

## 12-Month Dream State

### 1. ✅ Personalized seed queue ranked by profile affinity + exploration gaps

**Status:** Tickets exist, implementation in progress

**Related Tickets:**
- PS-4: Seed queue personalization ranking algorithm
- PS-15: Implement seed ranking algorithm (affinity + exploration gap)
- PS-16: Update discover.tsx to use ranked seed endpoint
- PS-24: Phase 1 Foundation: Seed ranking edge function
- PS-45: [Mobile] Seed ranking display in Discover screen

**Gaps:** None identified — foundation tickets cover the full pipeline

---

### 2. ✅ AI-assisted PathLab generation (expert interview → seed in 1 hour)

**Status:** Tickets exist

**Related Tickets:**
- PS-9: AI-assisted PathLab seed generator
- PS-26: Phase 2: AI PathLab seed generator pipeline
- PS-51: [Content] Expert interview → seed content pipeline

**Gaps:** None identified

---

### 3. ✅ Real ikigai derived from reflection data across all completed seeds

**Status:** Tickets exist

**Related Tickets:**
- PS-13: Build career-insights edge function for ikigai calculation
- PS-14: Connect profile.tsx to real ikigai edge function
- PS-25: Phase 1: Ikigai edge function MVP
- PS-43: [Data] Reflection → Ikigai calculation pipeline
- PS-44: [Mobile] Ikigai visualization component for Profile screen

**Gaps:** None identified

---

### 4. ✅ Reflection trends feed Direction Finder and university roadmap match

**Status:** Tickets exist

**Related Tickets:**
- PS-6: Build reflection trends dashboard
- PS-28: Phase 1: Reflection trends → Direction Finder integration
- PS-29: Build reflection trends aggregation pipeline (daily/weekly/monthly)
- PS-52: [Mobile] Direction Finder screen with university roadmap integration

**Gaps:** None identified

---

### 5. ✅ Expert conversation layer (student can "talk" to the expert)

**Status:** Tickets exist

**Related Tickets:**
- PS-10: Expert conversation layer (chat with expert avatar)
- PS-27: Phase 2: Expert conversation layer (RAG chatbot)

**Gaps:** None identified

---

### 6. ✅ Fully localized seed content (Thai/English)

**Status:** ⚠️ Partial coverage — infrastructure tickets exist, i18n implementation missing

**Related Tickets:**
- PS-31: Build content localization workflow for expert contributors
- PS-39: [Content] Seed content schema for localization

**Missing (CREATED):**
- **PS-54: [i18n] Implement Thai/English localization system**
  - i18next + react-i18next setup
  - Language selector in settings
  - Thai translations for all UI strings

---

### 7. ✅ Social proof: "N students tried this path" + cohort comparison

**Status:** Tickets exist

**Related Tickets:**
- PS-7: Add social proof counters to seed cards
- PS-22: Build cohort comparison analytics for social proof
- PS-30: Define cohort segmentation logic for social proof
- PS-40: [Data] Cohort segmentation logic and definitions

**Gaps:** None identified

---

## Additional Gaps Identified

Beyond the 7 dream state features, analysis revealed 3 missing capabilities:

### 8. 🆕 Seed velocity tracking and Direction Finder readiness

**Problem:** No visibility into user progression toward Direction Finder milestone

**Created:**
- **PS-55: [Analytics] Track seed velocity and Direction Finder readiness**
  - Analytics events: seed_started, seed_completed, reflection_submitted
  - Readiness score (0-100)
  - Progress bar: "3/5 seeds to unlock Direction Finder"

---

### 9. 🆕 Offline-first seed content caching

**Problem:** Thai students may have spotty connectivity. Can't complete daily tasks offline.

**Created:**
- **PS-56: [ps_app] Build offline-first seed content caching**
  - Cache path content locally (expo-sqlite)
  - Pre-fetch next day's content on WiFi
  - Queue reflections offline, sync when online

---

### 10. 🆕 Profile reveal UI — show students what seeds taught them

**Problem:** Students complete seeds but don't see cumulative learning. No "aha moment."

**Created:**
- **PS-57: [Feature] Build profile reveal UI - show students what seeds taught them**
  - "Your Seed Journey" timeline
  - Skills gained per seed (auto-extracted from reflections)
  - Before/after comparison
  - Shareable milestone cards

---

## Summary

| Dream State Feature | Coverage | Tickets |
|---------------------|----------|---------|
| 1. Personalized seed queue | ✅ Complete | PS-4, PS-15, PS-16, PS-24, PS-45 |
| 2. AI PathLab generation | ✅ Complete | PS-9, PS-26, PS-51 |
| 3. Real ikigai from reflections | ✅ Complete | PS-13, PS-14, PS-25, PS-43, PS-44 |
| 4. Reflection trends → Direction Finder | ✅ Complete | PS-6, PS-28, PS-29, PS-52 |
| 5. Expert conversation layer | ✅ Complete | PS-10, PS-27 |
| 6. Full localization (Thai/English) | ⚠️ Partial | PS-31, PS-39 + **PS-54 (new)** |
| 7. Social proof + cohort comparison | ✅ Complete | PS-7, PS-22, PS-30, PS-40 |
| 8. Seed velocity tracking | 🆕 New | **PS-55 (new)** |
| 9. Offline-first caching | 🆕 New | **PS-56 (new)** |
| 10. Profile reveal UI | 🆕 New | **PS-57 (new)** |

**Total Active Tickets:** 54 (was 50, added 4)

---

## Next Steps

1. **Sprint Planning:** Review PS-54 through PS-57 for upcoming sprint
2. **Dependencies:** PS-54 blocks PS-31 (content workflow), prioritize i18n setup
3. **Quick Wins:** PS-56 (offline caching) can ship independently
4. **Foundation First:** PS-55 (velocity tracking) enables Direction Finder roadmap

---

## Methodology

Analysis performed by:
1. Pulled latest from GitHub (~/dev/ps_app)
2. Queried Linear GraphQL API for all PS team tickets
3. Compared against 12-month dream state from project documentation
4. Identified gaps in coverage
5. Created 4 new tickets to close gaps
6. Documented analysis in this file

**Linear Team:** PS (Passion Seed)  
**Team ID:** ace4cb8d-f6ff-435f-addb-7c72fe45dd48  
**API:** https://api.linear.app/graphql
