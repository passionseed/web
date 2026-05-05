# Database Image URL Columns Report

Generated: 2026-05-05

## Summary

This report lists every database column that stores B2 (Backblaze) image/file URLs, and identifies Supabase Storage URLs that should NOT be converted.

## B2 Environment

| Config | Value |
|--------|-------|
| Bucket | `pseed-dev` |
| Endpoint | `s3.us-east-005.backblazeb2.com` (prod) / `s3.us-west-000.backblazeb2.com` (default) |
| URL Pattern | `https://pseed-dev.s3.{region}.backblazeb2.com/{path}` |
| Friendly URL | `https://f005.backblazeb2.com/file/pseed-dev/{path}` |
| CDN (exists, unused) | `https://cdn.passionseed.org/file/pseed-dev/{path}` |

All B2 URLs are constructed by `lib/backblaze.ts`, `lib/storage/storage-manager.ts`, and `app/api/upload/presigned/route.ts`.

---

## Category 1: Tables/Columns Storing B2 Image URLs (should be converted to CDN URLs)

### Core Map/Learning Content

```
Table: learning_maps
  - cover_image_url  (likely stores B2 URLs because: explicitly commented "Public URL to the optimized cover image stored in Backblaze B2" - migration 20250920000000_optimize_image_storage.sql)
  - cover_image_key  (likely stores B2 URLs because: "Backblaze B2 file key for deletion and management")

Table: node_content (also referenced as map_content)
  - content_url      (likely stores B2 URLs because: stores video/canva links; can be B2-hosted content or external links like YouTube)

Table: learning_maps
  - sprite_url       (likely stores B2 URLs because: gamification boss/sprite images stored in B2)
```

### Seeds / Game System

```
Table: seeds
  - cover_image_url   (likely stores B2 URLs because: same B2 pattern as learning_maps, seeded from maps, uses StorageManager for upload - migration 20251202000001_create_seeds.sql + 20251203000001_add_seed_image_columns.sql)
  - cover_image_key   (likely stores B2 URLs because: B2 file key, same pattern as learning_maps)

Table: seed_categories
  - logo_url          (likely stores B2 URLs because: category logos uploaded to B2 - migration 20251206000002_add_category_logos.sql)

Table: seed_certificates
  - signature_image_url (likely stores B2 URLs because: certificate signature images stored in B2)
  - logo_url            (likely stores B2 URLs because: certificate logo images stored in B2 - migration 20251213000001_add_certificate_system.sql)

Table: issued_certificates
  - certificate_url   (likely stores B2 URLs because: URL to stored PNG/PDF in B2 - migration 20251213000001_add_certificate_system.sql)

Table: seed_badges
  - badge_image_url   (likely stores B2 URLs because: badge images uploaded to B2 - migration 20251213000002_add_badge_system.sql)
  - badge_image_key   (likely stores B2 URLs because: Storage key for B2 management)
```

### Assessment / Submissions (User-Generated Content)

```
Table: assessment_submissions
  - image_url   (likely stores B2 URLs because: image upload assessments stored in B2 - migration 20250725080607_add_map_content.sql; documented in docs/file-upload-system.md)
  - file_urls   (likely stores B2 URLs because: array of B2 file URLs for multi-file submissions - migration 20250730114553_update_file_urls.sql; documented in docs/file-upload-system.md)

Table: hackathon_phase_activity_submissions
  - image_url   (likely stores B2 URLs because: hackathon participant image submissions go to B2 - migration 20260403000000_hackathon_submissions.sql)
  - file_urls   (likely stores B2 URLs because: array of hackathon file submission B2 URLs - migration 20260403000000_hackathon_submissions.sql)
  - revisions   (likely stores B2 URLs because: JSONB array; each element has image_url + file_urls fields referencing B2 - migration 20260420074921_hackathon_submission_revisions.sql)

Table: hackathon_phase_activity_team_submissions
  - image_url   (likely stores B2 URLs because: team hackathon image submissions go to B2 - migration 20260403000002_hackathon_activity_scope_and_team_submissions.sql)
  - file_urls   (likely stores B2 URLs because: team hackathon file submission B2 URLs - migration 20260403000002_hackathon_activity_scope_and_team_submissions.sql)
  - revisions   (likely stores B2 URLs because: JSONB array; each element has image_url + file_urls fields referencing B2 - migration 20260420074921_hackathon_submission_revisions.sql)

Table: path_assessment_submissions
  - image_url   (likely stores B2 URLs because: PathLab image submissions go to B2 - migration 20260317000000_create_pathlab_content_system.sql)
  - file_urls   (likely stores B2 URLs because: PathLab file submission B2 URLs - migration 20260317000000_create_pathlab_content_system.sql)
```

### PathLab / Phase Activity Content

```
Table: path_content
  - content_url  (likely stores B2 URLs because: stores video/short_video/PDF content URLs from B2 - migration 20260317000000_create_pathlab_content_system.sql)
  - image_url    (likely stores B2 URLs because: PathLab image content stored in B2 - migration 20260317000000_create_pathlab_content_system.sql)
  - file_urls    (likely stores B2 URLs because: PathLab file content stored in B2 - migration 20260317000000_create_pathlab_content_system.sql)

Table: hackathon_phase_activity_content
  - content_url  (likely stores B2 URLs because: hackathon phase video/short_video content from B2 - migration 20260401000000_hackathon_phase_activities.sql)
```

### Community / Social

```
Table: community_images
  - url           (likely stores B2 URLs because: community profile and cover photos stored in B2 - migration 20250630015258_update_communities.sql)

Table: post_media
  - url           (likely stores B2 URLs because: post images/files stored in B2 - migration 20250630015258_update_communities.sql)
```

### Profiles / People

```
Table: mentor_profiles
  - photo_url    (likely stores B2 URLs because: mentor profile photos uploaded to B2 - migration 20260403100000_mentor_booking_system.sql)

Table: expert_profiles
  - photo_url    (likely stores B2 URLs because: expert profile photos stored in B2 - migration 20260313100000_create_expert_interview_tables.sql)
```

### University / Education

```
Table: universities
  - logo_url     (likely stores B2 URLs because: university logo images stored in B2 - migration 20251119000002_create_educational_pathway_tables.sql)
```

### Projects / Reflections

```
Table: projects
  - image_url    (likely stores B2 URLs because: project image uploads stored in B2 - migration 20250702010000_refactor_reflection_system_revised.sql)

Table: reflections
  - image_url    (likely stores B2 URLs because: reflection image uploads stored in B2 - migration 20250702010000_refactor_reflection_system_revised.sql)
```

### Hackathon Participant Avatars (ambiguous - see notes)

```
Table: hackathon_participants
  - avatar_url   (likely stores B2 URLs because: "URL to participant avatar image in storage bucket" - migration 20260406230001_add_comment_fields_to_participants.sql; NOTE: "storage bucket" could mean Supabase Storage, but since these participants are not Supabase Auth users, uploads likely go to B2 via the same upload pipeline)
```

### JSONB-Stored URLs (embedded in data)

```
Table: hackathon_phase_activity_submissions.revisions (JSONB column)
  - Each revision element contains: image_url (text), file_urls (text[])
  (likely stores B2 URLs because: revision snapshots reference same B2 URLs as the parent row)

Table: hackathon_phase_activity_team_submissions.revisions (JSONB column)
  - Each revision element contains: image_url (text), file_urls (text[])
  (likely stores B2 URLs because: same as individual submissions)

Table: issued_certificates.certificate_data (JSONB column)
  - Contains: logo_url, signature_image_url (as part of rendered certificate data)
  (likely stores B2 URLs because: certificate template references stored in the JSONB snapshot)
```

---

## Category 2: Supabase Storage URLs — DO NOT TOUCH

These columns store Supabase Storage URLs (supabase.co/storage/v1/...) and should NOT be converted to CDN URLs:

```
Table: profiles
  - avatar_url   (Supabase Storage URL because: Managed by Supabase Auth; stores avatar URLs from auth.users user_metadata. format: https://<project>.supabase.co/storage/v1/object/... — confirmed by image-delivery-report.md)

Table: hackathon_teams
  - team_avatar_url  (Supabase Storage URL because: Uses dedicated Supabase Storage bucket `hackathon-team-avatars` created in migration 20260406000000_add_hackathon_profile_social_fields.sql. Storage policies reference storage.objects, not B2)
```

---

## Category 3: Non-Image URLs — IGNORE (not image/file storage)

These columns store URLs but are NOT image/file storage URLs. They should NOT be converted:

```
Table: universities.website_url         — University website link
Table: universities.admission_url       — University admission page link
Table: expert_profiles.linkedin_url     — LinkedIn profile link
Table: expert_profiles.booking_url      — Meeting booking link
Table: mentor_profiles.instagram_url    — Social media handle
Table: mentor_profiles.linkedin_url     — Social media profile
Table: mentor_profiles.website_url      — Personal website
Table: job_listings.company_url         — Company website
Table: job_listings.apply_url           — Job application link
Table: job_listings.url                 — Job listing source URL
Table: job_listings.source_url          — Job data source
Table: projects.link                    — Project link (external)
Table: projects.spotify_album_cover_url — External album art (Spotify CDN)
Table: projects.preview_url             — Spotify preview audio
Table: song_of_the_day.song_url         — Spotify song URL
Table: song_of_the_day.album_cover_url  — External album art
Table: cc_research_namespace.linkedin_url — Research profile link
Table: hackathon_journey_alien_clicks.target_url — External redirect
Table: inbox_notifications.action_url   — Action link URL
Table: gdrive_analysis_results.drive_folder_url — Google Drive folder link
Table: educational_pathways.universities.website_url — University website
```

---

## Category 4: Columns Using External CDNs (Already Not B2)

```
Table: projects.spotify_album_cover_url — Spotify CDN (i.scdn.co)
Table: song_of_the_day.album_cover_url  — Spotify CDN (i.scdn.co)
```

---

## Migration Files Referencing B2 Patterns

- No migration files directly reference `backblazeb2.com` in column defaults or data
- No migration files directly reference `pseed-dev` in column defaults
- The B2 bucket/endpoint is configured entirely via environment variables (`B2_BUCKET_NAME`, `B2_ENDPOINT`)
- URLs are constructed at runtime in `lib/backblaze.ts`, `lib/storage/storage-manager.ts`, and `app/api/upload/presigned/route.ts`

---

## TypeScript Type Definitions (types/) Confirming These Columns

| Type File | URL Columns |
|-----------|-------------|
| `types/map.ts` | `cover_image_url`, `cover_image_blurhash`, `cover_image_key`, `sprite_url`, `content_url`, `file_urls`, `image_url` |
| `types/seeds.ts` | `cover_image_url`, `cover_image_blurhash`, `cover_image_key`, `logo_url`, `signature_image_url`, `certificate_template_url`, `certificate_url` |
| `types/badges.ts` | `badge_image_url`, `badge_image_key`, `cover_image_url` |
| `types/community.ts` | `cover_image_url`, `profile_image_url`, `avatar_url`, `url` (media) |
| `types/admin-hackathon.ts` | `image_url`, `file_urls`, `participant_avatar_url`, `photo_url` |
| `types/hackathon-phase-activity.ts` | `content_url` |
| `types/pathlab-content.ts` | `content_url`, `file_urls`, `image_url` |
| `types/education.ts` | `logo_url` |
| `types/mentor.ts` | `photo_url` |
| `types/expert-interview.ts` | `photoUrl` |
| `types/teams.ts` | `avatar_url` |
| `types/journey.ts` | `cover_image_url`, `cover_image_blurhash`, `cover_image_key` |
| `types/project.ts` | `image_url` |
| `types/classroom.ts` | `avatar_url` (from profiles, NOT B2) |
| `types/npc-conversations.ts` | `npc_avatar_id` (not a URL, references seed_npc_avatars table) |

---

## Key Findings

1. **Two distinct storage systems exist:** B2 for user-generated content/images, Supabase Storage for auth avatars and hackathon team avatars.

2. **No existing backblazeb2.com references in database data or migrations.** All B2 URLs are built at runtime.

3. **The CDN infrastructure exists** (`cdn.passionseed.org` → `f005.backblazeb2.com`) but is NOT currently used by the application code. All code constructs raw B2 bucket URLs.

4. **The heavy-lifting tables for CDN migration are:**
   - `assessment_submissions` (image_url, file_urls)
   - `hackathon_phase_activity_submissions` (image_url, file_urls, revisions)
   - `hackathon_phase_activity_team_submissions` (image_url, file_urls, revisions)
   - `learning_maps` (cover_image_url)
   - `seeds` (cover_image_url)
   - `path_assessment_submissions` (image_url, file_urls)
   - `community_images` (url)
   - `post_media` (url)

5. **Columns using `_key` suffix** (cover_image_key, badge_image_key, certificate_key) store B2 file keys, not full URLs. These don't need URL transformation but are part of the B2 storage system.

6. **JSONB columns** (`revisions`, `certificate_data`) contain embedded B2 URLs that would also need transformation if doing a DB-level migration.
