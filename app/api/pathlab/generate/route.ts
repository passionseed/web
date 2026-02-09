import { NextRequest, NextResponse } from "next/server";
import {
  generatePathLabDraft,
} from "@/lib/ai/pathlab-generator";
import { pathLabGeneratorRequestSchema, pathLabGeneratorDraftSchema } from "@/lib/ai/pathlab-generator-schema";
import { isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import { createPathLabDraftFromGeneration } from "@/lib/pathlab/generation-persistence";
import { hasAdminOrInstructorRole, requireAuth } from "./_auth";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const roleAllowed = await hasAdminOrInstructorRole(supabase, user.id);
    if (!roleAllowed) {
      return NextResponse.json(
        { error: "Forbidden - admin or instructor role required" },
        { status: 403 },
      );
    }

    const rawBody = await request.json();

    // Support both new format { params, draft?, cacheKey? } and legacy format (direct params)
    let input: z.infer<typeof pathLabGeneratorRequestSchema>;
    let providedDraft: z.infer<typeof pathLabGeneratorDraftSchema> | undefined;
    let cacheKey: string | undefined;

    // Check if this is the new format with params/draft structure
    if (rawBody.params) {
      const newFormatSchema = z.object({
        params: pathLabGeneratorRequestSchema,
        draft: pathLabGeneratorDraftSchema.optional(),
        cacheKey: z.string().optional(), // TODO: For optimization #4 - draft caching
      });
      const parsed = newFormatSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid request payload",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      input = parsed.data.params;
      providedDraft = parsed.data.draft;
      cacheKey = parsed.data.cacheKey;
    } else {
      // Legacy format: body is the params directly
      const parsed = pathLabGeneratorRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid request payload",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }
      input = parsed.data;
      providedDraft = undefined;
    }

    if (isUnsafePathLabPrompt({ topic: input.topic, constraints: input.constraints })) {
      return NextResponse.json(
        {
          error: "Topic or constraints are blocked by safety policy",
        },
        { status: 400 },
      );
    }

    // TODO: OPTIMIZATION #4 - Draft Caching (Part 2)
    // ================================================
    // This API should check if a cached draft exists before regenerating.
    //
    // IMPLEMENTATION APPROACH:
    // 1. If cacheKey is provided, attempt to retrieve from cache:
    //    ```typescript
    //    let draft = providedDraft;
    //    if (!draft && cacheKey) {
    //      const cached = await cache.get(cacheKey);
    //      if (cached) {
    //        const cacheData = JSON.parse(cached);
    //        // Verify the cached params match the current input
    //        if (JSON.stringify(cacheData.params) === JSON.stringify(input)) {
    //          draft = cacheData.draft;
    //          console.log('Using cached draft from preview');
    //        }
    //      }
    //    }
    //    if (!draft) {
    //      draft = await generatePathLabDraft(input);
    //    }
    //    ```
    //
    // 2. Cache validation:
    //    - Verify the cache hasn't expired (should be automatic with Redis TTL)
    //    - Verify the params match exactly (prevent using wrong cached draft)
    //    - Fallback to generation if cache miss or mismatch
    //
    // 3. After using cache, optionally delete the key:
    //    ```typescript
    //    if (cacheKey) {
    //      await cache.del(cacheKey); // Prevent reuse
    //    }
    //    ```
    //
    // 4. Benefits:
    //    - Instant "Accept Draft" flow (no AI generation delay)
    //    - Guaranteed consistency between preview and final draft
    //    - Significant cost savings on AI API calls
    //
    // 5. Frontend integration:
    //    - PathLabGeneratorChat passes cacheKey to handleAIGenerationComplete
    //    - MapEditor includes cacheKey in generate API call
    //
    // 6. Implementation priority: Low for MVP, Medium for production
    // ================================================

    // Use provided draft if available, otherwise generate new one
    const draft = providedDraft || await generatePathLabDraft(input);

    console.info("[pathlab.generate] using", {
      providedDraft: !!providedDraft,
      regenerated: !providedDraft,
    });

    const quality = validatePathLabDraft(draft);

    if (!quality.valid) {
      return NextResponse.json(
        {
          error: "Generated draft failed validation",
          issues: quality.issues,
        },
        { status: 422 },
      );
    }

    const persisted = await createPathLabDraftFromGeneration({
      userId: user.id,
      request: input,
      draft,
    });

    console.info("[pathlab.generate] success", {
      userId: user.id,
      seedId: persisted.seedId,
      mapId: persisted.mapId,
      pathId: persisted.pathId,
      dayCount: persisted.dayCount,
      nodeCount: persisted.nodeCount,
      warningCount: quality.warnings.length,
    });

    return NextResponse.json({
      seedId: persisted.seedId,
      mapId: persisted.mapId,
      pathId: persisted.pathId,
      dayCount: persisted.dayCount,
      nodeCount: persisted.nodeCount,
      warnings: quality.warnings.map((warning) => warning.message),
    });
  } catch (error: any) {
    console.error("[pathlab.generate] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate PathLab draft",
      },
      { status: 500 },
    );
  }
}
