import { NextRequest, NextResponse } from "next/server";
import { generatePathLabDraft } from "@/lib/ai/pathlab-generator";
import { pathLabGeneratorRequestSchema } from "@/lib/ai/pathlab-generator-schema";
import { isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import { hasAdminOrInstructorRole, requireAuth } from "../generate/_auth";

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
    const parsedBody = pathLabGeneratorRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsedBody.data;

    if (isUnsafePathLabPrompt({ topic: input.topic, constraints: input.constraints })) {
      return NextResponse.json(
        {
          error: "Topic or constraints are blocked by safety policy",
        },
        { status: 400 },
      );
    }

    // Generate draft without persisting
    const draft = await generatePathLabDraft(input);
    const validation = validatePathLabDraft(draft);

    // TODO: OPTIMIZATION #4 - Draft Caching
    // ================================================
    // Currently, the preview API generates a draft that the user reviews. If they accept,
    // the generate API regenerates the SAME draft, wasting time and AI credits.
    //
    // IMPLEMENTATION APPROACH:
    // 1. After generating the draft here, cache it with a composite key:
    //    - Key format: `pathlab:draft:${userId}:${timestamp}` or `pathlab:draft:${sessionId}`
    //    - Store both the draft and the params used to generate it
    //    - Set TTL to 5 minutes (300 seconds)
    //
    // 2. Cache storage options:
    //    a) In-memory cache (for single-server deployments):
    //       - Use a Map() with periodic cleanup
    //       - Example: draftCache.set(cacheKey, { draft, params, expiresAt })
    //
    //    b) Redis (for production/multi-server):
    //       - Use Upstash Redis or standard Redis
    //       - Example: await redis.setex(cacheKey, 300, JSON.stringify({ draft, params }))
    //
    // 3. Cache key structure:
    //    ```typescript
    //    const cacheKey = `pathlab:draft:${user.id}:${Date.now()}`;
    //    const cacheData = {
    //      draft,
    //      params: input,
    //      generatedAt: new Date().toISOString(),
    //    };
    //    await cache.set(cacheKey, JSON.stringify(cacheData), { ex: 300 });
    //    ```
    //
    // 4. Return the cache key in the response:
    //    ```typescript
    //    return NextResponse.json({
    //      draft,
    //      validation,
    //      stats,
    //      cacheKey, // Frontend passes this to generate API
    //    });
    //    ```
    //
    // 5. Benefits:
    //    - Eliminates redundant AI generation calls
    //    - Faster "Accept Draft" response time (instant vs 10-30 seconds)
    //    - Reduces AI API costs
    //    - Ensures user sees exactly what they accepted
    //
    // 6. Implementation priority: Low for MVP, Medium for production
    //    - Can defer until after core functionality is stable
    //    - Significant cost savings for high-usage scenarios
    // ================================================

    // Calculate stats
    const stats = {
      dayCount: draft.days.length,
      nodeCount: draft.nodes.length,
      edgeCount: draft.edges.length,
      assessmentCount: draft.nodes.filter((node) => node.assessment.type !== "none").length,
    };

    console.info("[pathlab.preview] generated", {
      userId: user.id,
      stats,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    });

    return NextResponse.json({
      draft,
      validation,
      stats,
    });
  } catch (error: any) {
    console.error("[pathlab.preview] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to generate PathLab preview",
      },
      { status: 500 },
    );
  }
}
