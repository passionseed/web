# Engineering Review: Google Drive Submission Analyzer POC

> Reviewer: Sisyphus | Date: 2026-04-25
> Plan: `/Users/bunyasit/dev/pseed/plans/gdrive-analyzer-poc-plan.md`
> Status: APPROVED with modifications (7 findings, 2 blocking)

---

## Executive Summary

The plan is **directionally correct** and well-scoped for a POC. The on-demand architecture eliminates polling complexity. The folder-based activity matching is pragmatic. However, there are **2 blocking issues** that must be resolved before implementation starts, and **5 non-blocking recommendations** that should be addressed during build.

---

## 🔴 BLOCKING Issues

### B1. Google Drive OAuth scope mismatch — plan assumes wrong auth model

**Issue**: The plan assumes OAuth 2.0 with refresh tokens for "each participant's own Drive." But the actual use case is admin-triggered analysis of **shared Drive folders** that students have submitted to. This is a different auth model entirely.

**Problem**: If students share folders with the admin, the admin doesn't need OAuth with refresh tokens from each student. The admin only needs:
- Their own Google account with access to the shared folders
- OR a service account with domain-wide delegation (if Workspace)
- OR the folders are publicly shared with "anyone with link"

**Current plan risk**: Over-engineering OAuth refresh token storage, encryption, rotation when none of it may be needed.

**Fix**: Clarify the sharing model. Most likely scenarios:
1. **Folders shared with admin** → Admin's own Google credentials (one-time OAuth, store refresh token)
2. **Public link folders** → No auth needed at all (use `drive.files.list` with API key or just public access)
3. **Workspace domain** → Service account with domain-wide delegation

**Recommendation**: Start with option 1 (admin OAuth) for the POC. Simpler, no domain-wide delegation setup. Store one refresh token, not N.

---

### B2. File-to-activity mapping is under-specified and likely fragile

**Issue**: The plan says "fuzzy match against activity title or slug" but doesn't specify:
- What happens when folder names don't match activity titles exactly?
- What happens when students use Thai folder names but activities have English slugs?
- What happens when a file is in the root folder, not an activity subfolder?
- What happens when multiple activities have similar names?

**Problem**: This is the most likely point of failure. If the matcher is wrong, the admin sees analysis for the wrong activity.

**Evidence from codebase**: `lib/hackathon/image-analysis.ts` already has activity lens data (`outcome`, `evidence`, `redFlag`) that the AI uses for grading. This same context should drive the matcher.

**Fix**: Add explicit matching strategy:
```python
# Matching priority (in order):
# 1. Exact slug match in folder path
# 2. Exact activity title match (case-insensitive)
# 3. Fuzzy match (Levenshtein distance < 3)
# 4. Keyword matching (activity keywords in folder name)
# 5. Fallback: "unmatched" bucket for manual review

# Confidence scoring:
# - exact: 1.0
# - fuzzy: 0.7-0.9
# - keyword: 0.5-0.7
# - unmatched: 0.0
```

Add a `match_confidence` field to the analysis result so the admin knows which matches are reliable.

---

## 🟡 NON-BLOCKING Recommendations

### R1. Token budget concern — AI analysis prompt may exceed limits

**Issue**: The plan sends all extracted text + transcripts + image descriptions into a single AI prompt per activity. For teams with many files, this could easily exceed model context windows.

**Example**: 5 PDFs × 10 pages × 500 words = 25,000 words. Plus 3 audio transcripts × 2,000 words = 6,000 words. Plus 10 image descriptions × 200 words = 2,000 words. Total: ~33,000 words. GPT-4 context window is 8K-128K depending on model. MiniMax VLM has its own limits.

**Fix**: Add chunking/summarization strategy:
```
Step 1: Summarize each document individually (extract key points)
Step 2: Summarize each transcript individually (extract key insights)
Step 3: Compile all summaries into final analysis prompt
```

This adds one API call per document but keeps the final prompt manageable.

**Effort**: +2 hours. Worth it for POC reliability.

---

### R2. Missing audio format support

**Issue**: The plan only lists MP3/WAV/WEBM for audio transcription. Students may also submit:
- M4A (iPhone voice memos — very common)
- FLAC
- OGG
- Video files with audio (MP4, MOV) that need audio extraction first

**Evidence from codebase**: `app/api/expert-interview/transcribe/route.ts` accepts "audio/webm" but doesn't document other formats.

**Fix**: Add format support matrix:
```python
SUPPORTED_AUDIO = ['mp3', 'wav', 'webm', 'm4a', 'flac', 'ogg']
VIDEO_WITH_AUDIO = ['mp4', 'mov', 'avi']  # Extract audio first with ffmpeg
```

For video files, use `ffmpeg -i input.mp4 -vn -acodec copy output.m4a` before sending to Whisper.

**Effort**: +1 hour. ffmpeg is likely already on Ubuntu.

---

### R3. No deduplication strategy

**Issue**: If admin runs analysis twice on the same folder, the plan doesn't specify what happens.

**Options**:
1. **Upsert** (replace old analysis) — simple, loses history
2. **Append** (create new record each time) — keeps history, may confuse admin
3. **Versioned** (update in place with version tracking) — best of both

**Recommendation**: Use upsert with `analyzed_at` timestamp. Admin always sees latest. If they want history, they can check `gdrive_analysis_results` table directly. Add `run_id` to track which analysis run produced which result.

**Effort**: +30 minutes.

---

### R4. Missing error handling for corrupted/malformed files

**Issue**: The plan doesn't address what happens when:
- PDF is password-protected
- DOCX is corrupted
- Audio file is silent or unreadable
- Image file is corrupted

**Fix**: Add try/catch per file with graceful degradation:
```python
for file in files:
    try:
        content = extract(file)
    except Exception as e:
        results[file.id] = {
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__
        }
        continue
```

Store failed files in the analysis result with error details so the admin knows what couldn't be processed.

**Effort**: +1 hour.

---

### R5. Supabase schema has missing fields for admin workflow

**Issue**: The `gdrive_analysis_results` table doesn't track:
- Which admin triggered the analysis
- Whether the admin has viewed the result
- Whether the admin agrees/disagrees with the AI assessment

**Fix**: Add fields:
```sql
ALTER TABLE public.gdrive_analysis_results ADD COLUMN IF NOT EXISTS
  triggered_by UUID REFERENCES auth.users(id),  -- admin who ran it
  viewed_at TIMESTAMPTZ,                          -- when admin first saw it
  admin_notes TEXT,                               -- admin's own notes
  admin_override JSONB;                           -- admin corrections to AI analysis
```

This makes the table actually useful for the admin grader workflow, not just a data dump.

**Effort**: +30 minutes.

---

## 🟢 What the plan gets right

1. **On-demand architecture** — eliminates polling complexity, cron jobs, state machines. Much simpler than the original agent design.

2. **Reusing existing AI infrastructure** — Groq Whisper and MiniMax VLM are already proven in the codebase. No new API providers to onboard.

3. **Folder-based activity matching** — pragmatic for a POC. Can be refined later.

4. **Separate analysis table** — doesn't pollute existing submission/review tables. Clean separation of concerns.

5. **Local file processing on Ubuntu server** — no Vercel timeout constraints. Can handle large files, long transcripts.

---

## 📊 Revised Effort Estimate

| Component | Original | Revised | Delta |
|---|---|---|---|
| Drive auth + scanner | 3h | 2h | -1h (simpler auth) |
| File downloaders | 4h | 4h | 0 |
| Audio transcription | 2h | 3h | +1h (video extraction, more formats) |
| Image analysis | 2h | 2h | 0 |
| Activity matcher | 3h | 4h | +1h (confidence scoring, fuzzy matching) |
| AI analysis engine | 4h | 6h | +2h (chunking, summarization) |
| Supabase integration | 2h | 2h | 0 |
| Admin API endpoint | 2h | 2h | 0 |
| Admin UI panel | 4h | 4h | 0 |
| Testing + refinement | 4h | 5h | +1h (error handling, edge cases) |
| **Total** | **30h** | **34h** | **+4h** |

---

## ✅ Go/No-Go Decision

**GO** — with the following conditions:

1. **Resolve B1 (auth model)** before writing code. Confirm: admin has access to shared folders, or do we need individual student OAuth?
2. **Implement B2 (activity matcher)** with confidence scoring. Don't skip this — it's the highest-risk component.
3. **Address R1 (token budget)** during build. The POC will hit context limits on real data without chunking.
4. **Add R2 (audio formats)** if students use iPhone voice memos (likely).

The rest (R3-R5) can be deferred to a v2 if the POC proves valuable.

---

## Suggested Implementation Order

1. **Day 1**: Drive auth + scanner (resolve B1 first)
2. **Day 2**: File extractors (PDF, DOCX, audio, image) with error handling (R4)
3. **Day 3**: Activity matcher with confidence scoring (B2)
4. **Day 4**: AI analysis engine with chunking (R1)
5. **Day 5**: Supabase integration + admin API endpoint
6. **Day 6**: Admin UI panel + testing

---

## Questions for the User

1. **B1 — Auth model**: Do students share their Drive folders with the admin account? Or do they send public links? This determines if we need OAuth at all.

2. **B2 — Folder naming**: What do the actual folder names look like? Are they in Thai or English? Do they match activity titles exactly?

3. **R2 — Audio**: Do students submit audio as iPhone voice memos (M4A) or something else?

Once these are answered, the plan is ready for implementation.
