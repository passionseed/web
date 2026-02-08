import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generatePathLabDraft,
  regeneratePathLabDay,
  regeneratePathLabNode,
} from "@/lib/ai/pathlab-generator";
import { validatePathLabDraft } from "@/lib/pathlab/generation-quality";
import {
  getPathLabDraftSnapshot,
  patchPathLabDay,
  patchPathLabNode,
  replacePathLabDraftFromGeneration,
  snapshotToDraft,
  snapshotToGeneratorRequest,
} from "@/lib/pathlab/generation-persistence";
import { canManagePathLabSeed, requireAuth } from "../_auth";

const regenerateRequestSchema = z
  .object({
    seedId: z.string().uuid(),
    scope: z.enum(["all", "day", "node"]),
    dayNumber: z.coerce.number().int().min(1).optional(),
    nodeId: z.string().uuid().optional(),
    nodeKey: z.string().min(1).optional(),
    topic: z.string().min(2).max(160).optional(),
    audience: z.string().min(2).max(120).optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    totalDays: z.coerce.number().int().min(1).max(30).optional(),
    tone: z.string().min(2).max(80).optional(),
    constraints: z.string().max(1000).optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "day" && !value.dayNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "dayNumber is required when scope=day",
        path: ["dayNumber"],
      });
    }

    if (value.scope === "node" && !value.nodeId && !value.nodeKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "nodeId or nodeKey is required when scope=node",
        path: ["nodeId"],
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsedBody = regenerateRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;

    const allowed = await canManagePathLabSeed(supabase, user, body.seedId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await getPathLabDraftSnapshot(body.seedId);

    const baseRequest = {
      ...snapshotToGeneratorRequest(snapshot),
      topic: body.topic || snapshot.seed.title,
      audience: body.audience || "General learners",
      difficulty: body.difficulty || "intermediate",
      totalDays: body.totalDays || snapshot.path.total_days,
      tone: body.tone || "encouraging",
      constraints: body.constraints ?? snapshot.seed.description ?? undefined,
      categoryId: body.categoryId ?? snapshot.seed.category_id,
    };

    if (body.scope === "all") {
      const draft = await generatePathLabDraft(baseRequest);
      const quality = validatePathLabDraft(draft);

      if (!quality.valid) {
        return NextResponse.json(
          {
            error: "Regenerated draft failed validation",
            issues: quality.issues,
          },
          { status: 422 },
        );
      }

      const persisted = await replacePathLabDraftFromGeneration({
        seedId: body.seedId,
        request: baseRequest,
        draft,
      });

      return NextResponse.json({
        scope: "all",
        ...persisted,
        warnings: quality.warnings.map((warning) => warning.message),
      });
    }

    if (body.scope === "day") {
      const dayNumber = Number(body.dayNumber);
      const day = snapshot.days.find((entry) => entry.day_number === dayNumber);
      if (!day) {
        return NextResponse.json(
          { error: `Day ${dayNumber} does not exist for this draft` },
          { status: 404 },
        );
      }

      const nodeTitleById = new Map(snapshot.nodes.map((node) => [node.id, node.title]));
      const dayNodeTitles = day.node_ids
        .map((nodeId) => nodeTitleById.get(nodeId))
        .filter((value): value is string => Boolean(value));

      const dayPatch = await regeneratePathLabDay({
        ...baseRequest,
        dayNumber,
        nodeTitles: dayNodeTitles,
      });

      const persisted = await patchPathLabDay({
        seedId: body.seedId,
        dayNumber,
        patch: dayPatch,
      });

      const currentDraft = snapshotToDraft(await getPathLabDraftSnapshot(body.seedId));
      const quality = validatePathLabDraft(currentDraft);

      return NextResponse.json({
        scope: "day",
        dayNumber,
        ...persisted,
        warnings: quality.warnings.map((warning) => warning.message),
      });
    }

    const node = body.nodeId
      ? snapshot.nodes.find((entry) => entry.id === body.nodeId)
      : snapshot.nodes.find((entry) => entry.key === body.nodeKey);

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const nodePatch = await regeneratePathLabNode({
      ...baseRequest,
      nodeTitle: node.title,
    });

    const persisted = await patchPathLabNode({
      seedId: body.seedId,
      nodeId: node.id,
      patch: nodePatch,
    });

    const currentDraft = snapshotToDraft(await getPathLabDraftSnapshot(body.seedId));
    const quality = validatePathLabDraft(currentDraft);

    return NextResponse.json({
      scope: "node",
      nodeId: node.id,
      ...persisted,
      warnings: quality.warnings.map((warning) => warning.message),
    });
  } catch (error: any) {
    console.error("[pathlab.generate.regenerate] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to regenerate PathLab draft",
      },
      { status: 500 },
    );
  }
}
