/**
 * Feature Flags System
 *
 * Simple feature flag system for gradual rollout of new features.
 * Flags can be controlled via environment variables.
 */

export const FEATURE_FLAGS = {
  /**
   * Enable the new PageBuilder UI (three-panel layout)
   * Default: true (use new PageBuilder)
   */
  USE_NEW_PAGE_BUILDER: process.env.NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER !== 'false',

  /**
   * Enable activity templates library
   * Default: true
   */
  ENABLE_ACTIVITY_TEMPLATES: process.env.NEXT_PUBLIC_ENABLE_TEMPLATES !== 'false',

  /**
   * Maximum activities per page
   * Default: 20
   */
  MAX_ACTIVITIES_PER_PAGE: parseInt(
    process.env.NEXT_PUBLIC_MAX_ACTIVITIES_PER_PAGE || '20',
    10
  ),

  /**
   * Enable auto-save
   * Default: true
   */
  ENABLE_AUTO_SAVE: process.env.NEXT_PUBLIC_ENABLE_AUTO_SAVE !== 'false',

  /**
   * Auto-save debounce time (ms)
   * Default: 2000ms (2 seconds)
   */
  AUTO_SAVE_DEBOUNCE_MS: parseInt(
    process.env.NEXT_PUBLIC_AUTO_SAVE_DEBOUNCE_MS || '2000',
    10
  ),
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  const value = FEATURE_FLAGS[flag];
  return typeof value === 'boolean' ? value : true;
}

/**
 * Get feature flag value
 */
export function getFeatureFlagValue<K extends keyof typeof FEATURE_FLAGS>(
  flag: K
): typeof FEATURE_FLAGS[K] {
  return FEATURE_FLAGS[flag];
}

/**
 * Feature flag hook for client components
 */
export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return isFeatureEnabled(flag);
}
