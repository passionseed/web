"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Video, FileText, CheckSquare, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PathActivityType } from '@/types/pathlab';

interface ActivityTemplate {
  id: string;
  title: string;
  description: string | null;
  activity_type: PathActivityType;
  content_template: any;
  assessment_template: any;
  estimated_minutes: number | null;
  is_public: boolean;
  use_count: number;
}

interface ActivityLibraryProps {
  onSelectTemplate: (template: ActivityTemplate) => void;
  disabled?: boolean;
}

const ACTIVITY_TYPE_ICONS: Record<PathActivityType, any> = {
  learning: FileText,
  reflection: Sparkles,
  milestone: CheckSquare,
  checkpoint: CheckSquare,
  journal_prompt: FileText,
};

const ACTIVITY_TYPE_COLORS: Record<PathActivityType, string> = {
  learning: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reflection: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  milestone: 'bg-green-500/10 text-green-400 border-green-500/20',
  checkpoint: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  journal_prompt: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export function ActivityLibrary({ onSelectTemplate, disabled = false }: ActivityLibraryProps) {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PathActivityType | 'all'>('all');

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedType !== 'all') {
          params.append('type', selectedType);
        }
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        params.append('sortBy', 'popular');

        const response = await fetch(`/api/pathlab/library?${params}`);
        if (!response.ok) {
          throw new Error('Failed to load templates');
        }

        const data = await response.json();
        setTemplates(data.templates || []);

        if (data.warning) {
          setError(data.warning);
        }
      } catch (err) {
        console.error('[ActivityLibrary] Failed to fetch templates:', err);
        setError('Failed to load activity library');
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [selectedType, searchQuery]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Activity Library</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900 border-neutral-700 text-white"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
            className={cn(
              'h-7 text-xs',
              selectedType === 'all'
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'learning' ? 'default' : 'outline'}
            onClick={() => setSelectedType('learning')}
            className={cn(
              'h-7 text-xs',
              selectedType === 'learning'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            Learning
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'reflection' ? 'default' : 'outline'}
            onClick={() => setSelectedType('reflection')}
            className={cn(
              'h-7 text-xs',
              selectedType === 'reflection'
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            Reflection
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-400">No templates found</p>
            <p className="text-xs text-neutral-500 mt-1">
              Try adjusting your search or filter
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          filteredTemplates.map(template => {
            const Icon = ACTIVITY_TYPE_ICONS[template.activity_type];
            const colorClass = ACTIVITY_TYPE_COLORS[template.activity_type];

            return (
              <Card
                key={template.id}
                className={cn(
                  'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-colors cursor-pointer',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !disabled && onSelectTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        'rounded-md p-1.5 border',
                        colorClass
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate">
                          {template.title}
                        </h4>
                        {template.is_public && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-green-700 text-green-400"
                          >
                            Public
                          </Badge>
                        )}
                      </div>

                      {template.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2 mb-2">
                          {template.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {template.estimated_minutes && (
                          <span>{template.estimated_minutes} min</span>
                        )}
                        {template.use_count > 0 && (
                          <span>Used {template.use_count}x</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 p-4">
        <p className="text-xs text-neutral-500 text-center">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}
