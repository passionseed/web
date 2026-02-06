/**
 * ChecklistRenderer - Interactive markdown checklist renderer
 * Displays checklist items with interactive checkboxes and smooth animations
 */

"use client";

import React, { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChecklistItem } from '@/components/journey/utils/checklistMarkdown';
import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/security';

interface ChecklistRendererProps {
  markdown: string;
  items: ChecklistItem[];
  onToggle: (lineNumber: number) => void;
  readOnly?: boolean;
}

export function ChecklistRenderer({
  markdown,
  items,
  onToggle,
  readOnly = false,
}: ChecklistRendererProps) {
  // Split markdown into lines for processing
  const lines = useMemo(() => markdown.split('\n'), [markdown]);

  // Create a map of line numbers that have checklist items
  const checklistLineMap = useMemo(() => {
    const map = new Map<number, ChecklistItem>();
    items.forEach((item) => {
      map.set(item.lineNumber, item);
    });
    return map;
  }, [items]);

  // Render content line by line, replacing checklist items with interactive checkboxes
  const renderedContent = useMemo(() => {
    const elements: React.ReactNode[] = [];
    let currentTextBlock: string[] = [];
    let currentTextStartLine = 0;

    const flushTextBlock = (endLine: number) => {
      if (currentTextBlock.length > 0) {
        const textContent = currentTextBlock.join('\n');
        if (textContent.trim()) {
          elements.push(
            <div
              key={`text-${currentTextStartLine}-${endLine}`}
              className="prose prose-sm max-w-none text-slate-300 mb-3"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  marked.parse(textContent, { async: false }) as string
                ),
              }}
            />
          );
        }
        currentTextBlock = [];
      }
    };

    lines.forEach((line, index) => {
      const checklistItem = checklistLineMap.get(index);

      if (checklistItem) {
        // Flush any accumulated text before rendering checklist item
        flushTextBlock(index);

        // Render interactive checklist item
        elements.push(
          <ChecklistItemComponent
            key={`checklist-${index}`}
            item={checklistItem}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        );

        // Reset text block tracking
        currentTextStartLine = index + 1;
      } else {
        // Accumulate non-checklist lines for markdown rendering
        currentTextBlock.push(line);
      }
    });

    // Flush any remaining text
    flushTextBlock(lines.length);

    return elements;
  }, [lines, checklistLineMap, onToggle, readOnly]);

  if (items.length === 0 && !markdown.trim()) {
    return (
      <p className="text-sm text-slate-500 italic">
        No description provided
      </p>
    );
  }

  return <div className="space-y-2">{renderedContent}</div>;
}

/**
 * Individual checklist item component with checkbox
 */
interface ChecklistItemComponentProps {
  item: ChecklistItem;
  onToggle: (lineNumber: number) => void;
  readOnly: boolean;
}

function ChecklistItemComponent({
  item,
  onToggle,
  readOnly,
}: ChecklistItemComponentProps) {
  const handleToggle = () => {
    if (!readOnly) {
      onToggle(item.lineNumber);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-3 rounded-lg transition-all duration-200',
        'hover:bg-slate-800/30',
        !readOnly && 'cursor-pointer',
        item.checked && 'opacity-70'
      )}
      onClick={handleToggle}
    >
      <Checkbox
        checked={item.checked}
        disabled={readOnly}
        className={cn(
          'mt-0.5 transition-all duration-200',
          !readOnly && 'cursor-pointer'
        )}
        onCheckedChange={handleToggle}
      />
      <span
        className={cn(
          'text-sm text-slate-300 flex-1 transition-all duration-200',
          item.checked && 'line-through text-slate-500'
        )}
      >
        {item.text}
      </span>
    </div>
  );
}
