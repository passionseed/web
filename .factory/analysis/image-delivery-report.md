# Image Delivery Analysis Report

## Current Image Components

### next/image users
- `components/main-nav.tsx` → `/passionseed-logo.svg`, `/hackathon/HackLogo.png` (local static files in `/public`)
- `components/landing-page-wrapper.tsx` → imports `Image` but delegates to child components (no direct src usage)
- `components/map/OptimizedImage.tsx` → wraps `next/image` for all map/seed cover images; `src` and `blurhash` props dynamically passed from B2 URLs or local defaults
- `components/map/AnimatedMapPreview.tsx` → `map.metadata.coverImage` (B2 URL from DB)
- `components/ps/CreateProjectModal.tsx` → `selectedSong.albumCover` (external album art URLs)
- `components/journey/SocialSharePreview.tsx` → dynamic `img` prop (passed in)
- `components/education/direction-finder/AIConversation.tsx` → `/passionseed-logo.svg` (local static)
- `components/landing-hero.tsx` → imports `Image` (used in child section of LandingDemoPaths, not directly)
- `components/landing-logos.tsx` → `/universities/chula-logo.png`, `/universities/tu-logo.png`, `/universities/KU-logo.jpg`, `/universities/kmutt-logo.png`, `/universities/csii-logo.png` (local static)
- `components/landing-hackathon-banner.tsx` → `/hackathon/HackLogo.png` (local static)
- `app/expert-interview/page.tsx` → `/passionseed-logo.svg` (local static)
- `app/hackathon/line-oa/page.tsx` → `/hackathon/LineQR.jpg` (local static)
- `app/app/beta/success/page.tsx` → `https://qr-official.line.me/gs/M_161irjbq_GW.png?oat_content=qr` (external URL, with `unoptimized`)
- `app/app/beta/page.tsx` → `/CBT/Person1.svg`, `/CBT/Person2.svg`, `/CBT/UI1_1.png`, `/CBT/UI1_2.png`, `/CBT/UI2_1.png`, `/CBT/UI2_2.png` (local static)
- `app/pitch/page.tsx` → `/passionseed-logo.svg` (local static)
- `app/pitch/3/page.tsx` → `/passionseed-logo.svg` (local static — used twice)

**Summary of next/image source types:**
- **Local static (~80% of next/image instances):** `/public/` directory files (logos, SVGs, PNGs) — these are bundled with the app and served by Vercel
- **Dynamic B2 URLs (~15%):** `cover_image_url` from `learning_maps` and `seeds` tables — these point to `https://pseed-dev.s3.us-east-005.backblazeb2.com/images/maps/...`
- **External URLs (~5%):** QR code URLs, album art URLs

### <img> tag users
- `components/community/CommunityCard.tsx` → `community.profile_image_url` and `community.cover_image_url` as CSS `backgroundImage` (URLs from DB, likely B2)
- `components/community/PostCard.tsx` → `media.url` (hackathon submission media URLs from B2)
- `components/hackathon/ImpactLandingPage.tsx` → local static sponsor logos (`/hackathon/PS.png`, `/hackathon/AMSA.png`, `/hackathon/StemLike.png`)
- `components/hackathon/LandingPage.tsx` → local static SVGs (`/hackathon/Creature/*.svg`) and sponsor PNGs — ~15 separate `<img>` tags on this page
- `components/hackathon/CelebrationPage.tsx` → local static SVGs (`/hackathon/Creature/Jellyfish 1.svg`, etc.) — ~4 images
- `components/hackathon/ChallengePage.tsx` → `/images/hackathon_*.png` (local static thumbnails)
- `components/seeds/GameBoxCard.tsx` → `seed.cover_image_url` (B2 URL), `seed.category.logo_url` (URL from DB)
- `components/seeds/CategoryManagementModal.tsx` → `logoPreview` from file input (local data URL)
- `components/seeds/certificates/templates/*.tsx` → `data.logo_url` (certificate logo URL from DB)
- `components/admin/AdminHackathonActivities.tsx` → `ans.image_url` (hackathon submission image B2 URL)
- `components/admin/UniversityManagement.tsx` → university logo URLs
- `components/song-of-the-day/portal-vinyl.tsx` → `currentSong.albumCover` (external album art)
- `components/map/OptimizedImage.tsx` → blurhash placeholder uses `<img>` internally

**Summary of <img> tag source types:**
- **Local static (~50%):** SVGs, PNGs in `/public/hackathon/`, `/public/images/`
- **Dynamic B2 URLs (~40%):** `cover_image_url`, `image_url`, `media.url`, `profile_image_url`
- **External URLs (~10%):** Album covers, data URLs

### AvatarImage users (shadcn/ui)
All use `profile.avatar_url` from the Supabase `profiles` table via DB queries. These URLs originate from Supabase Auth's built-in avatar storage (`*.supabase.co/storage/v1/object/...`).

Files with AvatarImage:
- `components/community/PostCard.tsx` → `post.author.avatar_url`
- `components/teams/TeamMembersPanel.tsx` → `profile?.avatar_url`
- `components/teams/TeamOverviewCard.tsx` → `team.team_metadata.avatar_url`
- `components/teams/StudentsWithoutTeamsPanel.tsx` → `student.avatar_url`
- `components/teams/JoinTeamModal.tsx` → import only (likely in child)
- `components/teams/AllTeamsGrid.tsx` → `team.leader.profiles.avatar_url`, `member.profiles.avatar_url`
- `components/seeds/LobbyView.tsx` → import only
- `components/seeds/SeedRoomDashboard.tsx` → `profile?.avatar_url`
- `components/map/SubmissionList.tsx` → empty string `""` (placeholder)
- `components/map/InstructorGradingPanel.tsx` → empty string `""` (placeholder)
- `components/map/TeamNodeViewPanel.tsx` → `prof?.avatar_url`
- `components/ps/task-list.tsx` → `m.user?.avatar_url` (3 instances)
- `components/ps/build-leaderboard.tsx` → `user.avatarUrl`
- `components/ps/draggable-task.tsx` → `assignee.user?.avatar_url`
- `components/classroom/StudentProgressTable.tsx` → `student.user?.avatar_url`
- `components/classroom/StudentProgressView.tsx` → `student.user?.avatar_url`
- `components/classroom/InstructorManagement.tsx` → `instructor.profiles.avatar_url`
- `components/classroom/TeamDetailsModal.tsx` → avatar URL (team member)
- `components/classroom/ClassroomTeamsManager.tsx` → `student.avatar_url`
- `components/education/direction-finder/AIConversation.tsx` → AI avatar URL
- `components/user-nav.tsx` → user metadata avatar URL
- `components/journey/nodes/UserCenterNode.tsx` → `data.userAvatar`
- `app/profile/page.tsx` → `profile.avatar_url`
- `app/communities/page.tsx` → empty string (placeholder)
- `app/communities/[slug]/page.tsx` → empty string (placeholder)
- `app/settings/page.tsx` → `user?.user_metadata?.avatar_url`
- `app/map/[id]/grading/grading-table.tsx` → import only

**Note:** All `avatar_url` values originate from **Supabase Auth/Storage** (not B2). The `profiles` table stores them as raw Supabase storage URLs.

---

## B2 URL Construction

### How URLs Are Built

Three locations construct B2 URLs identically:

1. **`lib/backblaze.ts` (BackblazeB2 class):**
   ```typescript
   const fileUrl = `https://${this.bucketName}.${this.endpoint}/${fileName}`;
   // e.g. https://pseed-dev.s3.us-east-005.backblazeb2.com/submissions/user123/node456/1712345678_abc123.jpg
   ```

2. **`lib/storage/storage-manager.ts` (StorageManager.getImageUrl):**
   ```typescript
   return `https://${bucketName}.${endpoint}/${fileName}`;
   ```

3. **`app/api/upload/presigned/route.ts`:**
   ```typescript
   const fileUrl = `https://${process.env.B2_BUCKET_NAME}.${process.env.B2_ENDPOINT}/${presignedData.fileKey}`;
   ```

### Current Endpoint Patterns

| Config | Value |
|--------|-------|
| Bucket name (`B2_BUCKET_NAME`) | `pseed-dev` |
| Endpoint (`B2_ENDPOINT`) | `s3.us-east-005.backblazeb2.com` (production) / `s3.us-west-000.backblazeb2.com` (default/fallback) |
| URL pattern | `https://pseed-dev.s3.{region}.backblazeb2.com/{path}` |
| f005 (friendly URL) | `https://f005.backblazeb2.com/file/pseed-dev/{path}` — used for guidebook PDF and APK download |

### Storage Paths

| Purpose | Path |
|---------|------|
| Participant submissions | `submissions/{userId}/{nodeId}/{timestamp}_{random}.{ext}` |
| Map content files | `maps/{nodeId}/content/{timestamp}_{random}.{ext}` |
| Map cover images | `images/maps/{timestamp}_{fileName}` |
| Seed cover images | Same B2 upload, URL stored in `seeds.cover_image_url` |

### CDN Equivalent Patterns

A Cloudflare CDN at `cdn.passionseed.org` exists (per task context) that proxies to `f005.backblazeb2.com`.

**Current B2 URL → CDN URL transformation:**
- `https://pseed-dev.s3.us-east-005.backblazeb2.com/images/maps/123_cover.webp`
- → `https://cdn.passionseed.org/file/pseed-dev/images/maps/123_cover.webp`

**No existing CDN URL usage in codebase.** All current code uses the raw `bucket.endpoint` B2 URL format. The CDN infrastructure exists but is **not being used** in the application code.

---

## Migration Impact

### Impact of `images.unoptimized: true` in Production

Current config:
```javascript
// next.config.mjs
images: {
  unoptimized: process.env.NODE_ENV === "development",
  // ...
}
```

This means **production (`NODE_ENV !== "development"`) has `unoptimized: false`** — Vercel's image optimization is **active** for ALL `next/image` requests.

**What happens when we change to `unoptimized: true`:**
1. **Local static images** (`/passionseed-logo.svg`, `/hackathon/*.png`, etc.) — No negative impact. They are already served directly by Vercel. `next/image` will render `<img>` tags with correct sizes/sourceset attributes pointing to the origin.
2. **B2 images (`cover_image_url`, `cover_image_blurhash`)** — `OptimizedImage` component wraps `next/image`. With `unoptimized: true`, Vercel will NOT proxy/transform these. The raw B2 URLs will be served directly from Backblaze. This is actually **desired** since the CDN should handle caching/optimization.
3. **External URLs** (`https://qr-official.line.me/...`) — Already uses `unoptimized` prop in some cases (`app/app/beta/success/page.tsx`). Others would need the prop added or just serve directly.
4. **Supabase storage URLs** (`avatar_url`) — Supabase serves images directly, no Vercel optimization needed.

**Performance implication:** Without Vercel's optimization, you lose:
- Automatic WebP/AVIF conversion for JPEG/PNG images
- Automatic responsive sizing
- On-the-fly resizing

**These must be compensated for:**
- Map/seed cover images are already pre-processed to WebP with blurhash via `image-processor.ts` before upload to B2
- The CDN can handle caching and format negotiation
- `sizes` attributes should be set properly on `next/image` components

### Required URL Transformations

To use the CDN, B2 URLs must be rewritten:

```typescript
// Utility needed
function toCdnUrl(b2Url: string): string {
  // https://pseed-dev.s3.us-east-005.backblazeb2.com/images/maps/123_cover.webp
  // → https://cdn.passionseed.org/file/pseed-dev/images/maps/123_cover.webp
  const match = b2Url.match(/^https:\/\/pseed-dev\.s3\.[^/]+\.backblazeb2\.com\/(.+)$/);
  if (!match) return b2Url;
  return `https://cdn.passionseed.org/file/pseed-dev/${match[1]}`;
}
```

### Pages with Heavy Image Usage (Potential Edge Cases)

| Page | Image Count | Type | Risk |
|------|------------|------|------|
| `/map` (MapGallery) | Up to 20-50 MapCards per page, each with OptimizedImage + VinylRecord background | B2 cover images, local fallbacks | **HIGH** — heaviest page; each `next/image` call hits Vercel optimization in production |
| `/seeds` (SeedGallery) | Up to 20-50 GameBoxCards, each with `seed.cover_image_url` (plain `<img>`) | B2 cover images | **HIGH** — uses plain `<img>` tags so unaffected by `unoptimized` change, but still many external image requests |
| `/hackathon/*` (LandingPage, CelebrationPage) | ~10-15 local SVGs/PNGs | Local static | **MEDIUM** — local files, no optimization impact |
| `/communities` | CommunityCards with `cover_image_url` as CSS `background-image` | B2 URLs | **LOW** — CSS background, not next/image |
| `/app/beta` | ~6 local PNGs/SVGs | Local static | **LOW** — local files |
| `/hackathon/challenge` | Team submission images via `<img>` tags | B2 URLs | **MEDIUM** — but uses plain `<img>`, not next/image |
| Admin grading panels | Individual submission images (1 at a time) | B2 URLs | **LOW** — single image views |

**Key observation:** The heaviest image pages (`/map`, `/seeds`) display **B2 cover images that are already pre-processed** (WebP, blurhash, optimized sizes). They don't need Vercel's optimization — they need the CDN to serve them fast.

---

## Recommended Changes

### 1. Config Changes

**`next.config.mjs`:**
```javascript
images: {
  unoptimized: true,  // Disable Vercel image optimization entirely
  // Keep remotePatterns for Allowlist (required even when unoptimized)
  remotePatterns: [
    { protocol: "https", hostname: "*.backblazeb2.com" },
    { protocol: "https", hostname: "*.supabase.co" },
    { protocol: "https", hostname: "cdn.passionseed.org" },  // NEW
  ],
  // Remove formats — not needed when unoptimized
}
```

### 2. Code Changes Needed

#### A. Create CDN URL utility — HIGH PRIORITY

**New file: `lib/cdn-url.ts`**
```typescript
const CDN_BASE = "https://cdn.passionseed.org";
const B2_BUCKET = process.env.B2_BUCKET_NAME || "pseed-dev";
const B2_ENDPOINT = process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com";

export function toCdnUrl(b2Url: string): string {
  if (!b2Url) return "";
  
  // Already a CDN URL — pass through
  if (b2Url.startsWith(CDN_BASE)) return b2Url;
  
  // B2 raw URL → CDN URL
  const prefix = `https://${B2_BUCKET}.${B2_ENDPOINT}/`;
  if (b2Url.startsWith(prefix)) {
    const path = b2Url.slice(prefix.length);
    return `${CDN_BASE}/file/${B2_BUCKET}/${path}`;
  }
  
  // f005 friendly URL → CDN URL
  if (b2Url.match(/^https:\/\/f\d+\.backblazeb2\.com\/file\//)) {
    const url = new URL(b2Url);
    const path = url.pathname.replace(/^\/file\//, "");
    return `${CDN_BASE}/${path}`;
  }
  
  return b2Url;
}
```

#### B. Update B2 client to emit CDN URLs

**`lib/backblaze.ts`** — Modify URL construction in `uploadFile()`, `uploadImageBuffer()`, and `getImageUrl()` to return CDN URLs instead of raw B2 URLs. Or add a config flag:
```typescript
const USE_CDN = process.env.B2_USE_CDN === "true";
// Then: fileUrl = USE_CDN ? toCdnUrl(rawB2Url) : rawB2Url;
```

#### C. Update `lib/storage/storage-manager.ts`

`getImageUrl()` method needs to return CDN URLs when the CDN is configured.

#### D. Update `lib/hackathon/image-analysis.ts`

The `transformToBackblazeUrl()` function should also transform to CDN URLs (or the new `toCdnUrl` utility should be applied after the Supabase→B2 transformation).

#### E. Add `unoptimized` prop to external URL images

**`app/app/beta/success/page.tsx`** — Already has `unoptimized`. Good.
**`components/ps/CreateProjectModal.tsx`** — External album art URLs. Add `unoptimized`.
**`components/song-of-the-day/portal-vinyl.tsx`** — External album art. Uses plain `<img>`, no change needed.

#### F. Optimize `sizes` attributes on OptimizedImage

**`components/map/OptimizedImage.tsx`** — Ensure proper `sizes` prop to help the browser fetch the right resolution since Vercel won't resize. The images are already optimized (1200x800 WebP with blurhash), so this is mostly about correct display sizing.

### Files NOT needing changes
- `components/main-nav.tsx`, `components/landing-*.tsx`, `app/pitch/*.tsx` — Local static images. No change needed.
- All `AvatarImage` components — Supabase storage URLs. No optimization on those anyway.
- `<img>` tag users — Already bypass Vercel optimization.

### 3. Environment Variables Required

| Variable | Purpose | Value |
|----------|---------|-------|
| `B2_BUCKET_NAME` | Already exists | `pseed-dev` |
| `B2_ENDPOINT` | Already exists | `s3.us-east-005.backblazeb2.com` |
| `NEXT_PUBLIC_CDN_BASE` | **NEW** — CDN base URL for client-side URL construction | `https://cdn.passionseed.org` |
| `B2_USE_CDN` | **NEW** — Toggle CDN URL construction server-side | `true` |

### 4. Migration Rollout Strategy

1. **Phase 1:** Create `lib/cdn-url.ts` utility. Write tests.
2. **Phase 2:** Set `images.unoptimized: true` in next.config.mjs.
3. **Phase 3:** Update B2 client + StorageManager to emit CDN URLs.
4. **Phase 4:** Verify all pages render images correctly in staging.
5. **Phase 5:** Deploy to production with monitoring on image load times.
