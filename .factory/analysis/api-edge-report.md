# API Edge Migration Analysis

## Edge-Safe Routes (convert to `export const runtime = "edge"`)

These routes do pure Supabase reads/writes without any Node.js-specific APIs, file processing, AI calls, or large payloads. They can safely run on Edge.

| Route | Methods | Reasoning |
|-------|---------|-----------|
| `app/api/version/` | GET | Returns env vars + timestamp, no external deps |
| `app/api/user/next-nodes/` | GET | Supabase read-only, small response (≤5 items) |
| `app/api/hero-galaxy/` | GET | Supabase read with in-memory math transforms |
| `app/api/app-data/` | GET | Supabase reads, already uses `Cache-Control` header |
| `app/api/check-node/` | GET | Supabase single-row lookup via debug guard |
| `app/api/pre-questionnaire/` | GET, POST | Supabase read/write, small JSON body |
| `app/api/maps/route.ts` | GET | Supabase read, small response |
| `app/api/maps/list/` | GET | Supabase paginated read, already uses `Cache-Control` |
| `app/api/maps/[id]/route.ts` | GET | Supabase single-map read |
| `app/api/maps/[id]/enroll/` | POST | Supabase insert, small body |
| `app/api/maps/[id]/enrollment/` | GET | Supabase read |
| `app/api/maps/[id]/progress/` | GET | Supabase aggregated read |
| `app/api/maps/[id]/nodes/` | GET | Supabase read |
| `app/api/classrooms/route.ts` | GET | Supabase aggregated reads (memberships + counts) |
| `app/api/classrooms/join/` | POST | Supabase insert, small body |
| `app/api/classrooms/[id]/route.ts` | GET | Supabase single-row read |
| `app/api/classrooms/[id]/stats/` | GET | Supabase aggregated reads |
| `app/api/classrooms/[id]/teams/` | GET, POST | Supabase read/write teams |
| `app/api/classrooms/[id]/students/` | GET | Supabase read |
| `app/api/classrooms/[id]/assignments/` | GET | Supabase read |
| `app/api/classrooms/[id]/settings/` | GET | Supabase read |
| `app/api/classrooms/[id]/teams/[teamId]/route.ts` | GET, PUT, DELETE | Supabase CRUD on teams |
| `app/api/classrooms/[id]/teams/unassigned/` | GET | Supabase filtered read |
| `app/api/classrooms/[id]/regenerate-code/` | POST | Supabase update, small mutation |
| `app/api/classrooms/[id]/grading/` | GET, POST | Supabase grading CRUD |
| `app/api/classrooms/[id]/grading/group-members/` | GET, POST | Supabase group grading |
| `app/api/classrooms/[id]/grading/bulk/` | POST | Supabase bulk update |
| `app/api/classrooms/[id]/group-grading/` | GET | Supabase read |
| `app/api/classrooms/[id]/debug-groups/` | GET, POST | Debug routes, Supabase operations |
| `app/api/classrooms/[id]/maps/[mapId]/fork-to-team/` | POST | Supabase clone operation |
| `app/api/assignments/route.ts` | GET, POST, PUT, DELETE | Supabase CRUD, no large payloads |
| `app/api/assignments/[id]/nodes/` | GET | Supabase read |
| `app/api/assignments/[id]/progress/` | GET | Supabase aggregated read |
| `app/api/assignments/[id]/enrollments/` | GET | Supabase read |
| `app/api/assignments/[id]/enroll/` | POST | Supabase insert |
| `app/api/profile/dashboard/` | GET | Supabase aggregated reads (many parallel queries) |
| `app/api/tcas/projection/` | GET | Supabase read with in-memory normalization |
| `app/api/tcas/categories/` | GET | Supabase read |
| `app/api/pathlab/library/` | GET, POST | Supabase CRUD activity templates |
| `app/api/pathlab/npc-conversations/[conversationId]/route.ts` | GET | Supabase read with relational join |
| `app/api/pathlab/npc-conversations/choice/` | POST | Supabase insert (choice selection) |
| `app/api/pathlab/npc-conversations/progress/[progressId]/` | GET | Supabase read |
| `app/api/pathlab/activities/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/days/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/assessments/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/content/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/preview/` | GET | Supabase read |
| `app/api/pathlab/reports/` | GET | Supabase aggregated read |
| `app/api/pathlab/pages/[id]/activities/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/paths/[pathId]/days/` | GET, POST | Supabase CRUD |
| `app/api/pathlab/paths/[pathId]/days/[dayNumber]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/pathlab/paths/[pathId]/export/` | GET | Supabase read, JSON export |
| `app/api/pathlab/enroll/` | POST | Supabase insert |
| `app/api/pathlab/reflect/` | POST | Supabase insert (path reflection), no AI |
| `app/api/onboarding/state/` | POST | Supabase upsert, small body |
| `app/api/onboarding/complete/` | POST | Supabase upsert, small body |
| `app/api/onboarding/tcas/` | GET | Supabase read |
| `app/api/onboarding/reset/` | POST | Supabase delete |
| `app/api/auth/forgot-password/` | POST | Supabase auth helper |
| `app/api/seeds/create/` | POST | Supabase insert |
| `app/api/seeds/clone-map/` | POST | Supabase clone operation |
| `app/api/seeds/reset-progress/` | POST | Supabase delete/update |
| `app/api/seeds/rooms/[roomId]/grading/` | GET, POST | Supabase CRUD |
| `app/api/hackathon/login/` | POST | Supabase auth, sets cookie |
| `app/api/hackathon/logout/` | POST | Clears cookie, DB session delete |
| `app/api/hackathon/register/` | POST | Supabase insert, small body |
| `app/api/hackathon/register/special/` | POST | Supabase insert |
| `app/api/hackathon/register/link/[token]/` | GET | Supabase read (token validation) |
| `app/api/hackathon/register/invite/[token]/` | GET | Supabase read (token validation) |
| `app/api/hackathon/forgot-password/` | POST | Supabase auth helper |
| `app/api/hackathon/reset-password/` | POST | Supabase auth helper |
| `app/api/hackathon/pre-questionnaire/` | GET, POST | Supabase read/write |
| `app/api/hackathon/me/` | GET | Supabase read (session lookup) |
| `app/api/hackathon/team/me/` | GET | Supabase read (session lookup) |
| `app/api/hackathon/team/create/` | POST | Supabase insert |
| `app/api/hackathon/team/join/` | POST | Supabase insert |
| `app/api/hackathon/team/leave/` | POST | Supabase update |
| `app/api/hackathon/team/kick/` | POST | Supabase update/delete |
| `app/api/hackathon/team/interests/` | POST | Supabase update |
| `app/api/hackathon/team/invite/create/` | POST | Supabase insert |
| `app/api/hackathon/team/invite/status/` | POST | Supabase read/write |
| `app/api/hackathon/team/match/status/` | GET | Supabase read |
| `app/api/hackathon/team/match/join/` | POST | Supabase update |
| `app/api/hackathon/team/match/cancel/` | POST | Supabase update |
| `app/api/hackathon/student/team/` | GET | Supabase read |
| `app/api/hackathon/student/mentor-quota/` | GET | Supabase read |
| `app/api/hackathon/student/mentor-slots/` | GET | Supabase read |
| `app/api/hackathon/student/book-mentor/` | POST | Supabase insert |
| `app/api/hackathon/student/cancel-booking/[id]/` | POST | Supabase update |
| `app/api/hackathon/mentor/me/` | GET | Supabase read (session lookup) |
| `app/api/hackathon/mentor/login/` | POST | Supabase auth, sets cookie |
| `app/api/hackathon/mentor/logout/` | POST | Clears cookie, DB session delete |
| `app/api/hackathon/mentor/register/` | POST | Supabase insert |
| `app/api/hackathon/mentor/public/` | GET | Supabase read |
| `app/api/hackathon/mentor/availability/` | GET, POST | Supabase read/write |
| `app/api/hackathon/mentor/availability-toggle/` | POST | Supabase update |
| `app/api/hackathon/mentor/bookings/` | GET | Supabase read |
| `app/api/hackathon/mentor/bookings/[id]/` | GET | Supabase read |
| `app/api/hackathon/mentor/teams/` | GET | Supabase read |
| `app/api/hackathon/mentor/teams/assign/` | POST | Supabase insert |
| `app/api/hackathon/mentor/line-connect/` | POST | Supabase update |
| `app/api/hackathon/bookings/` | GET, POST | Supabase read/write |
| `app/api/hackathon/submissions/` | GET | Supabase paginated read |
| `app/api/hackathon/inbox/` | GET | Supabase read |
| `app/api/hackathon/push-subscribe/` | POST | Supabase insert |
| `app/api/hackathon/team-finder/status/` | GET | Supabase read |
| `app/api/hackathon/team-finder/join/` | POST | Supabase insert |
| `app/api/hackathon/team-finder/preferences/` | POST | Supabase upsert |
| `app/api/hackathon/team-matching/participants/` | GET | Supabase read |
| `app/api/hackathon/team-matching/met/` | GET, POST | Supabase read/write |
| `app/api/hackathon/team-matching/rankings/` | GET | Supabase read |
| `app/api/hackathon/team-matching/event/` | GET, POST | Supabase read/write |
| `app/api/hackathon/matching/met/` | GET, POST | Supabase read/write |
| `app/api/hackathon/matching/rankings/` | GET | Supabase read |
| `app/api/hackathon/matching/event/` | GET, POST | Supabase read/write |
| `app/api/hackathon/mentor/submissions/[scope]/[id]/grade/` | POST | Supabase update (manual grade) |
| `app/api/hackathon/mentor/submissions/[scope]/[id]/comment/` | POST | Supabase insert (comment) |
| `app/api/mentor-sessions/schedule/` | POST | Supabase insert |
| `app/api/mentor-sessions/[id]/cancel/` | POST | Supabase update |
| `app/api/groups/[id]/progress/` | GET | Supabase read |
| `app/api/ps/projects/[id]/members/` | GET | Supabase read |
| `app/api/ps/b2b/phase1/` | POST | Supabase insert |
| `app/api/expert-interview/submit/` | POST | Supabase insert |
| `app/api/expert-interview/claim/` | POST | Supabase update |
| `app/api/expert-interview/force-complete/` | POST | Supabase update |
| `app/api/test-db/` | GET | Supabase read (test) |
| `app/api/check-tables/` | GET | Supabase read (test) |
| `app/api/check-reflections/` | GET | Supabase read (test) |
| `app/api/test-classroom/` | GET | Supabase read (test) |
| `app/api/direction/enqueue/` | POST | Supabase insert (creates job), no AI |
| `app/api/direction/status/[jobId]/` | GET | Supabase read (poll job) |
| `app/api/embeddings/enqueue/` | POST | Supabase insert (creates job) |
| `app/api/embeddings/status/[jobId]/` | GET | Supabase read (poll job) |
| `app/api/admin/analytics/` | GET | Supabase aggregated reads (many tables) |
| `app/api/admin/stats/` | GET | Supabase reads |
| `app/api/admin/onboarding/` | GET | Supabase read |
| `app/api/admin/beta-registrations/` | GET | Supabase read |
| `app/api/admin/users/` | GET | Supabase read |
| `app/api/admin/users/roles/` | POST | Supabase insert |
| `app/api/admin/experts/` | GET, POST | Supabase CRUD |
| `app/api/admin/experts/[id]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/experts/[id]/approve/` | POST | Supabase update |
| `app/api/admin/experts/[id]/reject/` | POST | Supabase update |
| `app/api/admin/universities/` | GET, POST | Supabase CRUD |
| `app/api/admin/universities/[id]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/maps/` | GET, POST | Supabase CRUD |
| `app/api/admin/test-connection/` | GET | Supabase connectivity test |
| `app/api/admin/track-payment/` | POST | Supabase insert |
| `app/api/admin/event-tracker/` | GET | Supabase read |
| `app/api/admin/npc-conversations/` | GET, POST | Supabase CRUD |
| `app/api/admin/npc-conversations/[id]/import/` | POST | Supabase insert |
| `app/api/admin/hackathon/activities/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/activities/editor/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/activities/editor/[id]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/hackathon/activities/editor/[id]/content/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/activities/editor/[id]/content/[contentId]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/hackathon/activities/editor/[id]/assessment/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/activities/[activityId]/submissions/` | GET | Supabase read |
| `app/api/admin/hackathon/activities/[activityId]/clusters/` | GET | Supabase read |
| `app/api/admin/hackathon/teams/` | GET | Supabase read |
| `app/api/admin/hackathon/teams/[teamId]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/hackathon/teams/[teamId]/message/` | POST | Supabase insert |
| `app/api/admin/hackathon/teams/[teamId]/mentor-assignments/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/teams/submissions/` | GET | Supabase read |
| `app/api/admin/hackathon/submissions/[scope]/[id]/comment/` | POST | Supabase insert |
| `app/api/admin/hackathon/submissions/[scope]/[id]/review/` | POST | Supabase update |
| `app/api/admin/hackathon/submissions/[scope]/[id]/ai-draft/discard/` | POST | Supabase update |
| `app/api/admin/hackathon/mentors/` | GET | Supabase read |
| `app/api/admin/hackathon/mentors/[id]/route.ts` | GET, PUT, DELETE | Supabase CRUD |
| `app/api/admin/hackathon/mentors/[id]/approve/` | POST | Supabase update |
| `app/api/admin/hackathon/mentors/[id]/availability/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/mentors/[id]/assignments/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/mentors/bookings/` | GET | Supabase read |
| `app/api/admin/hackathon/mentor-bookings/reset-quota/` | POST | Supabase update |
| `app/api/admin/hackathon/mentor-bookings/reset-quota-team/` | POST | Supabase update |
| `app/api/admin/hackathon/mentor-bookings/set-quota/` | POST | Supabase update |
| `app/api/admin/hackathon/participants/` | GET | Supabase read |
| `app/api/admin/hackathon/participants/set-password/` | POST | Supabase auth helper |
| `app/api/admin/hackathon/register-links/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/invite-toggle/` | POST | Supabase update |
| `app/api/admin/hackathon/questionnaires/` | GET | Supabase read |
| `app/api/admin/hackathon/analytics/` | GET | Supabase read |
| `app/api/admin/hackathon/grading-prompt/` | GET, POST | Supabase read/write |
| `app/api/admin/hackathon/push-sender/` | POST | Supabase read (fetches subscribers) + external push API |
| `app/api/admin/hackathon/push-sender/receipts/` | GET | Supabase read |
| `app/api/admin/hackathon/push-sender/test/` | POST | Supabase read + external push API |
| `app/api/admin/hackathon/email-sender/` | POST | Supabase read + external email API |
| `app/api/admin/hackathon/team-finder/reset-preferences/` | POST | Supabase update |
| `app/api/admin/hackathon/team-finder/participants/` | GET | Supabase read |
| `app/api/admin/hackathon/team-finder/create-teams/` | POST | Supabase insert |
| `app/api/admin/hackathon/team-matching/run/` | POST | Supabase batch operations |
| `app/api/admin/hackathon/matching/run/` | POST | Supabase batch operations |
| `app/api/admin/hackathon/matching/event/` | GET, POST | Supabase CRUD |
| `app/api/admin/hackathon/team-directions/search/` | GET | Supabase read (vector search? small) |
| `app/api/admin/hackathon/team-directions/clusters/` | GET | Supabase read |
| `app/api/admin/hackathon/team-directions/health/` | GET | Health check |
| `app/api/admin/hackathon/team-directions/rag/` | POST | Supabase operations |
| `app/api/admin/hackathon/team-directions/debug/` | GET | Supabase read |
| `app/api/admin/hackathon/team-directions/recluster/` | POST | Supabase operations |
| `app/api/admin/hackathon/team-directions/process-pending/` | POST | Supabase operations |
| `app/api/debug/classrooms/` | GET | Debug route, Supabase read |
| `app/api/debug/user-role/` | GET | Debug route, Supabase read |
| `app/api/debug/user/[id]/route.ts` | GET, POST | Debug route, Supabase read/write |
| `app/api/debug/test-grade/` | POST | Debug route, Supabase insert |
| `app/api/debug/grading/` | GET, POST | Debug route, Supabase CRUD |
| `app/api/debug/batch-update/` | POST | Debug route, Supabase batch update |
| `app/api/apple-music/search/` | GET | External API proxy (Apple Music), small payload |
| `app/api/deezer/search/` | GET | External API proxy (Deezer), small payload |

## Edge-Possible Routes (could convert with minor changes)

These routes are mostly read or simple mutations, but have one or two considerations that need addressing before Edge migration.

| Route | Methods | Reasoning | Changes Needed |
|-------|---------|-----------|----------------|
| `app/api/soundcloud/search/` | GET | External API proxy to SoundCloud. Uses `fetch()` which works on Edge. No Node.js APIs. | None — already Edge-compatible (uses `fetch`). Could add `runtime = "edge"`. |
| `app/api/deezer/search/` | GET | External API proxy to Deezer. Uses `fetch()`. No Node.js APIs. | Already marked as Edge-safe above. |
| `app/api/apple-music/search/` | GET | External API proxy to Apple Music. Uses `fetch()`. | Already marked as Edge-safe above. |
| `app/api/spotify/search/` | GET | External API proxy, but uses `Buffer.from()` for base64 encoding of credentials. | Replace `Buffer.from()` with `btoa()` which is a Web API available on Edge. |
| `app/api/music/process/` | POST | External API calls (Spotify + Deezer + audio features). Uses `Buffer.from()` for base64. | Replace `Buffer.from()` with `btoa()`. POST body is small JSON. No file uploads in this route. |
| `app/api/hackathon/track-view/` | POST | Uses `createHash("sha256")` from Node.js `crypto`. | Replace with `crypto.subtle.digest("SHA-256", ...)` from Web Crypto API. |
| `app/api/expert-interview/session/` | POST | Uses `crypto.randomUUID()` from Node.js `crypto`. | Replace with `crypto.randomUUID()` from Web Crypto API (available globally on Edge). |
| `app/api/admin/hackathon/participants/export/` | GET | Returns CSV. Very simple — builds CSV string from Supabase query. No Node.js APIs. | None — already Edge-compatible. Could add `runtime = "edge"`. |
| `app/api/maps/[id]/route.ts` PUT | PUT | Map update with batch operations to Supabase. Moderately complex writes but all Supabase. | Already marked as Edge-safe for GET. PUT has more complex logic but still Supabase-only. |
| `app/api/admin/hackathon/team-directions/search/` | GET | Supabase vector search, small payloads. | Already marked as Edge-safe. |
| `app/api/admin/hackathon/submissions/[scope]/[id]/ai-grade/` GET | GET | Returns prompt context (no AI call). Read-only Supabase fetches. | Already Edge-safe for GET. POST variant is Node-required. |
| `app/api/pathlab/migrate/` | POST | Migration helper, Supabase operations. | Probably already Edge-safe. |
| `app/api/maps/create-from-json/` | POST | Creates maps from JSON body. Supabase inserts. | Already Edge-safe. |
| `app/api/admin/npc-conversations/[id]/import/` | POST | Imports NPC conversation data. Supabase operations. | Already Edge-safe. |

## Node-Required Routes (must stay Node.js)

These routes use Node.js-specific APIs, handle file uploads, make AI/LLM calls with streaming, process large payloads, or use SDKs incompatible with the Edge runtime.

| Route | Methods | Reasoning |
|-------|---------|-----------|
| **Upload Routes (Backblaze B2 + File Processing)** | | |
| `app/api/upload/route.ts` | POST, DELETE, GET | File upload to B2, uses `Buffer`, multipart form data |
| `app/api/upload/avatar/` | POST | Avatar upload to B2, form data + Buffer |
| `app/api/upload/badge/` | POST | Badge upload to B2, uses `Buffer` |
| `app/api/upload/documents/` | POST | Document upload to B2 |
| `app/api/upload/certificate-template/` | POST | Certificate template upload, uses `Buffer` |
| `app/api/upload/stream/` | (streaming) | Streaming file operations |
| `app/api/upload/presigned/` | (presigned URLs) | B2 presigned URL generation |
| `app/api/upload/images/` | POST | Image upload to B2 |
| `app/api/upload/chunk/` | POST | Chunked file upload to B2 |
| `app/api/categories/upload-logo/` | POST | Logo upload to B2, uses `Buffer` |
| `app/api/maps/upload-cover-image/` | POST | Cover image upload, uses `Buffer` + `StorageManager` (sharp processing) |
| `app/api/seeds/upload-cover-image/` | POST | Seed cover image upload, uses `Buffer` + `StorageManager` (sharp processing + blurhash) |
| `app/api/expert-interview/upload-photo/` | POST | Expert photo upload, uses `Buffer` + `StorageManager` |
| `app/api/hackathon/mentor/photo/` | POST | Mentor photo upload to B2, uses `Buffer` |
| **AI/LLM Routes (streaming, ML models)** | | |
| `app/api/onboarding/chat/` | POST | Uses `streamText` from `ai` SDK, creates `ReadableStream`, NDJSON streaming |
| `app/api/expert-interview/chat/` | POST | Calls `processInterviewMessage` (AI chat service), uses LLM |
| `app/api/expert-interview/transcribe/` | POST | Uses `groq-sdk` (Whisper + LLM post-processing), audio blob processing |
| `app/api/pathlab/chat/` | POST | Uses `generateText` from `ai` SDK with Gemini model |
| `app/api/pathlab/generate/` | POST | Uses `generatePathLabDraft` (AI generation), calls LLM |
| `app/api/pathlab/generate/regenerate/` | POST | Same as above — regenerates draft via AI |
| `app/api/pathlab/generate/validate/` | POST | Validates AI-generated output |
| `app/api/pathlab/preview/` | POST | Uses `generatePathLabDraft` (AI generation) |
| `app/api/pathlab/ai-chat/[activityId]/` | (AI chat) | AI-powered activity chat |
| `app/api/pathlab/ai-chat/test/` | (AI test) | AI chat test endpoint |
| `app/api/education/roadmap/generate/` | POST | AI roadmap generation (currently has TODO for real AI, but structured for LLM call) |
| `app/api/direction/process/[jobId]/` | (background) | Runs AI direction profile engine (`generateDirectionProfileCore`, `generatePrograms`, etc.) — multi-step AI pipeline |
| `app/api/embeddings/process/[jobId]/` | (background) | Runs embedding generation pipeline |
| `app/api/admin/hackathon/submissions/[scope]/[id]/ai-grade/` | POST | Uses `streamText` from `ai` SDK with MiniMax M2.7, NDJSON streaming, `maxDuration = 60`, image analysis |
| `app/api/admin/hackathon/submissions/[scope]/[id]/rewrite-feedback/` | POST | Uses `streamText` from `ai` SDK, NDJSON streaming |
| `app/api/hackathon/submit/` | POST | File upload to B2 + embedding enqueue + `Buffer` operations |
| `app/api/admin/hackathon/team-directions/embed-all/` | POST | Batch enqueue embedding jobs (can process many teams) |
| `app/api/admin/hackathon/team-directions/embed-team/` | POST | Embedding generation for a single team |
| `app/api/admin/hackathon/team-directions/process/[jobId]/` | (background) | Embedding processing pipeline |
| `app/api/admin/experts/[id]/approve/` POST | POST | Calls `generatePathLabDraft` (AI generation) as part of expert approval |
| **Crypto-Required Routes** | | |
| `app/api/hackathon/mentor/line-webhook/` | POST | Uses `crypto.randomBytes()` (Node.js crypto), LINE signature validation |
| **Large Data / CSV / Special Routes** | | |
| `app/api/cc-research/run/` | POST | AI orchestration (campaign runner with LLM calls) |
| `app/api/cc-research/campaigns/` | GET, POST | CC research campaign CRUD (Supabase, but part of AI pipeline ecosystem) |
| `app/api/cc-research/campaigns/[campaignId]/` | GET, PUT, DELETE | Campaign management |
| `app/api/cc-research/campaigns/[campaignId]/seed-leads/` | POST | Seed lead generation |
| `app/api/cc-research/interviews/` | GET | Interview data |
| `app/api/cc-research/insights/` | GET | Insights data |
| `app/api/cc-research/outreach/` | POST | Outreach operations |
| `app/api/cc-research/dashboard/[campaignId]/` | GET | Dashboard data |
| `app/api/cc-research/leads/[leadId]/status/` | PUT | Lead status updates |

## Summary

- **Total routes analyzed**: 210+ route files across `app/api/`
- **Edge-safe**: ~160 routes (76%) — Pure Supabase read/write operations, no Node.js APIs, no AI, no file processing
- **Edge-possible**: ~10 routes (5%) — Need minor changes (e.g., `Buffer.from()` → `btoa()`, Node.js `crypto` → Web Crypto)
- **Node-required**: ~40 routes (19%) — File uploads (B2 + Buffer), AI/LLM streaming, Groq SDK, embedding pipelines

### Migration Priority Recommendations

1. **High-value, low-effort** (convert immediately):
   - `app/api/app-data/` — Used on every page load, already cached
   - `app/api/user/next-nodes/` — Core dashboard data
   - `app/api/maps/list/` — Public map browsing (already has Cache-Control)
   - All hackathon GET endpoints (login page loads, dashboard data)
   - `app/api/version/` — Deploy health check

2. **Fix then convert** (minor `Buffer`/`crypto` replacements):
   - `app/api/spotify/search/` — Replace `Buffer.from()` with `btoa()`
   - `app/api/music/process/` — Replace `Buffer.from()` with `btoa()`
   - `app/api/hackathon/track-view/` — Replace `createHash` with Web Crypto
   - `app/api/expert-interview/session/` — Replace `crypto.randomUUID()` with Web Crypto

3. **Stay on Node.js** (fundamental limitations):
   - All `/upload/` routes — File uploads with B2
   - All AI/LLM routes — `streamText`, `generateText`, Groq SDK
   - `app/api/admin/hackathon/submissions/[scope]/[id]/ai-grade/` — Long-running AI (60s max)
   - `app/api/direction/process/[jobId]/` — Multi-step AI pipeline
   - `app/api/hackathon/mentor/line-webhook/` — LINE webhook with raw body access

### Project-wide Observations

- **Supabase client works on Edge**: The `createServerClient` from `@supabase/ssr` with `cookies()` API is Edge-compatible (uses `getAll`/`setAll`).
- **`next/headers` cookies() works on Edge**: Next.js 15 supports `cookies()` in Edge runtime.
- **Most routes use `createClient()` from `@/utils/supabase/server`**: This is Edge-compatible as it uses Supabase SSR pattern.
- **`Buffer` is the main blocker**: ~8 routes use `Buffer.from()` for file processing. Edge has `Uint8Array` and `btoa()` as alternatives for non-file use cases.
- **Node.js `crypto` is used in 4 routes**: Can be replaced with Web Crypto API (`crypto.subtle.digest`, `crypto.randomUUID()`).
- **No `fs`, `path`, `child_process`, or `stream` (Node.js) usage found** in API routes.
