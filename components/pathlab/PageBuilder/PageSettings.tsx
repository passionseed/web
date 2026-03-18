"use client";

import { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { markdownToSafeHtml } from '@/lib/security/sanitize-html';
import { useMemo } from 'react';

interface PageSettingsProps {
  title: string | null;
  contextText: string;
  reflectionPrompts: string[];
  activityCount: number;
  totalEstimatedMinutes: number;
  onUpdateTitle: (title: string | null) => void;
  onUpdateContextText: (text: string) => void;
  onUpdateReflectionPrompts: (prompts: string[]) => void;
  disabled?: boolean;
}

export function PageSettings({
  title,
  contextText,
  reflectionPrompts,
  activityCount,
  totalEstimatedMinutes,
  onUpdateTitle,
  onUpdateContextText,
  onUpdateReflectionPrompts,
  disabled = false,
}: PageSettingsProps) {
  const [isPreviewingContext, setIsPreviewingContext] = useState(false);

  // Parse reflection prompts from textarea
  const reflectionPromptsText = reflectionPrompts.join('\n');

  const handleReflectionPromptsChange = (value: string) => {
    const prompts = value.split('\n').filter(p => p.trim() !== '');
    onUpdateReflectionPrompts(prompts);
  };

  // Render markdown preview
  const contextHtml = useMemo(() => {
    if (!isPreviewingContext || !contextText) return '';
    return markdownToSafeHtml(contextText);
  }, [isPreviewingContext, contextText]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Page Settings</h3>
        <p className="text-xs text-neutral-400">Configure page metadata</p>
      </div>

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Page Metadata */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <h4 className="text-sm font-medium text-white mb-3">Page Overview</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-neutral-400 mb-1">Activities</div>
              <div className="text-2xl font-semibold text-white">{activityCount}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-400 mb-1">Est. Time</div>
              <div className="text-2xl font-semibold text-white">
                {totalEstimatedMinutes} <span className="text-sm text-neutral-400">min</span>
              </div>
            </div>
          </div>

          {activityCount >= 15 && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-800/50 bg-amber-950/20 p-2 text-xs text-amber-200">
              <Info className="h-3 w-3 flex-shrink-0" />
              <p>Page is getting complex (max 20 activities)</p>
            </div>
          )}
        </div>

        {/* Page Title */}
        <div className="space-y-2">
          <Label htmlFor="page-title" className="text-neutral-300">
            Page Title (optional)
          </Label>
          <Input
            id="page-title"
            value={title || ''}
            onChange={e => onUpdateTitle(e.target.value || null)}
            placeholder="e.g., Day 1: Introduction"
            disabled={disabled}
            className="bg-neutral-900 border-neutral-700 text-white"
          />
          <p className="text-xs text-neutral-500">
            Optional custom title for this page
          </p>
        </div>

        {/* Context Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="context-text" className="text-neutral-300">
              Context Text (Markdown)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewingContext(!isPreviewingContext)}
              className="h-6 px-2 text-xs text-neutral-400 hover:text-white"
            >
              {isPreviewingContext ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </>
              )}
            </Button>
          </div>

          {isPreviewingContext ? (
            <div
              className="prose prose-invert prose-sm max-w-none rounded-md border border-neutral-700 bg-neutral-950 p-3 min-h-[120px]"
              dangerouslySetInnerHTML={{ __html: contextHtml }}
            />
          ) : (
            <Textarea
              id="context-text"
              value={contextText}
              onChange={e => onUpdateContextText(e.target.value)}
              placeholder="Provide context for students about this page..."
              disabled={disabled}
              rows={6}
              className="bg-neutral-900 border-neutral-700 text-white resize-none font-mono text-sm"
            />
          )}

          <p className="text-xs text-neutral-500">
            Explain what students will learn or do on this page
          </p>
        </div>

        {/* Reflection Prompts */}
        <div className="space-y-2">
          <Label htmlFor="reflection-prompts" className="text-neutral-300">
            Reflection Prompts (one per line)
          </Label>
          <Textarea
            id="reflection-prompts"
            value={reflectionPromptsText}
            onChange={e => handleReflectionPromptsChange(e.target.value)}
            placeholder="What surprised you today?&#10;What questions do you still have?&#10;How does this connect to your interests?"
            disabled={disabled}
            rows={5}
            className="bg-neutral-900 border-neutral-700 text-white resize-none"
          />
          <p className="text-xs text-neutral-500">
            {reflectionPrompts.length} prompt{reflectionPrompts.length !== 1 ? 's' : ''} added
          </p>
        </div>

        {/* Status Badges */}
        <div className="space-y-2">
          <Label className="text-neutral-300">Page Status</Label>
          <div className="flex flex-wrap gap-2">
            {activityCount === 0 && (
              <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                Empty
              </Badge>
            )}
            {activityCount > 0 && activityCount < 3 && (
              <Badge variant="outline" className="border-yellow-700 text-yellow-400">
                Draft
              </Badge>
            )}
            {activityCount >= 3 && (
              <Badge variant="outline" className="border-green-700 text-green-400">
                Ready
              </Badge>
            )}
            {totalEstimatedMinutes > 120 && (
              <Badge variant="outline" className="border-amber-700 text-amber-400">
                Long ({Math.floor(totalEstimatedMinutes / 60)}h {totalEstimatedMinutes % 60}m)
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
