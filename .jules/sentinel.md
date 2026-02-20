## 2025-05-24 - Map Batch Update Input Sanitization
**Vulnerability:** Identified that `batchUpdateMap` function in `lib/supabase/maps.ts` accepted raw user input for `title`, `description`, `instructions`, and quiz content without sanitization. Since this function is used by both the API and client-side components (which bypass the API), malformed HTML or scripts could be persisted to the database, leading to Stored XSS.
**Learning:** Functions that write to the database and are shared between client and server (or exposed via direct client calls like Supabase) must implement their own input validation and sanitization. Relying on API route middleware/validation is insufficient if the database layer can be accessed directly or via shared libraries running on the client.
**Prevention:**
1. Identify all data entry points to the database (especially shared libraries).
2. Implement strict input sanitization (using `isomorphic-dompurify`) at the lowest common denominator function (e.g., the batch update function itself) rather than just at the API surface.
3. Use a centralized sanitization utility (`lib/security/sanitize-html.ts`) to ensure consistent rules across the application.
