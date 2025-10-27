'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmojiPickerProps {
  value?: string;
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

interface EmojiData {
  emoji: string;
  keywords: string[];
}

const RECENT_EMOJIS_KEY = 'journey-recent-emojis';
const MAX_RECENT_EMOJIS = 10;

const EMOJI_CATEGORIES = {
  activity: [
    { emoji: '🎯', keywords: ['target', 'goal', 'aim', 'bullseye'] },
    { emoji: '🎨', keywords: ['art', 'paint', 'creative', 'design'] },
    { emoji: '🎵', keywords: ['music', 'note', 'sound'] },
    { emoji: '🎮', keywords: ['game', 'gaming', 'play', 'controller'] },
    { emoji: '🏃', keywords: ['run', 'running', 'exercise', 'fitness'] },
    { emoji: '⚽', keywords: ['soccer', 'football', 'sport', 'ball'] },
    { emoji: '🎪', keywords: ['circus', 'tent', 'entertainment'] },
    { emoji: '🎭', keywords: ['theater', 'drama', 'arts', 'performance'] },
    { emoji: '🎬', keywords: ['movie', 'film', 'cinema', 'video'] },
    { emoji: '📸', keywords: ['camera', 'photo', 'picture', 'photography'] },
  ],
  objects: [
    { emoji: '📚', keywords: ['books', 'library', 'reading', 'study', 'learn'] },
    { emoji: '💼', keywords: ['briefcase', 'business', 'work', 'professional'] },
    { emoji: '🔬', keywords: ['science', 'lab', 'microscope', 'research'] },
    { emoji: '💻', keywords: ['computer', 'laptop', 'code', 'tech', 'programming'] },
    { emoji: '📱', keywords: ['phone', 'mobile', 'device', 'smartphone'] },
    { emoji: '⚙️', keywords: ['gear', 'settings', 'config', 'mechanical'] },
    { emoji: '🔧', keywords: ['wrench', 'tool', 'fix', 'repair'] },
    { emoji: '🔨', keywords: ['hammer', 'build', 'construction', 'craft'] },
    { emoji: '🏗️', keywords: ['construction', 'building', 'develop', 'create'] },
    { emoji: '📊', keywords: ['chart', 'graph', 'data', 'analytics', 'statistics'] },
    { emoji: '📝', keywords: ['note', 'write', 'document', 'memo'] },
    { emoji: '🎓', keywords: ['graduation', 'education', 'learn', 'academic'] },
    { emoji: '🏆', keywords: ['trophy', 'winner', 'achievement', 'success'] },
  ],
  symbols: [
    { emoji: '⭐', keywords: ['star', 'favorite', 'important', 'highlight'] },
    { emoji: '✨', keywords: ['sparkles', 'shine', 'magic', 'special'] },
    { emoji: '💫', keywords: ['dizzy', 'sparkle', 'shine'] },
    { emoji: '🌟', keywords: ['glowing', 'star', 'bright', 'shine'] },
    { emoji: '🔥', keywords: ['fire', 'hot', 'trending', 'flame'] },
    { emoji: '💡', keywords: ['idea', 'light', 'bulb', 'innovation', 'think'] },
    { emoji: '🎁', keywords: ['gift', 'present', 'reward', 'bonus'] },
    { emoji: '💰', keywords: ['money', 'cash', 'dollar', 'finance'] },
    { emoji: '🚀', keywords: ['rocket', 'launch', 'fast', 'start', 'space'] },
    { emoji: '⚡', keywords: ['lightning', 'fast', 'energy', 'power'] },
    { emoji: '🎉', keywords: ['party', 'celebration', 'congratulations', 'celebrate'] },
    { emoji: '💯', keywords: ['hundred', 'perfect', 'score', 'complete'] },
  ],
  nature: [
    { emoji: '🌱', keywords: ['seedling', 'plant', 'grow', 'growth', 'new'] },
    { emoji: '🌳', keywords: ['tree', 'nature', 'forest', 'environment'] },
    { emoji: '🌻', keywords: ['sunflower', 'flower', 'bloom', 'happy'] },
    { emoji: '🌺', keywords: ['hibiscus', 'flower', 'tropical', 'bloom'] },
    { emoji: '🌸', keywords: ['cherry', 'blossom', 'flower', 'spring'] },
    { emoji: '🍀', keywords: ['clover', 'luck', 'fortune', 'lucky'] },
    { emoji: '🌿', keywords: ['herb', 'leaf', 'plant', 'nature'] },
    { emoji: '🌾', keywords: ['grain', 'wheat', 'harvest', 'crop'] },
    { emoji: '🌲', keywords: ['evergreen', 'tree', 'pine', 'forest'] },
    { emoji: '🌴', keywords: ['palm', 'tree', 'tropical', 'beach'] },
  ],
  faces: [
    { emoji: '😊', keywords: ['smile', 'happy', 'joy', 'pleased'] },
    { emoji: '🤔', keywords: ['thinking', 'think', 'consider', 'wonder'] },
    { emoji: '💪', keywords: ['strong', 'muscle', 'strength', 'power', 'flex'] },
    { emoji: '👍', keywords: ['thumbs', 'up', 'good', 'like', 'yes', 'approve'] },
    { emoji: '✌️', keywords: ['peace', 'victory', 'two', 'fingers'] },
    { emoji: '🤝', keywords: ['handshake', 'deal', 'agreement', 'partner'] },
    { emoji: '👏', keywords: ['clap', 'applause', 'praise', 'congratulations'] },
    { emoji: '🙌', keywords: ['hands', 'celebrate', 'hooray', 'praise'] },
    { emoji: '👀', keywords: ['eyes', 'look', 'see', 'watch'] },
    { emoji: '🧠', keywords: ['brain', 'smart', 'intelligence', 'think'] },
  ],
};

function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmoji(emoji: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentEmojis();
    const filtered = recent.filter((e) => e !== emoji);
    const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
  } catch {
    // Fail silently if localStorage is unavailable
  }
}

export function EmojiPicker({ value, onSelect, trigger, align = 'center' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    setRecentEmojis(getRecentEmojis());
  }, [open]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    saveRecentEmoji(emoji);
    setRecentEmojis([emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, MAX_RECENT_EMOJIS));
    setOpen(false);
    setSearch('');
  };

  const filteredCategories = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;

    const searchLower = search.toLowerCase();
    const filtered: typeof EMOJI_CATEGORIES = {
      activity: [],
      objects: [],
      symbols: [],
      nature: [],
      faces: [],
    };

    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      filtered[category as keyof typeof EMOJI_CATEGORIES] = emojis.filter((item) =>
        item.keywords.some((keyword) => keyword.includes(searchLower))
      );
    });

    return filtered;
  }, [search]);

  const filteredRecent = useMemo(() => {
    if (!search) return recentEmojis;

    const searchLower = search.toLowerCase();
    const allEmojis = Object.values(EMOJI_CATEGORIES).flat();

    return recentEmojis.filter((emoji) => {
      const emojiData = allEmojis.find((item) => item.emoji === emoji);
      return emojiData?.keywords.some((keyword) => keyword.includes(searchLower));
    });
  }, [search, recentEmojis]);

  const hasResults =
    filteredRecent.length > 0 ||
    Object.values(filteredCategories).some((cat) => cat.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="lg"
            className="text-3xl h-14 w-14 p-0 hover:scale-110 transition-transform"
          >
            {value || '🎯'}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0 bg-slate-900 border-slate-700"
        align={align}
      >
        <div className="p-3 border-b border-slate-700">
          <Input
            placeholder="Search emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <ScrollArea className="h-[360px]">
          <div className="p-3 space-y-4">
            {!search && recentEmojis.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Recently Used
                </h3>
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      onClick={() => handleSelect(emoji)}
                      className="text-2xl p-2 rounded hover:bg-slate-800 transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {search && filteredRecent.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Recent
                </h3>
                <div className="grid grid-cols-8 gap-1">
                  {filteredRecent.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      onClick={() => handleSelect(emoji)}
                      className="text-2xl p-2 rounded hover:bg-slate-800 transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="w-full bg-slate-800 grid grid-cols-5 h-9">
                <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-slate-700">
                  Activity
                </TabsTrigger>
                <TabsTrigger value="objects" className="text-xs data-[state=active]:bg-slate-700">
                  Objects
                </TabsTrigger>
                <TabsTrigger value="symbols" className="text-xs data-[state=active]:bg-slate-700">
                  Symbols
                </TabsTrigger>
                <TabsTrigger value="nature" className="text-xs data-[state=active]:bg-slate-700">
                  Nature
                </TabsTrigger>
                <TabsTrigger value="faces" className="text-xs data-[state=active]:bg-slate-700">
                  Faces
                </TabsTrigger>
              </TabsList>

              {Object.entries(filteredCategories).map(([category, emojis]) => (
                <TabsContent key={category} value={category} className="mt-3">
                  {emojis.length > 0 ? (
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.map((item, index) => (
                        <button
                          key={`${item.emoji}-${index}`}
                          onClick={() => handleSelect(item.emoji)}
                          className="text-2xl p-2 rounded hover:bg-slate-800 transition-colors"
                          title={item.keywords.join(', ')}
                        >
                          {item.emoji}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 py-8 text-sm">
                      No emojis found
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {search && !hasResults && (
              <div className="text-center text-slate-400 py-8 text-sm">
                No emojis found for "{search}"
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
