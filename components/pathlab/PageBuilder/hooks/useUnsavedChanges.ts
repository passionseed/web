/**
 * Unsaved Changes Warning Hook
 *
 * Prompts user before navigating away if there are unsaved changes.
 * Prevents accidental data loss.
 */

import { useEffect } from 'react';

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    // Browser navigation warning (refresh, close tab, etc.)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages and show their own
      // But we still need to set returnValue
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
}
