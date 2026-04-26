# Google Drive Submission Agent — Implementation Plan

> Status: Draft | Last updated: 2026-04-25
> Scope: Build a server-based agent that polls a Google Drive submission folder, downloads new files, extracts content (PDF/DOCX/audio/images), analyzes them with AI, and stores results in Supabase.

---

## 1. Context & Constraints

### What we know
- **Server**: Ubuntu (persistent compute — no timeout limits)
- **Drive ownership**: NOT ours. It's a student submission drive.
- **File types**: PDF, Word docs, text files, audio recordings, images, possibly PowerPoint
- **Result destination**: Supabase (existing hackathon submission/review tables)
- **Existing patterns**:
  - Audio transcription: Groq Whisper (`app/api/expert-interview/transcribe/route.ts`)
  - Image analysis: MiniMax VLM (`lib/hackathon/image-analysis.ts`)
  - AI grading: `lib/hackathon/ai-grader.ts` with `hackathon_submission_reviews` table
  - File storage: Backblaze B2 (`lib/backblaze.ts`)
  - Submission tables: `hackathon_phase_activity_submissions` (individual), `hackathon_phase_activity_team_submissions` (team)

### What this unlocks
Because we have a real server:
- ✅ No 60s timeout (unlike Vercel)
- ✅ Can run long downloads, batch transcribe, heavy AI analysis
- ✅ Can store OAuth refresh tokens securely on disk
- ✅ Can use systemd/cron for reliable scheduling
- ✅ Can cache files locally, process incrementally

---

## 2. Critical Open Question (BLOCKING)

**How do files in the Google Drive folder map to participants/teams in Supabase?**

This determines the entire architecture. We need ONE of these conventions:

| Option | How it works | Complexity |
|---|---|---|
| **A. Folder structure** | Drive has subfolders like `/Team-123/` or `/Participant-456/`. File name doesn't matter. | Low |
| **B. Filename convention** | Files named like `team_123_activity_456.pdf` or `participant_789_*.docx` | Medium |
| **C. Spreadsheet index** | A Google Sheet lists: `filename → participant_id → activity_id`. Agent reads the sheet first. | Medium |
| **D. Google Form integration** | Students submit via Google Form that dumps files in Drive + writes metadata to a Sheet. | Medium |
| **E. Manual mapping UI** | Admin drags files in web UI to match with participants. Agent only downloads. | High |

**→ Decision required before implementation.**

My recommendation: **Option A (folder structure)** or **Option B (filename convention)** — simplest and most robust. Option C if the drive is a flat dump with no organization.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UBUNTU SERVER                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐  │
│  │  Scheduler  │   │   OAuth     │   │   Drive     │   │   Analysis      │  │
│  │  (systemd   │──▶│  Refresh    │──▶│   Client    │──▶│   Pipeline      │  │
│  │   timer)    │   │   Token     │   │  (Python)   │   │   (Python)      │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘  │
│         │                                                    │               │
│         │              ┌─────────────────────────────────────┘               │
│         │              │                                                   │
│         ▼              ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         LOCAL STORAGE                                │   │
│  │  /opt/gdrive-agent/                                                  │   │
│  │    ├── downloads/          # Raw files from Drive                    │   │
│  │    ├── extracted/          # Text extracts, transcripts              │   │
│  │    ├── state/              # Sync cursor, processed file IDs         │   │
│  │    └── logs/               # Application logs                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 SUPABASE                                     │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
│  │ gdrive_sync_jobs       │  │ hackathon_phase_activ..│  │ hackathon_s..│  │
│  │ (new: tracks sync)     │  │ (existing: submission) │  │ (existing:   │  │
│  │                        │  │                        │  │   reviews)   │  │
│  └────────────────────────┘  └────────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. File Structure (on Ubuntu server)

```
/opt/gdrive-agent/
├── .env                          # Secrets (not in git)
├── requirements.txt              # Python deps
├── main.py                       # Entry point: orchestrates full pipeline
├── config.py                     # Settings, env var loading
├── auth/
│   ├── __init__.py
│   ├── google_oauth.py           # Refresh token management
│   └── token_storage.py          # Secure token storage (encrypted at rest)
├── drive/
│   ├── __init__.py
│   ├── client.py                 # Google Drive API wrapper
│   ├── list_files.py             # Folder listing with filters
│   ├── download.py               # File download + export
│   └── sync_state.py             # Incremental sync tracking
├── extractors/
│   ├── __init__.py
│   ├── pdf.py                    # PyMuPDF / pdfplumber text extract
│   ├── docx.py                   # python-docx text extract
│   ├── pptx.py                   # python-pptx text extract
│   ├── plain_text.py             # .txt, .csv, .json direct read
│   ├── image.py                  # MiniMax VLM analysis
│   └── audio.py                  # Groq Whisper transcription
├── analysis/
│   ├── __init__.py
│   ├── ai_grader.py              # Reuse hackathon grading logic
│   ├── text_analyzer.py          # Summarize, extract key points
│   └── submission_builder.py     # Build submission record from analysis
├── supabase_client/
│   ├── __init__.py
│   └── client.py                 # Supabase Python client (supabase-py)
├── storage/
│   ├── __init__.py
│   └── local_cache.py            # Download cache management
├── utils/
│   ├── __init__.py
│   ├── logger.py                 # Structured logging
│   └── retry.py                  # Exponential backoff for API calls
├── tests/
│   └── ...
├── scripts/
│   ├── install.sh                # One-command setup
│   └── run.sh                    # Wrapper for manual runs
└── systemd/
    ├── gdrive-agent.service      # systemd service definition
    └── gdrive-agent.timer        # systemd timer (every 15 min)
```

---

## 5. Authentication (OAuth 2.0 Refresh Token Flow)

Since we don't own the Drive domain, we use **OAuth 2.0 with offline access**:

### One-time setup flow
```
1. Admin runs: python auth_setup.py
2. Opens browser to Google OAuth consent screen
3. Grants access to Drive folder
4. App receives authorization code
5. Exchanges code for: access_token + refresh_token
6. Stores refresh_token encrypted in /opt/gdrive-agent/.refresh_token
```

### Runtime flow
```python
# google_oauth.py
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

def get_drive_credentials():
    creds = Credentials.from_authorized_user_file(
        'state/token.json',
        scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds
```

### Security
- Refresh token stored encrypted (Fernet from `cryptography` library)
- Encryption key in `.env` (not committed)
- Token file has `chmod 600`
- `.env` has `chmod 600`

---

## 6. Pipeline Stages (Detailed)

### Stage 1: Poll Drive for new files

```python
# drive/list_files.py
from googleapiclient.discovery import build

def list_new_files(drive_service, folder_id, last_sync_time):
    """List files modified since last sync."""
    query = f"'{folder_id}' in parents and trashed = false"
    if last_sync_time:
        query += f" and modifiedTime > '{last_sync_time}'"
    
    results = []
    page_token = None
    while True:
        response = drive_service.files().list(
            q=query,
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)",
            pageToken=page_token
        ).execute()
        results.extend(response.get('files', []))
        page_token = response.get('nextPageToken')
        if not page_token:
            break
    return results
```

**File type routing**:

| MIME Type | Action | Extractor |
|---|---|---|
| `application/pdf` | Download binary | `extractors/pdf.py` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Download binary | `extractors/docx.py` |
| `application/vnd.openxmlformats-officedocument.presentationml.presentation` | Download binary | `extractors/pptx.py` |
| `text/plain`, `text/csv`, `application/json` | Download text | `extractors/plain_text.py` |
| `audio/mpeg`, `audio/wav`, `audio/webm` | Download binary | `extractors/audio.py` |
| `image/jpeg`, `image/png`, `image/webp` | Download binary | `extractors/image.py` |
| Google Docs | Export to PDF → extract | `drive/download.py` → `extractors/pdf.py` |
| Google Sheets | Export to CSV → parse | `drive/download.py` → `extractors/plain_text.py` |
| Google Slides | Export to PDF → extract | `drive/download.py` → `extractors/pdf.py` |

### Stage 2: Download

```python
# drive/download.py
def download_file(drive_service, file_id, mime_type, destination_path):
    """Download or export a file from Drive."""
    if mime_type.startswith('application/vnd.google-apps.'):
        # Google Workspace file — export to a usable format
        export_mime = get_export_mime_type(mime_type)
        request = drive_service.files().export_media(fileId=file_id, mimeType=export_mime)
    else:
        # Binary file — direct download
        request = drive_service.files().get_media(fileId=file_id)
    
    with open(destination_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}%")
```

### Stage 3: Extract Content

**PDF** (`extractors/pdf.py`):
```python
import fitz  # PyMuPDF

def extract_pdf_text(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text
```

**DOCX** (`extractors/docx.py`):
```python
from docx import Document

def extract_docx_text(path):
    doc = Document(path)
    return "\n".join([para.text for para in doc.paragraphs])
```

**Audio** (`extractors/audio.py`):
```python
from groq import Groq

def transcribe_audio(file_path, language="en"):
    client = Groq(api_key=os.environ['GROQ_API_KEY'])
    with open(file_path, 'rb') as f:
        transcription = client.audio.transcriptions.create(
            file=f,
            model="whisper-large-v3",
            language=language,
            response_format="json"
        )
    return transcription.text
```
> Reuses exact same pattern as `app/api/expert-interview/transcribe/route.ts`

**Image** (`extractors/image.py`):
```python
# Reuse MiniMax VLM via HTTP API
# Same endpoint as lib/hackathon/image-analysis.ts

def analyze_image(image_path, activity_lens=None):
    # Convert to base64 data URL
    # POST to MiniMax VLM endpoint
    # Return analysis text
    pass
```

### Stage 4: AI Analysis

After extracting text/transcript from all files in a submission:

```python
# analysis/ai_grader.py
from openai import OpenAI

def analyze_submission(extracted_text, activity_context):
    """
    Reuses the same grading logic as lib/hackathon/ai-grader.ts
    but implemented in Python for server-side execution.
    """
    client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
    
    prompt = build_grading_prompt(extracted_text, activity_context)
    
    response = client.chat.completions.create(
        model="gpt-5-mini-2025-08-07",  # Or use model fallback chain
        temperature=0.2,
        messages=[
            {"role": "system", "content": "You are an expert grader..."},
            {"role": "user", "content": prompt}
        ]
    )
    
    return parse_grading_response(response.choices[0].message.content)
```

### Stage 5: Store in Supabase

```python
# supabase_client/client.py
from supabase import create_client

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_ROLE_KEY']
)

def store_submission(participant_id, activity_id, assessment_id, file_urls, text_answer):
    """Insert or update submission record."""
    result = supabase.table('hackathon_phase_activity_submissions').upsert({
        'participant_id': participant_id,
        'activity_id': activity_id,
        'assessment_id': assessment_id,
        'text_answer': text_answer,
        'file_urls': file_urls,
        'status': 'submitted',
        'submitted_at': 'now()'
    }, on_conflict='participant_id,activity_id').execute()
    return result

def store_review(submission_id, analysis_result):
    """Store AI analysis as a review draft."""
    result = supabase.table('hackathon_submission_reviews').upsert({
        'individual_submission_id': submission_id,
        'review_status': 'pending_review',
        'ai_draft': analysis_result,
        'ai_draft_generated_at': 'now()',
        'ai_draft_model': 'gpt-5-mini',
        'ai_draft_source': 'gdrive_sync'
    }, on_conflict='individual_submission_id').execute()
    return result
```

---

## 7. New Supabase Schema

### Table: `gdrive_sync_jobs` (NEW)

Tracks the agent's sync state and processed files.

```sql
CREATE TABLE public.gdrive_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'incremental' CHECK (job_type IN ('incremental', 'full', 'retry')),
  
  -- Drive location
  drive_folder_id TEXT NOT NULL,
  drive_folder_name TEXT,
  
  -- Sync state
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_sync_time TIMESTAMPTZ,  -- For incremental: only files modified after this
  
  -- Statistics
  files_found INTEGER NOT NULL DEFAULT 0,
  files_downloaded INTEGER NOT NULL DEFAULT 0,
  files_processed INTEGER NOT NULL DEFAULT 0,
  files_failed INTEGER NOT NULL DEFAULT 0,
  submissions_created INTEGER NOT NULL DEFAULT 0,
  
  -- Error tracking
  error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gdrive_sync_jobs_status ON public.gdrive_sync_jobs(status);
CREATE INDEX idx_gdrive_sync_jobs_folder ON public.gdrive_sync_jobs(drive_folder_id);
```

### Table: `gdrive_sync_file_log` (NEW)

Tracks which Drive files have been processed (prevents re-processing).

```sql
CREATE TABLE public.gdrive_sync_file_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_file_name TEXT NOT NULL,
  drive_mime_type TEXT,
  drive_modified_time TIMESTAMPTZ,
  
  -- Mapping result
  participant_id UUID REFERENCES public.hackathon_participants(id),
  team_id UUID REFERENCES public.hackathon_teams(id),
  activity_id UUID REFERENCES public.hackathon_phase_activities(id),
  
  -- Processing result
  submission_id UUID REFERENCES public.hackathon_phase_activity_submissions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'extracted', 'analyzed', 'failed', 'skipped')),
  error TEXT,
  
  -- File metadata
  local_path TEXT,
  file_size_bytes INTEGER,
  extracted_text TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_gdrive_file_log_drive_id ON public.gdrive_sync_file_log(drive_file_id);
CREATE INDEX idx_gdrive_file_log_status ON public.gdrive_sync_file_log(status);
CREATE INDEX idx_gdrive_file_log_participant ON public.gdrive_sync_file_log(participant_id);
CREATE INDEX idx_gdrive_file_log_activity ON public.gdrive_sync_file_log(activity_id);
```

---

## 8. Scheduling

### Option A: systemd timer (recommended)

Run every 15 minutes during active hackathon periods:

```ini
# /etc/systemd/system/gdrive-agent.timer
[Unit]
Description=Google Drive Submission Agent Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/gdrive-agent.service
[Unit]
Description=Google Drive Submission Agent
After=network.target

[Service]
Type=oneshot
User=gdrive-agent
WorkingDirectory=/opt/gdrive-agent
ExecStart=/opt/gdrive-agent/venv/bin/python main.py --mode=incremental
Environment=PYTHONPATH=/opt/gdrive-agent
Restart=on-failure
StandardOutput=append:/var/log/gdrive-agent/agent.log
StandardError=append:/var/log/gdrive-agent/agent.error.log
```

### Option B: Manual trigger

Admin triggers via SSH or webhook:
```bash
ssh server "cd /opt/gdrive-agent && python main.py --mode=full"
```

---

## 9. Environment Variables

```bash
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=encrypted_refresh_token

# Drive folder to watch
GOOGLE_DRIVE_FOLDER_ID=1ABC123...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs (reuse existing keys from the app)
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
MINIMAX_API_KEY=your_minimax_key

# Encryption (for token storage)
TOKEN_ENCRYPTION_KEY=your_fernet_key

# Optional: Model preference
DEFAULT_AI_MODEL=gpt-5-mini-2025-08-07
```

---

## 10. Installation Steps (Server)

```bash
# 1. Create user
sudo useradd -r -s /bin/false gdrive-agent

# 2. Create directories
sudo mkdir -p /opt/gdrive-agent
sudo mkdir -p /var/log/gdrive-agent
sudo chown gdrive-agent:gdrive-agent /opt/gdrive-agent
sudo chown gdrive-agent:gdrive-agent /var/log/gdrive-agent

# 3. Clone repo (or scp files)
cd /opt/gdrive-agent
# ... copy files ...

# 4. Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Create .env file
nano .env  # Add all env vars
chmod 600 .env

# 6. Authenticate with Google
python auth_setup.py
# (Follow prompts to authorize Drive access)

# 7. Test run
python main.py --mode=incremental --dry-run

# 8. Install systemd service
sudo cp systemd/gdrive-agent.service /etc/systemd/system/
sudo cp systemd/gdrive-agent.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gdrive-agent.timer
sudo systemctl start gdrive-agent.timer

# 9. Monitor
sudo journalctl -u gdrive-agent.service -f
tail -f /var/log/gdrive-agent/agent.log
```

---

## 11. Python Requirements

```txt
# requirements.txt
# Google Drive API
google-api-python-client>=2.100.0
google-auth-httplib2>=0.1.1
google-auth-oauthlib>=1.0.0

# Document extraction
PyMuPDF>=1.23.0          # PDF text + image extraction
python-docx>=0.8.11      # Word docs
python-pptx>=0.6.21      # PowerPoint

# Audio
# (Groq SDK is used directly via API, no special deps needed)
requests>=2.31.0

# Supabase
supabase>=2.0.0

# Utilities
python-dotenv>=1.0.0
cryptography>=41.0.0     # For token encryption
tenacity>=8.2.0          # Retry logic
structlog>=23.0.0        # Structured logging

# Optional: for local testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
```

---

## 12. Error Handling & Recovery

| Scenario | Handling |
|---|---|
| **Drive API rate limit (429)** | Exponential backoff (1s → 2s → 4s → 8s → max 60s) |
| **Download interrupted** | Resume using HTTP Range requests or re-download |
| **File too large** | Skip + log warning; notify admin |
| **Extraction fails (corrupted PDF)** | Mark as failed in `gdrive_sync_file_log`; continue with other files |
| **AI API down** | Retry with fallback model (same chain as direction finder); queue for retry |
| **Supabase connection lost** | Retry 3x with backoff; exit non-zero so systemd restarts |
| **Unknown file type** | Skip + log; admin can add handler later |

---

## 13. Monitoring

### Logs
- `/var/log/gdrive-agent/agent.log` — structured JSON logs
- `/var/log/gdrive-agent/agent.error.log` — errors only

### Metrics (logged per run)
- Files found / downloaded / processed / failed
- Submissions created / updated
- Average processing time per file
- AI API usage (tokens, cost)

### Alerting (optional)
- If `files_failed > 5` in a run → send notification to admin
- If no sync in > 1 hour (during active period) → alert
- If disk usage > 80% → alert

---

## 14. Security Checklist

- [ ] `.env` file has `chmod 600`
- [ ] Refresh token encrypted at rest
- [ ] Service account uses `drive.readonly` scope (minimum)
- [ ] Server firewall restricts access (only admin SSH)
- [ ] Logs don't contain file content or PII
- [ ] Downloaded files deleted after processing (configurable retention)
- [ ] Supabase uses Service Role Key (not Anon Key)

---

## 15. Open Questions (Need Your Input)

### BLOCKING
1. **How do Drive files map to participants/teams?**
   - Folder structure (`/Team-123/`)?
   - Filename convention (`team_123_activity_456.pdf`)?
   - Spreadsheet index?
   - Something else?

2. **Who grants Drive access?**
   - You (admin) — one-time OAuth
   - Each participant — not practical for this use case

3. **Which Google Drive folder(s)?**
   - Single folder with subfolders?
   - Multiple folders (one per activity)?

### NON-BLOCKING
4. **How often should it sync?**
   - Every 15 minutes?
   - Every hour?
   - On-demand only?

5. **What happens to files after processing?**
   - Delete from server immediately?
   - Keep for 24h then delete?
   - Archive to B2?

6. **Should the agent also trigger AI grading immediately?**
   - Yes — auto-create review drafts
   - No — just store submissions, let existing grader handle it

7. **Audio language?**
   - Primarily Thai (use `language="th"` for Whisper)?
   - Mixed (auto-detect)?

---

## 16. Estimated Effort

| Component | Hours | Notes |
|---|---|---|
| OAuth + token management | 3 | One-time setup, secure storage |
| Drive client (list, download, export) | 4 | Handle all file types, pagination |
| Extractors (PDF, DOCX, audio, image) | 6 | Reuse existing AI patterns |
| Analysis pipeline | 4 | Port grading logic to Python |
| Supabase integration | 3 | Upsert submissions + reviews |
| Sync state + incremental logic | 4 | Prevent re-processing |
| Deployment (systemd, logs, monitoring) | 3 | Production-ready setup |
| Testing + error handling | 4 | Edge cases, retries, recovery |
| **Total** | **~31 hours** | **~4 dev days** |

---

## 17. Next Steps

1. **You answer the blocking questions** (especially file-to-participant mapping)
2. **I refine this plan** with specific decisions
3. **I generate the implementation** — either as a separate repo or a `services/gdrive-agent/` folder in this repo
4. **You provision the server** with the install script
5. **We test end-to-end** with a small Drive folder

Ready when you are.
