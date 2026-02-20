import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeModelName } from "@/lib/ai/modelRegistry";
import { selectModelForUser } from "@/lib/ai/modelSelector";
import {
  generateCommitments,
  generateDirectionProfileCore,
  generatePrograms,
  generateVectorDetails,
} from "@/lib/ai/directionProfileEngine";
import type { AssessmentAnswers } from "@/types/direction-finder";

type JobStatus = "pending" | "processing" | "completed" | "failed";
type StepStatus = "pending" | "processing" | "completed" | "failed";
type JobStep = "core" | "programs" | "commitments";

type DirectionJob = {
  id: string;
  user_id: string;
  status: JobStatus;
  language: "en" | "th";
  input_data: {
    answers?: AssessmentAnswers;
    history?: { role: "user" | "assistant"; content: string }[];
    modelName?: string;
  } | null;
  step_core: StepStatus;
  step_programs: StepStatus;
  step_commitments: StepStatus;
  result_core: any;
  result_programs: any;
  retry_count: number;
};

const PROCESSOR_ID = `request-processor-${process.pid}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;
const MAX_DETAILS_CONCURRENCY = 2;

const MODELS_BY_PROVIDER = {
  google: ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-3-flash-preview"],
  openai: ["gpt-5-mini-2025-08-07", "gpt-5.2-chat-latest"],
  anthropic: ["claude-haiku-4-5"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
} as const;

function inferProvider(modelName?: string): keyof typeof MODELS_BY_PROVIDER {
  if (!modelName) return "google";
  if (modelName.includes("gemini")) return "google";
  if (modelName.includes("gpt") || modelName.includes("codex")) return "openai";
  if (modelName.includes("claude")) return "anthropic";
  if (modelName.includes("deepseek")) return "deepseek";
  return "google";
}

function providerIsConfigured(provider: keyof typeof MODELS_BY_PROVIDER): boolean {
  if (provider === "google") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

function buildModelFallbackChain(preferredModel?: string): string[] {
  const normalizedPreferred = normalizeModelName(preferredModel) ?? preferredModel;
  const preferredProvider = inferProvider(normalizedPreferred);
  const crossProviderOrder: (keyof typeof MODELS_BY_PROVIDER)[] = [
    "google",
    "openai",
    "anthropic",
    "deepseek",
  ];

  const orderedProviders = [
    preferredProvider,
    ...crossProviderOrder.filter((provider) => provider !== preferredProvider),
  ];

  const chain: string[] = orderedProviders.flatMap((provider) =>
    MODELS_BY_PROVIDER[provider].filter(() => providerIsConfigured(provider)),
  );

  if (
    normalizedPreferred &&
    providerIsConfigured(inferProvider(normalizedPreferred)) &&
    !chain.includes(normalizedPreferred)
  ) {
    chain.unshift(normalizedPreferred);
  }

  return Array.from(new Set(chain));
}

function isRetriableProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("overloaded") ||
    message.includes("temporary")
  );
}

async function runWithModelFallback<T>(
  preferredModel: string | undefined,
  operation: (modelName: string) => Promise<T>,
): Promise<{ result: T; modelName: string; attempts: number }> {
  const fallbackChain = buildModelFallbackChain(preferredModel);
  if (fallbackChain.length === 0) {
    throw new Error("No AI model is configured for processing");
  }
  let lastError: unknown;

  for (let i = 0; i < fallbackChain.length; i += 1) {
    const modelName = fallbackChain[i];

    try {
      const result = await operation(modelName);
      return { result, modelName, attempts: i + 1 };
    } catch (error) {
      lastError = error;
      if (!isRetriableProviderError(error) || i === fallbackChain.length - 1) {
        break;
      }
    }
  }

  throw lastError;
}

function getNextPendingStep(job: DirectionJob): JobStep | null {
  if (job.step_core === "pending") return "core";
  if (job.step_core === "completed" && job.step_programs === "pending") return "programs";
  if (job.step_programs === "completed" && job.step_commitments === "pending") return "commitments";
  return null;
}

function getStepColumn(step: JobStep): "step_core" | "step_programs" | "step_commitments" {
  if (step === "core") return "step_core";
  if (step === "programs") return "step_programs";
  return "step_commitments";
}

function getPreferredModel(job: DirectionJob, userId: string): string {
  const requested = job.input_data?.modelName;
  const normalizedRequested = normalizeModelName(requested);
  if (normalizedRequested) return normalizedRequested;
  return selectModelForUser(userId);
}

function getJobInput(job: DirectionJob): {
  answers: AssessmentAnswers;
  history: { role: "user" | "assistant"; content: string }[];
} {
  const answers = job.input_data?.answers;
  const history = job.input_data?.history;

  if (!answers) {
    throw new Error("Missing assessment answers in job input");
  }
  if (!Array.isArray(history)) {
    throw new Error("Missing conversation history in job input");
  }

  return { answers, history };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function claimStep(job: DirectionJob, step: JobStep): Promise<boolean> {
  const admin = createAdminClient();
  const stepColumn = getStepColumn(step);

  const { data, error } = await admin
    .from("direction_finder_jobs")
    .update({
      [stepColumn]: "processing",
      processing_started_at: new Date().toISOString(),
      processed_by: PROCESSOR_ID,
      error: null,
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id)
    .eq(stepColumn, "pending")
    .select("id");

  if (error) {
    throw error;
  }

  return Boolean(data && data.length > 0);
}

async function completeStep(
  job: DirectionJob,
  step: JobStep,
  updates: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const stepColumn = getStepColumn(step);

  const { error } = await admin
    .from("direction_finder_jobs")
    .update({
      ...updates,
      [stepColumn]: "completed",
      processing_started_at: null,
      processed_by: null,
      error: null,
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id)
    .eq(stepColumn, "processing");

  if (error) {
    throw error;
  }
}

async function failStep(job: DirectionJob, step: JobStep, errorMessage: string): Promise<void> {
  const admin = createAdminClient();
  const stepColumn = getStepColumn(step);

  const safeErrorMessage = errorMessage.slice(0, 1200);

  const { error } = await admin
    .from("direction_finder_jobs")
    .update({
      [stepColumn]: "failed",
      retry_count: (job.retry_count ?? 0) + 1,
      error: safeErrorMessage,
      processing_started_at: null,
      processed_by: null,
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id)
    .eq(stepColumn, "processing");

  if (error) {
    console.error("Failed to mark step as failed", error);
  }
}

async function getJobForUser(
  request: Request,
  jobId: string,
): Promise<{ userId: string; job: DirectionJob | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  let userId: string | null = null;
  if (!authError && user) {
    userId = user.id;
  }

  if (!userId) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (token) {
      const admin = createAdminClient();
      const {
        data: { user: bearerUser },
        error: bearerError,
      } = await admin.auth.getUser(token);
      if (!bearerError && bearerUser) {
        userId = bearerUser.id;
      }
    }
  }

  if (!userId) {
    return null;
  }

  const admin = createAdminClient();
  const { data: job, error: fetchError } = await admin
    .from("direction_finder_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !job) {
    return { userId, job: null };
  }

  return { userId, job: job as DirectionJob };
}

async function processCoreStep(job: DirectionJob, preferredModel: string): Promise<Record<string, unknown>> {
  const { answers, history } = getJobInput(job);

  const coreRun = await runWithModelFallback(preferredModel, (modelName) =>
    generateDirectionProfileCore(history, answers, modelName, job.language),
  );

  const vectors = (coreRun.result as any)?.vectors || [];
  const detailedVectors = await mapWithConcurrency(vectors, MAX_DETAILS_CONCURRENCY, async (vector: any) => {
    const detailsRun = await runWithModelFallback(coreRun.modelName, (modelName) =>
      generateVectorDetails(vector, answers, modelName, job.language),
    );
    return detailsRun.result;
  });

  const mergedVectors = vectors.map((vector: any, index: number) => ({
    ...vector,
    ...detailedVectors[index],
  }));

  const coreResult = {
    ...(coreRun.result as any),
    vectors: mergedVectors,
    debugMetadata: {
      ...(coreRun.result as any)?.debugMetadata,
      modelUsed: coreRun.modelName,
      fallbackAttempts: coreRun.attempts,
    },
  };

  return {
    result_core: coreResult,
  };
}

async function processProgramsStep(job: DirectionJob, preferredModel: string): Promise<Record<string, unknown>> {
  const { answers } = getJobInput(job);

  if (!job.result_core) {
    throw new Error("Core result is required before programs step");
  }

  const programsRun = await runWithModelFallback(preferredModel, (modelName) =>
    generatePrograms(job.result_core, answers, modelName, job.language),
  );

  return {
    result_programs: {
      ...(programsRun.result as any),
      debugMetadata: {
        ...((programsRun.result as any)?.debugMetadata ?? {}),
        modelUsed: programsRun.modelName,
        fallbackAttempts: programsRun.attempts,
      },
    },
  };
}

async function processCommitmentsStep(job: DirectionJob, preferredModel: string): Promise<Record<string, unknown>> {
  const { answers } = getJobInput(job);

  if (!job.result_core) {
    throw new Error("Core result is required before commitments step");
  }

  const commitmentsRun = await runWithModelFallback(preferredModel, (modelName) =>
    generateCommitments(job.result_core, answers, modelName, job.language),
  );

  return {
    result_commitments: {
      ...(commitmentsRun.result as any),
      debugMetadata: {
        ...((commitmentsRun.result as any)?.debugMetadata ?? {}),
        modelUsed: commitmentsRun.modelName,
        fallbackAttempts: commitmentsRun.attempts,
      },
    },
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const userJob = await getJobForUser(request, jobId);

    if (!userJob) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, job } = userJob;
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({
        jobId,
        status: job.status,
        message: "Job already finalized",
      });
    }

    const nextStep = getNextPendingStep(job);
    if (!nextStep) {
      return NextResponse.json({
        jobId,
        status: job.status,
        message: "No pending step to process",
      });
    }

    const claimed = await claimStep(job, nextStep);
    if (!claimed) {
      return NextResponse.json(
        {
          jobId,
          status: "processing",
          message: `Step ${nextStep} is already being processed`,
        },
        { status: 202 },
      );
    }

    const preferredModel = getPreferredModel(job, userId);

    try {
      let updates: Record<string, unknown> = {};
      if (nextStep === "core") {
        updates = await processCoreStep(job, preferredModel);
      } else if (nextStep === "programs") {
        updates = await processProgramsStep(job, preferredModel);
      } else if (nextStep === "commitments") {
        updates = await processCommitmentsStep(job, preferredModel);
      }

      await completeStep(job, nextStep, updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failStep(job, nextStep, message);
      return NextResponse.json(
        {
          jobId,
          status: "failed",
          step: nextStep,
          error: message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobId,
      status: "processing",
      step: nextStep,
      message: `Processed step: ${nextStep}`,
    });
  } catch (error) {
    console.error("Error in /api/direction/process/[jobId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
