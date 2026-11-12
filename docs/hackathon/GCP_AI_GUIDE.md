# GCP AI Integration Guide for Hackathon Learning Analytics

> **Purpose**: This guide documents how Google Cloud Platform (GCP) AI services are used throughout the PassionSeed codebase, specifically for the hackathon learning analytics system and related features. Use this as a reference when building or modifying AI-powered features.

---

## Table of Contents

1. [Overview](#overview)
2. [GCP AI Services We Use](#gcp-ai-services-we-use)
3. [Authentication & Setup](#authentication--setup)
4. [Core Patterns](#core-patterns)
5. [Hackathon Learning Analytics](#hackathon-learning-analytics)
6. [Other AI Features](#other-ai-features)
7. [Model Registry & A/B Testing](#model-registry--ab-testing)
8. [Embeddings with Gemini](#embeddings-with-gemini)
9. [Error Handling & Retries](#error-handling--retries)
10. [Security & Best Practices](#security--best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The PassionSeed platform uses GCP AI (primarily Google's Gemini models) for multiple features:

- **Hackathon Learning Analytics**: Scoring student submissions for plan fidelity, AI likelihood, and phase-3 cycle rigor
- **Expert Interview**: Real-time career guidance conversations
- **PathLab Generation**: AI-generated learning paths and curricula
- **Direction Finder**: Student career direction conversations
- **North Star Enhancement**: Vision clarification and milestone generation
- **Embedding Search**: Semantic search over submissions and content

---

## GCP AI Services We Use

### 1. Gemini Generative AI (via AI SDK)

**Primary SDK**: `@ai-sdk/google` (Vercel AI SDK)

**Models used**:
| Model | Use Case | Speed | Cost |
|-------|----------|-------|------|
| `gemini-3-flash-preview` | Default for most features | Fast | Low |
| `gemini-2.5-flash` | PathLab generation, structured output | Fast | Low |
| `gemini-flash-lite-latest` | Lightweight tasks, high volume | Fastest | Lowest |
| `gemini-embedding-2` | Text embeddings for search | N/A | Low |

### 2. Vertex AI (Direct REST API)

**Use case**: Batch analytics scripts that need higher throughput or specific model versions.

**Endpoint**: `https://aiplatform.googleapis.com/v1/publishers/google/models/{modelId}:generateContent`

**Models used via Vertex**:
- `gemini-3.5-flash` (for hackathon submission scoring)

### 3. Google GenAI SDK (Legacy)

**SDK**: `@google/genai`

**Use case**: Direct Gemini API calls for simple text generation (North Star enhancement, embeddings).

---

## Authentication & Setup

### Environment Variables

```bash
# Required for most features
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...        # AI SDK Google provider
GEMINI_API_KEY=AIzaSy...                       # Fallback for @google/genai SDK

# Required for Vertex AI (batch scripts)
VERTEX_API_KEY=...                               # GCP API key for aiplatform.googleapis.com

# Optional: For local database connections in scripts
LOCAL_DB_URL=postgresql://...                   # Local Postgres for analytics scripts
```

### Setting Up API Keys

All API keys are provisioned through **Google Cloud Console**. We do not use Google AI Studio.

#### Option 1: Generative Language API (Application Features)

1. Go to https://console.cloud.google.com/
2. Create or select a project
3. Enable **Generative Language API** in APIs & Services > Library
4. Create credentials: APIs & Services > Credentials > Create API Key
5. Restrict the key to **Generative Language API** only
6. Set up billing for production scale
7. Add to environment:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...your-key-here...
   ```

#### Option 2: Vertex AI API (Batch Processing Scripts)

1. In Google Cloud Console, enable **Vertex AI API**
2. Create an API key with Vertex AI access
3. Restrict the key to **Vertex AI API** only
4. Use the global endpoint:
   ```
   https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent?key={VERTEX_API_KEY}
   ```
5. Add to environment:
   ```bash
   VERTEX_API_KEY=...your-key-here...
   ```

---

## Core Patterns

### Pattern 1: Using the Model Registry (Recommended)

All AI calls should go through the centralized model registry at `lib/ai/modelRegistry.ts`:

```typescript
import { getModel } from "@/lib/ai/modelRegistry";
import { generateObject } from "ai";
import { z } from "zod";

const schema = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string(),
});

const { object } = await generateObject({
  model: getModel("gemini-3-flash-preview"),  // or omit for default
  schema,
  system: "You are a learning analyst...",
  prompt: "Analyze this submission: ...",
  temperature: 0.3,
});
```

**Why use the registry?**
- Normalizes model names (handles `google/`, `models/`, `v1beta/models/` prefixes)
- Maps legacy aliases (`gemini-3-flash` → `gemini-3-flash-preview`)
- Supports A/B testing via `modelSelector.ts`
- Falls back gracefully to default model

### Pattern 2: Direct Google GenAI SDK (Legacy)

For simple text generation without structured output:

```typescript
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const response = await genAI.models.generateContent({
  model: "gemini-flash-latest",
  contents: "Summarize this text...",
});

const text = response.text;
```

**Note**: Prefer `generateObject` from the AI SDK for structured outputs. It handles JSON parsing, schema validation, and retries automatically.

### Pattern 3: Vertex AI Direct REST (For Scripts)

For batch processing scripts that need raw control:

```typescript
const VERTEX_KEY = process.env.VERTEX_API_KEY;
const modelId = "gemini-3.5-flash";
const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${modelId}:generateContent?key=${VERTEX_KEY}`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: { /* OpenAPI-style schema */ },
      temperature: 0.3,
    },
  }),
});

const data = await res.json();
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
const result = JSON.parse(text);
```

---

## Hackathon Learning Analytics

The hackathon learning analytics system uses GCP AI to score student submissions across multiple dimensions.

### File: `scripts/hackathon-learning/compute-fidelity.ts`

**Purpose**: Score Phase 1-2 submissions for plan fidelity and AI likelihood.

**How it works**:
1. Loads all submitted text answers from the database
2. For each submission, builds a prompt with the activity spec (learning goal, criteria, red flags, exemplars)
3. Calls AI to generate a structured score:
   - `plan_fidelity` (0-1): How well the submission fulfills the activity's intent
   - `criteria_met`: Which criteria are satisfied
   - `red_flags_hit`: Which red flags are present
   - `exemplar_proximity`: "strong", "mixed", or "weak"
   - `ai_likelihood` (0-1): Independent estimate of AI-generated text probability
   - `rationale`: 1-2 sentences citing concrete evidence

**Model support**:
- Default: Uses `getModel()` from registry (gemini-3-flash-preview)
- `--model=groq:...`: Uses Groq-hosted models (fast, cheap)
- `--model=gemini-...`: Uses Google AI SDK directly
- `--model=vertex:gemini-3.5-flash`: Uses Vertex AI REST API

**Usage**:
```bash
# Preview (no DB write)
pnpm tsx scripts/hackathon-learning/compute-fidelity.ts --activity=1 --phase=2 --limit=12

# Full write
pnpm tsx scripts/hackathon-learning/compute-fidelity.ts --write

# With Vertex AI
VERTEX_API_KEY=... pnpm tsx scripts/hackathon-learning/compute-fidelity.ts --write --model=vertex:gemini-3.5-flash
```

### File: `scripts/hackathon-learning/compute-phase3.ts`

**Purpose**: Score Phase 3 experiment cycles on a 5-dimension rubric.

**Dimensions** (each 0-20, total 0-100):
- `hypothesis_quality`: Is the hypothesis falsifiable, specific, and non-obvious?
- `variable_isolation`: Did they change exactly ONE variable vs the prior cycle?
- `behavioral_evidence`: Concrete behavioral observations, not just opinions?
- `tester_freshness`: Testing with fresh testers (not friends/team members)?
- `synthesis_honesty`: Honest reporting, including negative results and being wrong?

**Additional signal**:
- `honest_wrongness`: Boolean, did the team genuinely admit something they got wrong?

**Usage**:
```bash
# Preview
VERTEX_API_KEY=... pnpm tsx scripts/hackathon-learning/compute-phase3.ts --limit=8 --model=vertex:gemini-3.5-flash

# Full write
VERTEX_API_KEY=... pnpm tsx scripts/hackathon-learning/compute-phase3.ts --write --model=vertex:gemini-3.5-flash
```

### File: `scripts/hackathon-learning/compute-video.ts`

**Purpose**: Analyze video submissions (if applicable).

### File: `scripts/hackathon-learning/compute-journey.ts`

**Purpose**: Compute learning journey metrics across phases.

---

## Other AI Features

### Expert Interview (`lib/expert-interview/chat-service.ts`)

- **Model**: `gemini-2.5-flash` (configurable)
- **Purpose**: Real-time career guidance conversation
- **Pattern**: Uses `generateObject` with conversation history for structured responses

### PathLab Generator (`lib/ai/pathlab-generator.ts`)

- **Model**: `gemini-2.5-flash`
- **Purpose**: Generate structured learning paths (days, nodes, edges, assessments)
- **Pattern**: `generateObject` with Zod schema + prompt builders
- **Safety**: Input sanitization via `isUnsafePathLabPrompt()` and `cleanText()` functions

### Direction Finder Conversation (`lib/ai/conversationEngine.ts`)

- **Model**: Configurable via `modelName` parameter, defaults through registry
- **Purpose**: Guide students to find their career direction
- **Pattern**: `generateObject` with rich system prompts including student profile context
- **Error handling**: Graceful degradation on quota errors (returns fallback messages)

### North Star Enhancer (`lib/ai/north-star-enhancer.ts`)

- **Model**: `gemini-flash-latest` (via `@google/genai` SDK)
- **Purpose**: Enhance vision text and generate milestones
- **Languages**: Supports both English and Thai
- **Pattern**: Direct SDK calls with language-specific prompts

### University Recommender (`lib/ai/universityRecommender.ts`)

- **Model**: Through registry
- **Purpose**: Generate university recommendations based on student profiles

---

## Model Registry & A/B Testing

### File: `lib/ai/modelRegistry.ts`

The central hub for all AI model access.

**Providers configured**:
- Google (Gemini models)
- Anthropic (Claude)
- OpenAI (GPT series)
- MiniMax (via Anthropic-compatible endpoint)
- Kimi (via Fireworks AI endpoint)
- DeepSeek (disabled)

**Key functions**:
```typescript
// Get a model instance for use with AI SDK
const model = getModel("gemini-3-flash-preview");

// Or let A/B testing select the model
const model = getModel(selectModelForUser(userId));

// Normalize model names from various formats
const normalized = normalizeModelName("google/gemini-2.5-flash");
// → "gemini-2.5-flash"
```

### File: `lib/ai/modelSelector.ts`

Deterministic A/B testing for model comparison.

**Distribution**:
- 40% Google (gemini-3-flash-preview, gemini-flash-lite-latest)
- 30% Anthropic (claude-haiku-4-5)
- 30% OpenAI (gpt-5-mini, gpt-5.2-chat)

**Usage**:
```typescript
import { selectModelForUser } from "@/lib/ai/modelSelector";

const modelName = selectModelForUser(userId);  // Deterministic per user
const model = getModel(modelName);
```

---

## Embeddings with Gemini

### File: `lib/embeddings/gemini.ts`

Generates text embeddings using `gemini-embedding-2`.

**Key features**:
- Batch processing (default batch size: 64)
- Empty text handling (returns zero vectors)
- SHA-256 hashing for text deduplication
- 1024-dimensional vectors

**Usage**:
```typescript
import { embedTexts, embedText, formatVectorLiteral } from "@/lib/embeddings/gemini";

// Single text
const vector = await embedText("Student submission text...");

// Batch
const vectors = await embedTexts(["text1", "text2", "text3"]);

// For Postgres pgvector
const literal = formatVectorLiteral(vector);  // "[0.1,0.2,...]"
```

**Note on task prefixes**: The Gemini 2 embedding model recommends task prefixes for retrieval tasks. Currently, the embedding function passes raw text, but you may want to add prefixes like `task: clustering | query: {text}` for specific use cases.

---

## Error Handling & Retries

### Retry Pattern (used in analytics scripts)

```typescript
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));  // Exponential backoff
    }
  }
  throw lastErr;
}

// Usage
const result = await withRetry(() =>
  generateObject({ model, schema, system, prompt })
);
```

### Quota Error Handling (in conversation features)

```typescript
try {
  const { object } = await generateObject({ ... });
  return object;
} catch (error: any) {
  const msg = error?.message || "";
  if (msg.toLowerCase().includes("quota") || msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
    console.warn("AI Quota exceeded. Returning fallback...");
    return { messages: ["I'm a bit overwhelmed right now..."], options: ["Try again"] };
  }
  throw error;
}
```

---

## Security & Best Practices

### 1. Never Commit API Keys

- `.env.local` is in `.gitignore`
- Use environment variables in production (Vercel, etc.)
- Rotate keys periodically

### 2. Restrict API Keys

In Google Cloud Console > Credentials:
- API restrictions: Limit to "Generative Language API" or "Vertex AI API"
- Application restrictions: Use HTTP referrers or IP addresses for production

### 3. Input Sanitization

Always sanitize AI inputs to prevent prompt injection:

```typescript
function cleanText(input: string | null | undefined, fallback = ""): string {
  const value = (input || "")
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .trim();
  return value || fallback;
}
```

### 4. Temperature Settings

- **0.0-0.2**: Factual extraction, structured data (PathLab generation)
- **0.3-0.4**: Analytical tasks (submission scoring)
- **0.5-0.7**: Creative tasks (conversation, enhancement)

### 5. Max Duration

Vercel functions have a max duration. For AI-heavy operations:

```typescript
export const maxDuration = 300;  // 5 minutes (Vercel Pro limit)
```

---

## Troubleshooting

### "API key not valid"
- Check key is copied correctly (no extra spaces)
- Verify key is enabled in Google Cloud Console
- Ensure the correct API (Generative Language or Vertex AI) is enabled

### "Quota exceeded" / 429 errors
- You've hit rate limits (15 RPM on free tier)
- Wait 1 minute or upgrade to paid tier
- Check usage: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

### "Permission denied"
- API key may be restricted to specific APIs
- Go to Credentials > Edit API key > Remove or adjust restrictions

### Vertex AI returns empty response
- Check `VERTEX_API_KEY` is set correctly
- Verify model ID exists in the URL (`gemini-3.5-flash`, etc.)
- Check response structure: `data?.candidates?.[0]?.content?.parts?.[0]?.text`

### Structured output fails (JSON parsing errors)
- Use `generateObject` from AI SDK instead of manual parsing
- If using Vertex AI directly, ensure `responseMimeType: "application/json"` and `responseSchema` are set
- Add retry logic with exponential backoff

### Model returns wrong language
- Explicitly set language in system prompt: `Language: Thai`
- For Thai, use informal tone with particles: `ครับ/ค่ะ`

---

## Quick Reference: Adding a New AI Feature

1. **Choose the right model**:
   - Fast structured output: `gemini-3-flash-preview`
   - Complex generation: `gemini-2.5-flash`
   - High volume, low cost: `gemini-flash-lite-latest`

2. **Use the registry**:
   ```typescript
   import { getModel } from "@/lib/ai/modelRegistry";
   ```

3. **Define a Zod schema** for structured output:
   ```typescript
   import { z } from "zod";
   const ResultSchema = z.object({ ... });
   ```

4. **Call with `generateObject`**:
   ```typescript
   import { generateObject } from "ai";
   const { object } = await generateObject({
     model: getModel(),
     schema: ResultSchema,
     system: "You are a...",
     prompt: "Analyze...",
   });
   ```

5. **Add error handling** for quota/rate limit errors

6. **Add retry logic** for production reliability

7. **Log and monitor** AI usage and costs

---

## Resources

- **Google Cloud Console**: https://console.cloud.google.com/
- **Gemini API Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing
- **Vertex AI Docs**: https://cloud.google.com/vertex-ai/docs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Project setup guide**: `docs/setup-gemini-api.md`
- **Architecture doc**: `docs/architecture/gemini.md`

---

*Last updated: June 2026*
*Maintainers: PassionSeed Engineering*
