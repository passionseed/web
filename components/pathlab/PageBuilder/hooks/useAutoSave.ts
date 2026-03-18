/**
 * Auto-Save Hook for PageBuilder
 *
 * Implements debounced auto-save with localStorage backup.
 * Saves to localStorage immediately for crash recovery,
 * then syncs to API after 2-second debounce.
 */

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export interface AutoSaveOptions {
  pageId: string;
  data: any;
  onSave: (data: any) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({
  pageId,
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: AutoSaveOptions) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>(JSON.stringify(data));

  // Save to localStorage immediately (crash recovery)
  const saveToLocalStorage = useCallback(() => {
    try {
      const key = `draft_page_${pageId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[AutoSave] localStorage quota exceeded, clearing old drafts');
        clearOldDrafts();
        // Retry once
        try {
          localStorage.setItem(`draft_page_${pageId}`, JSON.stringify(data));
        } catch (retryError) {
          console.error('[AutoSave] Failed to save draft after clearing:', retryError);
        }
      }
    }
  }, [pageId, data]);

  // Clear old drafts (LRU eviction - keep last 5)
  const clearOldDrafts = useCallback(() => {
    const draftKeys: Array<{ key: string; timestamp: number }> = [];

    // Find all draft keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_page_')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            draftKeys.push({
              key,
              timestamp: parsed.lastModified || 0,
            });
          }
        } catch (e) {
          // Remove corrupt drafts
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by timestamp (oldest first)
    draftKeys.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest drafts if more than 5
    const toRemove = draftKeys.slice(0, Math.max(0, draftKeys.length - 5));
    toRemove.forEach(({ key }) => localStorage.removeItem(key));
  }, []);

  // Save to API (debounced)
  const saveToApi = useCallback(async () => {
    if (isSavingRef.current) {
      console.log('[AutoSave] Save already in progress, queuing...');
      return;
    }

    const currentData = JSON.stringify(data);

    // Skip if no changes
    if (currentData === lastSavedDataRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      await onSave(data);
      lastSavedDataRef.current = currentData;

      // Clear draft from localStorage on successful save
      localStorage.removeItem(`draft_page_${pageId}`);

      console.log('[AutoSave] Saved successfully');
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error);
      toast.error('Auto-save failed. Your changes are saved locally.');
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, pageId]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    // Save to localStorage immediately
    saveToLocalStorage();

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule API save
    saveTimeoutRef.current = setTimeout(() => {
      saveToApi();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, saveToLocalStorage, saveToApi]);

  // Load draft from localStorage on mount
  const loadDraft = useCallback(() => {
    try {
      const key = `draft_page_${pageId}`;
      const draft = localStorage.getItem(key);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch (error) {
      console.error('[AutoSave] Failed to load draft:', error);
    }
    return null;
  }, [pageId]);

  // Manual save (bypasses debounce)
  const manualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToApi();
  }, [saveToApi]);

  return {
    manualSave,
    loadDraft,
    isSaving: isSavingRef.current,
  };
}
