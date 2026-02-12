import { createHash } from 'crypto';

/**
 * Model bucket configuration for A/B testing
 * Each bucket defines a model and the percentage of users assigned to it
 */
interface ModelBucket {
  model: string;
  minHash: number; // Inclusive
  maxHash: number; // Exclusive
  percentage: number; // For documentation/clarity
}

/**
 * A/B testing model distribution
 * Total: 100% across 9 models from 4 providers
 *
 * Distribution strategy:
 * - 35% Google (3 variants: gemini-3-flash, gemini-2.5-flash, gemini-flash-lite-latest)
 * - 13% Anthropic (1 variant: claude-haiku-4-5)
 * - 32% OpenAI (3 variants: gpt-5-mini, gpt-5.2-chat, codex-mini)
 * - 20% DeepSeek (2 variants: deepseek-chat, deepseek-reasoner)
 */
const MODEL_BUCKETS: ModelBucket[] = [
  // Google Models (35%)
  { model: 'gemini-3-flash', minHash: 0, maxHash: 10, percentage: 10 },
  { model: 'gemini-2.5-flash', minHash: 10, maxHash: 25, percentage: 15 },
  { model: 'gemini-flash-lite-latest', minHash: 25, maxHash: 35, percentage: 10 },

  // Anthropic Claude (13%)
  { model: 'claude-haiku-4-5', minHash: 35, maxHash: 48, percentage: 13 },

  // OpenAI Models (32%)
  { model: 'gpt-5-mini-2025-08-07', minHash: 48, maxHash: 60, percentage: 12 },
  { model: 'gpt-5.2-chat-latest', minHash: 60, maxHash: 70, percentage: 10 },
  { model: 'codex-mini-latest', minHash: 70, maxHash: 80, percentage: 10 },

  // DeepSeek Models (20%)
  { model: 'deepseek-chat', minHash: 80, maxHash: 90, percentage: 10 },
  { model: 'deepseek-reasoner', minHash: 90, maxHash: 100, percentage: 10 },
];

/**
 * Hash a user ID to a value between 0-99
 * Uses MD5 hash for deterministic, evenly distributed assignment
 *
 * @param userId - The user's UUID
 * @returns A number between 0 and 99
 */
function hashUserIdToRange(userId: string): number {
  const hash = createHash('md5').update(userId).digest('hex');
  // Take first 8 characters and convert to integer, then mod 100
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % 100;
}

/**
 * Select an AI model for a user based on deterministic hash-based assignment
 * The same user will always get the same model (consistent A/B testing)
 *
 * This enables:
 * 1. Fair comparison across 9 models from 4 providers
 * 2. Consistent user experience (same user always gets same model)
 * 3. Data-driven decisions on which model to use in production
 *
 * @param userId - The user's UUID
 * @returns The model name to use for this user
 */
export function selectModelForUser(userId: string): string {
  // Hash user ID to 0-99 range
  const hashValue = hashUserIdToRange(userId);

  // Find the bucket this user belongs to
  const bucket = MODEL_BUCKETS.find(
    (b) => hashValue >= b.minHash && hashValue < b.maxHash
  );

  if (!bucket) {
    console.error(`No bucket found for hash value ${hashValue}, defaulting to gemini-2.5-flash`);
    return 'gemini-2.5-flash';
  }

  return bucket.model;
}

/**
 * Get the model bucket assignment for a user (for debugging/analytics)
 * Returns the bucket configuration for transparency
 *
 * @param userId - The user's UUID
 * @returns The bucket configuration and hash value
 */
export function getUserModelBucket(userId: string): {
  model: string;
  hashValue: number;
  percentage: number;
} {
  const hashValue = hashUserIdToRange(userId);
  const bucket = MODEL_BUCKETS.find(
    (b) => hashValue >= b.minHash && hashValue < b.maxHash
  );

  if (!bucket) {
    return {
      model: 'gemini-2.5-flash',
      hashValue,
      percentage: 0,
    };
  }

  return {
    model: bucket.model,
    hashValue,
    percentage: bucket.percentage,
  };
}

/**
 * Get all model buckets for documentation/testing
 * Useful for verifying the distribution configuration
 *
 * @returns Array of all model buckets
 */
export function getAllModelBuckets(): ModelBucket[] {
  return MODEL_BUCKETS;
}

/**
 * Validate that model buckets cover entire 0-99 range with no gaps/overlaps
 * Useful for testing and deployment verification
 *
 * @returns True if valid, throws error if invalid
 */
export function validateModelBuckets(): boolean {
  // Sort buckets by minHash
  const sorted = [...MODEL_BUCKETS].sort((a, b) => a.minHash - b.minHash);

  // Check first bucket starts at 0
  if (sorted[0].minHash !== 0) {
    throw new Error(`First bucket must start at 0, but starts at ${sorted[0].minHash}`);
  }

  // Check last bucket ends at 100
  const lastBucket = sorted[sorted.length - 1];
  if (lastBucket.maxHash !== 100) {
    throw new Error(`Last bucket must end at 100, but ends at ${lastBucket.maxHash}`);
  }

  // Check for gaps and overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.maxHash !== next.minHash) {
      throw new Error(
        `Gap or overlap detected between bucket ${i} (ends at ${current.maxHash}) and bucket ${i + 1} (starts at ${next.minHash})`
      );
    }
  }

  // Check total percentage adds up to 100
  const totalPercentage = MODEL_BUCKETS.reduce((sum, b) => sum + b.percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`Total percentage must be 100, but is ${totalPercentage}`);
  }

  return true;
}

// Validate buckets on module load (catches configuration errors early)
validateModelBuckets();
