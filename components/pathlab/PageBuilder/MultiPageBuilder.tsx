"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageBuilder } from './index';
import { PageNavigation } from './PageNavigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FullPathActivity } from '@/types/pathlab';

interface PageData {
  id: string;
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  activities: FullPathActivity[];
  activitiesLoaded?: boolean;
}

interface MultiPageBuilderProps {
  seedId: string;
  pathId: string;
  initialPages: PageData[];
  totalDays: number;
  initialDayNumber?: number;
}

export function MultiPageBuilder({
  seedId,
  pathId,
  initialPages,
  totalDays,
  initialDayNumber = 1,
}: MultiPageBuilderProps) {
  const router = useRouter();
  const [currentDayNumber, setCurrentDayNumber] = useState(initialDayNumber);
  const [pages, setPages] = useState<PageData[]>(initialPages);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Sync pages state when initialPages changes (e.g., on navigation or refresh)
  useEffect(() => {
    if (initialPages.length > 0) {
      setPages(initialPages);
    }
  }, [initialPages]);

  const currentPage = pages.find((p) => p.day_number === currentDayNumber);

  const handleDayChange = async (dayNumber: number) => {
    if (dayNumber === currentDayNumber) return;
    if (dayNumber < 1 || dayNumber > totalDays) return;

    // Check if we already have this page loaded
    const existingPage = pages.find((p) => p.day_number === dayNumber);

    if (existingPage?.activitiesLoaded) {
      setCurrentDayNumber(dayNumber);
      return;
    }

    // Fetch the page from the server
    setIsLoadingPage(true);
    try {
      const response = await fetch(
        `/api/pathlab/paths/${pathId}/days/${dayNumber}`
      );

      if (!response.ok) {
        throw new Error('Failed to load page');
      }

      const pageData = await response.json();

      setPages((prev) => {
        const exists = prev.some((page) => page.day_number === dayNumber);
        if (!exists) {
          return [
            ...prev,
            {
              ...pageData,
              activities: pageData.activities || [],
              activitiesLoaded: true,
            },
          ];
        }

        return prev.map((page) =>
          page.day_number === dayNumber
            ? {
                ...page,
                ...pageData,
                activities: pageData.activities || [],
                activitiesLoaded: true,
              }
            : page
        );
      });
      setCurrentDayNumber(dayNumber);
    } catch (error) {
      console.error('Error loading page:', error);
      toast.error('Failed to load page');
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleAddDay = async () => {
    try {
      const response = await fetch(`/api/pathlab/paths/${pathId}/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: totalDays + 1,
          title: null,
          context_text: '',
          reflection_prompts: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create new page');
      }

      const newPage = await response.json();

      // Refresh to update total days
      router.refresh();
      toast.success('New page created');
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Failed to create new page');
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-neutral-400">Loading page...</p>
        </div>
      </div>
    );
  }

  if (!currentPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <p className="text-sm text-neutral-400">Page not found</p>
          <button
            onClick={() => setCurrentDayNumber(1)}
            className="mt-2 text-sm text-blue-500 hover:text-blue-400"
          >
            Go to Page 1
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      {/* Top Navigation Bar */}
      <div className="border-b border-neutral-800 px-6 py-3 bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <PageNavigation
            currentDay={currentDayNumber}
            totalDays={totalDays}
            onDayChange={handleDayChange}
            onAddDay={handleAddDay}
          />

          <div className="text-sm text-neutral-400">
            Page {currentDayNumber} of {totalDays}
          </div>
        </div>
      </div>

      {/* Page Builder */}
      <div className="flex-1 overflow-hidden">
        <PageBuilder
          key={currentPage.id} // Force remount when switching pages
          pageId={currentPage.id}
          pathId={pathId}
          dayNumber={currentPage.day_number}
          initialTitle={currentPage.title}
          initialContextText={currentPage.context_text}
          initialReflectionPrompts={currentPage.reflection_prompts}
          initialActivities={currentPage.activities || []}
        />
      </div>
    </div>
  );
}
