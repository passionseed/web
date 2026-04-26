# Google Drive Submission Analyzer — POC Plan

> Status: Draft | Last updated: 2026-04-25
> Scope: POC — On-demand agent that analyzes a team's Google Drive folder and generates insights to help admin grade submissions

---

## 1. Problem Statement

Admin needs to grade hackathon submissions. Students submitted files to their individual/team Google Drives. The admin needs:
- A summary of what the team actually did
- Evidence of "Interview Real Humans" (field research)
- All extracted content (text, transcripts, image descriptions) in one place
- Cross-referenced with existing submission records

**Current pain point**: Admin has to manually open each Drive file, read/watch/listen, and compile grading notes. This is slow and inconsistent.

**POC Goal**: Given a Drive folder link + team's submission data, automatically extract and analyze everything, producing a structured report for the admin grader.

---

## 2. POC Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN TRIGGERS ANALYSIS                            │
│                                                                              │
│  Inputs:                                                                     │
│  1. Google Drive folder URL (e.g., https://drive.google.com/drive/folders/xxx)
│  2. Team ID / Participant IDs                                                │
│  3. Activity IDs (optional — analyze all or specific activities)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UBUNTU SERVER (POC)                               │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  Drive       │   │  Content     │   │  Activity    │   │  Analysis    │  │
│  │  Scanner     │──▶│  Extractors  │──▶│  Matcher     │──▶│  Engine      │  │
│  │  (list &     │   │  (PDF/DOCX/  │   │  (map files  │   │  (AI grading │  │
│  │   download)  │   │   audio/img) │   │   to activ)  │   │   insights)  │  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘  │
│         │                                                    │               │
│         │              ┌─────────────────────────────────────┘               │
│         │              │                                                   │
│         ▼              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         OUTPUT: Analysis Report                      │   │
│  │                                                                      │   │
│  │  Stored in Supabase: gdrive_analysis_results                         │   │
│  │  ─────────────────────────────────────────────                       │   │
│  │  activity_id: "interview-real-humans"                                │   │
│  │  extracted_content: {                                                │   │
│  │    "transcript": "We interviewed 5 students...",                     │   │
│  │    "images": ["Photo of interview setup", "Whiteboard notes"],       │   │
│  │    "documents": ["Interview guide", "Raw notes"]                     │   │
│  │  }                                                                   │   │
│  │  ai_summary: "Team interviewed 5 users from target demographic..."   │   │
│  │  evidence_quality: "strong"                                          │   │
│  │  gaps: ["Missing photos of actual interviews", "No synthesis doc"]   │   │
│  │  confidence: "high"                                                  │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. POC Flow

### Step 1: Admin triggers analysis

```bash
# CLI trigger (for POC)
python analyze_drive.py \
  --drive-folder "https://drive.google.com/drive/folders/1ABC123" \
  --team-id "team-uuid-123" \
  --activity-ids "act-1,act-2,act-3"
```

Or via API endpoint (for integration with admin UI):
```bash
POST /api/admin/analyze-drive
{
  "driveFolderUrl": "https://drive.google.com/drive/folders/1ABC123",
  "teamId": "team-uuid-123",
  "activityIds": ["act-1", "act-2"]
}
```

### Step 2: Fetch team's submission data from Supabase

```python
# Get existing submissions for this team
submissions = supabase.table('hackathon_phase_activity_team_submissions') \
    .select('*') \
    .eq('team_id', team_id) \
    .execute()

# Get team info
team = supabase.table('hackathon_teams') \
    .select('*, members:hackathon_team_members(*)') \
    .eq('id', team_id) \
    .single() \
    .execute()
```

### Step 3: Scan Drive folder

```python
# Extract folder ID from URL
folder_id = extract_folder_id_from_url(drive_folder_url)

# List all files recursively
files = drive_service.files().list(
    q=f"'{folder_id}' in parents and trashed = false",
    fields="files(id, name, mimeType, modifiedTime, size, webViewLink, parents)",
    pageSize=100
).execute()
```

**Expected folder structure**:
```
/Team-A/
  /Phase-1-Understand/
    /Activity-1-Interview-Real-Humans/
      interview-guide.pdf
      recording-1.mp3
      photo-1.jpg
      raw-notes.docx
    /Activity-2-Map-the-System/
      system-map.png
      research-summary.pdf
  /Phase-2-Define/
    /Activity-3-Problem-Statement/
      problem-statement.docx
```

### Step 4: Extract content from each file

| File Type | Extraction Method | Output |
|---|---|---|
| PDF | PyMuPDF → text | Full text content |
| DOCX | python-docx → text | Full text content |
| PPTX | python-pptx → text | Slide text + notes |
| TXT/CSV/JSON | Direct read | Raw content |
| MP3/WAV/WEBM | Groq Whisper API | Transcript text |
| JPG/PNG/WEBP | MiniMax VLM API | Image description |
| Google Docs | Export to PDF → extract | Text content |
| Google Sheets | Export to CSV → parse | Structured data |

### Step 5: Match files to activities

```python
# Map files to activities based on folder path + filename
for file in files:
    activity = match_file_to_activity(file, activity_list)
    # e.g., file in "/Activity-1-Interview-Real-Humans/" → activity_id="act-1"
```

### Step 6: Generate analysis per activity

```python
# For each activity with files:
activity_analysis = {
    "activity_id": "act-1",
    "activity_title": "Interview Real Humans",
    
    # Extracted raw content
    "extracted_content": {
        "text_documents": ["full text of PDFs/DOCXs"],
        "transcripts": ["transcript of audio files"],
        "image_descriptions": ["description of each image"],
    },
    
    # AI-generated insights
    "ai_summary": "Team interviewed 5 users from their target demographic...",
    "evidence_quality": "strong",  # strong / moderate / weak
    "confidence": "high",  # high / medium / low
    
    # Gaps and red flags
    "gaps": [
        "Missing photos of actual interviews",
        "No synthesis document — only raw notes"
    ],
    "red_flags": [],
    
    # Evidence summary
    "evidence_summary": {
        "interviews_conducted": 5,
        "photos": 3,
        "audio_recordings": 2,
        "documents": 4,
    },
    
    # File list
    "files_analyzed": [
        {"name": "interview-guide.pdf", "type": "pdf", "size": "120KB"},
        {"name": "recording-1.mp3", "type": "audio", "duration": "12:34"},
    ]
}
```

### Step 7: Store results in Supabase

```sql
-- New table for POC (can be merged into existing review system later)
CREATE TABLE public.gdrive_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  
  -- Source
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT,
  
  -- Analysis content
  extracted_content JSONB NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  evidence_quality TEXT CHECK (evidence_quality IN ('strong', 'moderate', 'weak', 'none')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  gaps TEXT[],
  red_flags TEXT[],
  evidence_summary JSONB,
  
  -- Metadata
  files_analyzed JSONB,
  total_files INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- For admin grader
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'viewed', 'archived'))
);

CREATE INDEX idx_gdrive_analysis_team ON public.gdrive_analysis_results(team_id);
CREATE INDEX idx_gdrive_analysis_activity ON public.gdrive_analysis_results(activity_id);
```

---

## 4. File Structure (POC)

```
/opt/gdrive-analyzer/
├── .env                          # Secrets
├── requirements.txt              # Python deps
├── analyze_drive.py              # Main entry point
├── config.py                     # Settings
├── auth/
│   ├── __init__.py
│   └── google_oauth.py           # OAuth + token refresh
├── drive/
│   ├── __init__.py
│   ├── client.py                 # Drive API wrapper
│   ├── scanner.py                # List files in folder
│   └── downloader.py             # Download/export files
├── extractors/
│   ├── __init__.py
│   ├── pdf.py                    # PyMuPDF
│   ├── docx.py                   # python-docx
│   ├── audio.py                  # Groq Whisper
│   ├── image.py                  # MiniMax VLM
│   └── plain_text.py             # TXT, CSV, JSON
├── analysis/
│   ├── __init__.py
│   ├── activity_matcher.py       # Map files → activities
│   └── insight_generator.py      # AI analysis per activity
├── supabase_client/
│   ├── __init__.py
│   └── client.py                 # supabase-py client
├── models/
│   └── schemas.py                # Pydantic models
└── utils/
    ├── __init__.py
    ├── logger.py                 # Structured logging
    └── retry.py                  # Exponential backoff
```

---

## 5. Key Design Decisions

### On-demand only (no polling)
- Admin runs the script when they want to grade a team
- No systemd timer, no cron
- Can be triggered via CLI or API endpoint

### Folder → Activity mapping
```
/Phase-1-Understand/Activity-1-Interview-Real-Humans/
  ├── interview-guide.pdf
  ├── recording-1.mp3
  └── notes.docx
```
→ Maps to `activity_id` for "Interview Real Humans"

### Activity matching strategy
1. Parse folder path segments
2. Fuzzy match against `hackathon_phase_activities.title` or `slug`
3. If ambiguous, include all files in "unmatched" bucket for manual review

### Content extraction strategy
- **PDF/DOCX**: Extract full text (up to 50KB to avoid token limits)
- **Audio**: Transcribe with Groq Whisper (same as your app)
- **Images**: Analyze with MiniMax VLM (same as your app)
- **Spreadsheets**: Export to CSV, parse structured data

### AI analysis prompt (per activity)
```
You are evaluating a student team's hackathon submission.

Activity: {activity_title}
Learning Goal: {activity_outcome}
Evidence Required: {activity_evidence}

Extracted Content:
{extracted_text}

Transcripts:
{transcripts}

Image Descriptions:
{image_descriptions}

Analyze the team's work and provide:
1. Summary of what they did (2-3 sentences)
2. Evidence quality (strong/moderate/weak/none)
3. Specific evidence found
4. Gaps or missing elements
5. Confidence level (high/medium/low)
```

---

## 6. Supabase Schema Changes

### New Table: `gdrive_analysis_results`

Stores the analysis output per activity per team.

```sql
CREATE TABLE public.gdrive_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  
  -- Source tracking
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT,
  
  -- Extracted raw content
  extracted_content JSONB NOT NULL DEFAULT '{}',
  
  -- AI-generated analysis
  ai_summary TEXT,
  evidence_quality TEXT CHECK (evidence_quality IN ('strong', 'moderate', 'weak', 'none')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  gaps TEXT[],
  red_flags TEXT[],
  evidence_summary JSONB,
  
  -- File inventory
  files_analyzed JSONB,
  total_files INTEGER DEFAULT 0,
  
  -- Admin workflow
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'viewed', 'archived')),
  
  -- Timestamps
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_gdrive_analysis_team ON public.gdrive_analysis_results(team_id);
CREATE INDEX idx_gdrive_analysis_activity ON public.gdrive_analysis_results(activity_id);
CREATE INDEX idx_gdrive_analysis_status ON public.gdrive_analysis_results(status);

-- RLS
ALTER TABLE public.gdrive_analysis_results ENABLE ROW LEVEL SECURITY;

-- Admins can see all
CREATE POLICY "Admins can view all analysis"
  ON public.gdrive_analysis_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  ));
```

---

## 7. API Endpoint (for Admin UI integration)

```typescript
// app/api/admin/hackathon/analyze-drive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  // ... check admin role ...
  
  const body = await request.json();
  const { driveFolderUrl, teamId, activityIds } = body;
  
  // Trigger the analyzer (via HTTP call to server, or queue job)
  // For POC: could be a simple HTTP call to the Ubuntu server
  
  return NextResponse.json({ 
    jobId: "...", 
    status: "started",
    message: "Analysis started. Check back in a few minutes."
  });
}
```

---

## 8. POC Success Criteria

| # | Criteria | How to verify |
|---|---|---|
| 1 | Can list all files in a Drive folder | Run scanner, check file count matches |
| 2 | Can download and extract text from PDF | Run extractor, verify text content |
| 3 | Can transcribe audio | Run audio extractor, verify transcript quality |
| 4 | Can analyze images | Run image extractor, verify descriptions |
| 5 | Can match files to activities | Check activity assignment accuracy |
| 6 | Can generate useful AI summary | Admin reviews and confirms helpful |
| 7 | Results stored in Supabase | Query `gdrive_analysis_results` table |
| 8 | Admin can view in grader UI | New panel in admin submissions page |

---

## 9. Effort Estimate (POC)

| Component | Hours |
|---|---|
| Drive auth + scanner | 3 |
| File downloaders (PDF, DOCX, Google Docs/Sheets) | 4 |
| Audio transcription (Groq Whisper) | 2 |
| Image analysis (MiniMax VLM) | 2 |
| Activity matcher | 3 |
| AI analysis engine | 4 |
| Supabase integration | 2 |
| Admin API endpoint | 2 |
| Admin UI panel | 4 |
| Testing + refinement | 4 |
| **Total** | **~30 hours** |

---

## 10. Next Steps

1. **Confirm this POC scope** — does this match what you need?
2. **Provide a sample Drive folder** — I'll test the scanner against it
3. **I'll build the POC** — starting with Drive auth + file scanner
4. **Test with real data** — run against a team's actual Drive
5. **Iterate** — refine based on admin feedback

Ready to start building?
