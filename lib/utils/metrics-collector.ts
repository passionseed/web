"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Interface for Direction Finder generation metrics
 * Used for tracking AI generation performance, costs, and quality
 */
export interface GenerationMetrics {
  // Model Information
  modelProvider: 'google' | 'anthropic' | 'openai' | 'deepseek';
  modelName: string;

  // Timing Information (all in milliseconds)
  coreGenerationTimeMs?: number;
  detailsGenerationTimeMs?: number;
  totalGenerationTimeMs: number;
  conversationDurationMs?: number;

  // Token Usage (for cost calculation)
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptSizeBytes?: number;

  // Cache Performance
  cacheHit: boolean;
  cacheLookupTimeMs?: number;

  // Error Tracking
  hadTimeout: boolean;
  hadRateLimit: boolean;
  errorMessage?: string;
  retryCount: number;

  // Context
  conversationTurnCount: number;
  language: 'en' | 'th';

  // Optional Quality Metrics
  userRating?: number; // 1-5 stars
  userFeedback?: string;
}

/**
 * Record generation metrics to the database for analysis
 * This enables A/B testing, performance monitoring, and cost tracking
 *
 * @param resultId - ID of the direction_finder_results record
 * @param userId - ID of the user who generated the result
 * @param metrics - Performance and quality metrics
 * @returns The created metrics record or null if failed
 */
export async function recordGenerationMetrics(
  resultId: string,
  userId: string,
  metrics: GenerationMetrics
): Promise<{ id: string } | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('direction_finder_metrics')
      .insert({
        result_id: resultId,
        user_id: userId,
        model_provider: metrics.modelProvider,
        model_name: metrics.modelName,
        core_generation_time_ms: metrics.coreGenerationTimeMs,
        details_generation_time_ms: metrics.detailsGenerationTimeMs,
        total_generation_time_ms: metrics.totalGenerationTimeMs,
        conversation_duration_ms: metrics.conversationDurationMs,
        prompt_tokens: metrics.promptTokens,
        completion_tokens: metrics.completionTokens,
        total_tokens: metrics.totalTokens,
        prompt_size_bytes: metrics.promptSizeBytes,
        cache_hit: metrics.cacheHit,
        cache_lookup_time_ms: metrics.cacheLookupTimeMs,
        had_timeout: metrics.hadTimeout,
        had_rate_limit: metrics.hadRateLimit,
        error_message: metrics.errorMessage,
        retry_count: metrics.retryCount,
        conversation_turn_count: metrics.conversationTurnCount,
        language: metrics.language,
        user_rating: metrics.userRating,
        user_feedback: metrics.userFeedback,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error recording generation metrics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error recording metrics:', error);
    return null;
  }
}

/**
 * Get model provider from model name
 * Helper function to extract the provider from a model name
 *
 * @param modelName - The name of the AI model
 * @returns The provider name (google, anthropic, openai, or deepseek)
 */
export async function getModelProvider(modelName: string): Promise<'google' | 'anthropic' | 'openai' | 'deepseek'> {
  if (modelName.includes('gemini')) return 'google';
  if (modelName.includes('claude')) return 'anthropic';
  if (modelName.includes('gpt') || modelName.includes('codex')) return 'openai';
  if (modelName.includes('deepseek')) return 'deepseek';

  // Default to google (current default model)
  return 'google';
}

/**
 * Update user rating and feedback for a metrics record
 * Allows users to provide quality feedback after seeing their results
 *
 * @param metricsId - ID of the metrics record to update
 * @param userId - ID of the user (for RLS verification)
 * @param rating - 1-5 star rating
 * @param feedback - Optional text feedback
 * @returns Success boolean
 */
export async function updateMetricsFeedback(
  metricsId: string,
  userId: string,
  rating: number,
  feedback?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Validate rating
  if (rating < 1 || rating > 5) {
    console.error('Invalid rating: must be between 1 and 5');
    return false;
  }

  try {
    const { error } = await supabase
      .from('direction_finder_metrics')
      .update({
        user_rating: rating,
        user_feedback: feedback,
      })
      .eq('id', metricsId)
      .eq('user_id', userId); // RLS ensures user can only update their own metrics

    if (error) {
      console.error('Error updating metrics feedback:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating feedback:', error);
    return false;
  }
}

/**
 * Get metrics for a specific result
 * Useful for displaying performance info to users
 *
 * @param resultId - ID of the direction_finder_results record
 * @returns Metrics record or null if not found
 */
export async function getMetricsForResult(resultId: string): Promise<GenerationMetrics | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('direction_finder_metrics')
      .select('*')
      .eq('result_id', resultId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      modelProvider: data.model_provider as 'google' | 'anthropic' | 'openai' | 'deepseek',
      modelName: data.model_name,
      coreGenerationTimeMs: data.core_generation_time_ms,
      detailsGenerationTimeMs: data.details_generation_time_ms,
      totalGenerationTimeMs: data.total_generation_time_ms,
      conversationDurationMs: data.conversation_duration_ms,
      promptTokens: data.prompt_tokens,
      completionTokens: data.completion_tokens,
      totalTokens: data.total_tokens,
      promptSizeBytes: data.prompt_size_bytes,
      cacheHit: data.cache_hit,
      cacheLookupTimeMs: data.cache_lookup_time_ms,
      hadTimeout: data.had_timeout,
      hadRateLimit: data.had_rate_limit,
      errorMessage: data.error_message,
      retryCount: data.retry_count,
      conversationTurnCount: data.conversation_turn_count,
      language: data.language as 'en' | 'th',
      userRating: data.user_rating,
      userFeedback: data.user_feedback,
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return null;
  }
}
