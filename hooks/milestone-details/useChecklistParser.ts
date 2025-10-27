/**
 * useChecklistParser - Hook for managing checklist state within markdown content
 * Provides optimistic updates and integrates with auto-save functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseChecklist,
  toggleChecklistItem,
  hasChecklists,
  getChecklistStats,
  ChecklistItem,
} from '@/components/journey/utils/checklistMarkdown';

interface UseChecklistParserProps {
  markdown: string;
  onUpdate: (updatedMarkdown: string) => void;
}

interface UseChecklistParserReturn {
  items: ChecklistItem[];
  toggleItem: (lineNumber: number) => void;
  hasChecklistItems: boolean;
  checkedCount: number;
  totalCount: number;
}

export function useChecklistParser({
  markdown,
  onUpdate,
}: UseChecklistParserProps): UseChecklistParserReturn {
  // Local state for optimistic updates
  const [localMarkdown, setLocalMarkdown] = useState(markdown);

  // Sync with external markdown changes
  useEffect(() => {
    setLocalMarkdown(markdown);
  }, [markdown]);

  // Parse checklist items from local markdown
  const items = useMemo(() => {
    return parseChecklist(localMarkdown);
  }, [localMarkdown]);

  // Check if markdown has checklist items
  const hasChecklistItems = useMemo(() => {
    return hasChecklists(localMarkdown);
  }, [localMarkdown]);

  // Get checklist statistics
  const stats = useMemo(() => {
    return getChecklistStats(localMarkdown);
  }, [localMarkdown]);

  // Toggle a checklist item
  const toggleItem = useCallback(
    (lineNumber: number) => {
      // Optimistically update local state
      const updatedMarkdown = toggleChecklistItem(localMarkdown, lineNumber);
      setLocalMarkdown(updatedMarkdown);

      // Call the update callback (which should trigger auto-save)
      onUpdate(updatedMarkdown);
    },
    [localMarkdown, onUpdate]
  );

  return {
    items,
    toggleItem,
    hasChecklistItems,
    checkedCount: stats.checked,
    totalCount: stats.total,
  };
}
