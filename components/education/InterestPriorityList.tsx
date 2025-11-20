"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterestItem {
  id: string;
  name: string;
  priority: number;
}

interface InterestPriorityListProps {
  interests: InterestItem[];
  onUpdate: (interests: InterestItem[]) => void;
  className?: string;
}

export function InterestPriorityList({ 
  interests, 
  onUpdate,
  className 
}: InterestPriorityListProps) {
  const [newInterest, setNewInterest] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddInterest = () => {
    const trimmed = newInterest.trim();
    if (!trimmed) return;

    // Check for duplicates
    if (interests.some(interest => 
      interest.name.toLowerCase() === trimmed.toLowerCase()
    )) {
      return; // Don't add duplicates
    }

    const newItem: InterestItem = {
      id: `interest_${Date.now()}`,
      name: trimmed,
      priority: interests.length + 1
    };

    onUpdate([...interests, newItem]);
    setNewInterest('');
    setIsAdding(false);
  };

  const handleRemoveInterest = (id: string) => {
    const filtered = interests.filter(item => item.id !== id);
    // Reorder priorities
    const reordered = filtered.map((item, index) => ({
      ...item,
      priority: index + 1
    }));
    onUpdate(reordered);
  };

  const moveInterest = (id: string, direction: 'up' | 'down') => {
    const currentIndex = interests.findIndex(item => item.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= interests.length) return;

    const newInterests = [...interests];
    [newInterests[currentIndex], newInterests[newIndex]] = 
    [newInterests[newIndex], newInterests[currentIndex]];

    // Update priorities
    const reordered = newInterests.map((item, index) => ({
      ...item,
      priority: index + 1
    }));

    onUpdate(reordered);
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-yellow-500 text-black';
    if (priority === 2) return 'bg-gray-400 text-white';
    if (priority === 3) return 'bg-orange-600 text-white';
    return 'bg-blue-500 text-white';
  };

  const getPriorityText = (priority: number) => {
    if (priority === 1) return '1st Priority';
    if (priority === 2) return '2nd Priority'; 
    if (priority === 3) return '3rd Priority';
    return `${priority}th Priority`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Your Interests</h3>
          <p className="text-sm text-slate-400">
            Add and prioritize your interests. The top interest will be used for your roadmap.
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Interest
        </Button>
      </div>

      {/* Add new interest form */}
      {isAdding && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="e.g., Game Development, Artificial Intelligence"
                className="flex-1 bg-slate-900 border-slate-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddInterest();
                  } else if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewInterest('');
                  }
                }}
                autoFocus
              />
              <Button
                onClick={handleAddInterest}
                disabled={!newInterest.trim()}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Add
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewInterest('');
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interest list */}
      <div className="space-y-3">
        {interests.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-slate-400 mb-4">
                No interests added yet. Click "Add Interest" to get started!
              </p>
              <p className="text-sm text-slate-500">
                Examples: Game Development, Web Development, AI/Machine Learning, 
                Data Science, Mobile Apps, Cybersecurity, etc.
              </p>
            </CardContent>
          </Card>
        ) : (
          interests.map((interest, index) => (
            <Card 
              key={interest.id}
              className={cn(
                "bg-slate-800 border-slate-700 transition-all duration-200",
                interest.priority === 1 && "ring-2 ring-yellow-500/30 bg-yellow-500/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Priority badge */}
                    <Badge className={cn("text-xs font-bold min-w-fit", getPriorityColor(interest.priority))}>
                      {getPriorityText(interest.priority)}
                    </Badge>

                    {/* Interest name */}
                    <span className="font-medium text-white flex-1">
                      {interest.name}
                    </span>

                    {/* Priority indicator for top interest */}
                    {interest.priority === 1 && (
                      <span className="text-xs text-yellow-400 font-medium">
                        Primary Focus
                      </span>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    {/* Move up */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveInterest(interest.id, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>

                    {/* Move down */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveInterest(interest.id, 'down')}
                      disabled={index === interests.length - 1}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>

                    {/* Remove */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveInterest(interest.id)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      title="Remove interest"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Additional info for primary interest */}
                {interest.priority === 1 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400">
                      This will be your primary focus for the AI-generated roadmap.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      {interests.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-300">
            <strong>{interests.length}</strong> interest{interests.length !== 1 ? 's' : ''} added. 
            {interests.length > 0 && (
              <span className="ml-1">
                Primary focus: <strong className="text-yellow-400">{interests[0]?.name}</strong>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}