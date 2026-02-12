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
 * Total: 100% across 9 buckets from 4 providers
 *
 * Distribution strategy (stability-biased):
 * - 48% Google (3 variants)
 * - 10% Anthropic (1 variant)
 * - 30% OpenAI (3 variants)
 * - 12% DeepSeek (2 variants)
 */
const MODEL_BUCKETS: ModelBucket[] = [
  // Google Models (48%)
  { model: 'gemini-2.5-flash', minHash: 0, maxHash: 22, percentage: 22 },
  { model: 'gemini-3-flash', minHash: 22, maxHash: 36, percentage: 14 },
  { model: 'gemini-flash-lite-latest', minHash: 36, maxHash: 48, percentage: 12 },

  // Anthropic Claude (10%)
  { model: 'claude-haiku-4-5', minHash: 48, maxHash: 58, percentage: 10 },

  // OpenAI Models (30%)
  { model: 'gpt-5-mini-2025-08-07', minHash: 58, maxHash: 70, percentage: 12 },
  { model: 'gpt-5.2-chat-latest', minHash: 70, maxHash: 80, percentage: 10 },
  { model: 'codex-mini-latest', minHash: 80, maxHash: 88, percentage: 8 },

  // DeepSeek Models (12%)
  { model: 'deepseek-chat', minHash: 88, maxHash: 96, percentage: 8 },
  { model: 'deepseek-reasoner', minHash: 96, maxHash: 100, percentage: 4 },
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
 * 1. Fair comparison across multiple models from 4 providers
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
