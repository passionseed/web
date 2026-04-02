# File Upload System

## Overview

Participant work (file submissions) is stored in **Backblaze B2** cloud storage, not Supabase. After upload, the resulting file URLs are saved into the PostgreSQL database via Supabase.

## Storage Backend

**Provider:** Backblaze B2 (S3-compatible)
**Bucket:** `pseed-dev`
**Endpoint:** `s3.us-east-005.backblazeb2.com`

**Environment variables required:**
```
B2_APPLICATION_KEY_ID
B2_APPLICATION_KEY
B2_BUCKET_NAME
B2_ENDPOINT
```

**Implementation:** `lib/backblaze.ts`

## Storage Paths

| Purpose | Path |
|---------|------|
| Participant submissions | `submissions/{userId}/{nodeId}/{timestamp}_{random}.{ext}` |
| Map content files | `maps/{nodeId}/content/{timestamp}_{random}.{ext}` |
| Map cover images | `images/maps/{timestamp}_{fileName}` |

## Upload Flow

```
User selects file
       ↓
FileUpload component (components/ui/file-upload.tsx)
       ↓
POST /api/upload (or /api/upload/presigned for large files)
       ↓
requireUploadAccess() — validates user enrollment/role
       ↓
b2.uploadFile() — file stored in Backblaze B2
       ↓
URL returned to client
       ↓
createAssessmentSubmission() — URL saved to assessment_submissions.file_urls[]
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/upload` | Standard upload (≤40MB) |
| `POST /api/upload/presigned` | Presigned PUT URL for direct client→B2 upload |
| `POST /api/upload/chunk` | Chunked upload (3MB chunks) for large files |
| `POST /api/upload/stream` | Streaming upload |
| `POST /api/maps/upload-cover-image` | Map cover image with WebP conversion |

### Why multiple endpoints?

Vercel serverless functions have a 4MB body limit. The chunked and presigned endpoints work around this:
- **Presigned** — client uploads directly to B2, bypassing the server entirely
- **Chunked** — file split into 3MB chunks, reassembled server-side before sending to B2

## Database Storage

Uploaded file URLs are stored in `assessment_submissions.file_urls` (array of strings):

```sql
assessment_submissions
  ├── id: uuid
  ├── progress_id: uuid → student_node_progress
  ├── assessment_id: uuid → node_assessments
  ├── file_urls: text[]   ← array of B2 URLs
  ├── text_answer: text
  ├── image_url: text
  └── quiz_answers: jsonb
```

## Access Control

`lib/security/upload-access.ts` — `requireUploadAccess(nodeId)` checks that the uploading user is one of:

- Map creator (`learning_maps.creator_id`)
- Admin or instructor (`user_roles`)
- Map editor (`map_editors`)
- Enrolled participant (`user_map_enrollments`)

Returns 401 if unauthenticated, 403 if not authorized.

## File Constraints

| Limit | Value |
|-------|-------|
| Max file size | 40MB |
| Max image size | 10MB |
| Chunk size | 3MB |
| Concurrent uploads | 3 |
| Upload timeout | 5 minutes |
| Rate limit | 10 uploads/hour per user |

**Allowed types:** PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), images (JPEG, PNG, GIF, WebP, HEIC), text, ZIP, JSON, CSV

**Blocked extensions:** `.exe`, `.bat`, `.cmd`, `.scr`, `.vbs`, `.js`, `.msi`, `.app`, `.deb`, `.rpm`

## Key Files

| File | Role |
|------|------|
| `lib/backblaze.ts` | B2 S3 client (upload, delete) |
| `lib/storage/storage-manager.ts` | Image processing, WebP conversion, blurhash |
| `lib/security/upload-access.ts` | Access control validation |
| `lib/constants/upload.ts` | Size limits, allowed types |
| `app/api/upload/route.ts` | Main upload handler |
| `app/api/upload/presigned/route.ts` | Presigned URL generation |
| `app/api/upload/chunk/route.ts` | Chunked upload handler |
| `app/api/upload/stream/route.ts` | Streaming upload handler |
| `app/api/maps/upload-cover-image/route.ts` | Cover image upload |
| `components/ui/file-upload.tsx` | React upload component |
| `components/map/FileSubmissionViewer.tsx` | Submitted file display |
| `lib/supabase/assessment.ts` | `createAssessmentSubmission()` — saves URLs to DB |
