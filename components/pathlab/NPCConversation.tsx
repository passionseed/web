'use client';

import { useState, useEffect, useRef } from 'react';
import {
  NPCConversation as NPCConversationType,
  NPCConversationNodeWithChoices,
  NPCConversationProgress,
  NPCConversationChoice,
  MakeChoiceResponse,
} from '@/types/npc-conversations';
import { NPCAvatarData } from '@/types/npc-avatars';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock } from 'lucide-react';

interface NPCConversationProps {
  conversationId: string;
  progressId: string;
  onComplete?: () => void;
}

interface ConversationHistoryEntry {
  node: NPCConversationNodeWithChoices;
  selectedChoice?: NPCConversationChoice;
  timestamp: Date;
}

export function NPCConversation({
  conversationId,
  progressId,
  onComplete,
}: NPCConversationProps) {
  const [conversation, setConversation] = useState<NPCConversationType | null>(null);
  const [currentNode, setCurrentNode] = useState<NPCConversationNodeWithChoices | null>(null);
  const [progress, setProgress] = useState<NPCConversationProgress | null>(null);
  const [history, setHistory] = useState<ConversationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize conversation
  useEffect(() => {
    loadConversation();
  }, [conversationId, progressId]);

  // Timer effect - start countdown when node changes
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Check if current node has a timer
    if (currentNode && currentNode.node_type === 'question') {
      const timerSeconds = currentNode.metadata?.timer_seconds;

      if (timerSeconds && timerSeconds > 0) {
        // Initialize timer
        setTimeRemaining(timerSeconds);

        // Start countdown
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev === null || prev <= 1) {
              // Timer expired - auto-select default choice
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }

              // Trigger auto-select
              handleTimerExpired();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setTimeRemaining(null);
      }
    } else {
      setTimeRemaining(null);
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentNode]);

  const handleTimerExpired = () => {
    if (!currentNode || !currentNode.choices || isSubmitting) return;

    const defaultIndex = currentNode.metadata?.default_choice_index ?? 0;
    const defaultChoice = currentNode.choices[defaultIndex];

    if (defaultChoice) {
      handleChoiceSelect(defaultChoice, true);
    }
  };

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch conversation tree and progress
      const [convRes, progressRes] = await Promise.all([
        fetch(`/api/pathlab/npc-conversations/${conversationId}`),
        fetch(`/api/pathlab/npc-conversations/progress/${progressId}`),
      ]);

      if (!convRes.ok || !progressRes.ok) {
        throw new Error('Failed to load conversation');
      }

      const convData = await convRes.json();
      const progressData = await progressRes.json();

      setConversation(convData.conversation);
      setProgress(progressData.progress);
      setCurrentNode(progressData.current_node);

      // Build history from progress
      if (progressData.progress?.choice_history) {
        // TODO: Reconstruct history from choice_history
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceSelect = async (choice: NPCConversationChoice, isAutoSelected = false) => {
    if (!currentNode || isSubmitting) return;

    // Clear timer if manually selected
    if (!isAutoSelected && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeRemaining(null);
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Record this choice in history
      setHistory((prev) => [
        ...prev,
        {
          node: currentNode,
          selectedChoice: choice,
          timestamp: new Date(),
        },
      ]);

      // Submit choice to server
      const response = await fetch('/api/pathlab/npc-conversations/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_id: progressId,
          choice_id: choice.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit choice');
      }

      const data: MakeChoiceResponse = await response.json();

      // Update progress and current node
      setProgress(data.progress);
      setCurrentNode(data.next_node);

      // Check if conversation is complete
      if (data.is_completed && onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit choice');
      // Remove the optimistically added history entry
      setHistory((prev) => prev.slice(0, -1));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNPCAvatar = (avatar?: NPCAvatarData) => {
    if (!avatar?.svg_data) {
      return (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
          NPC
        </div>
      );
    }

    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatar.svg_data)}`}
        alt="NPC Avatar"
        className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-lg object-contain"
      />
    );
  };

  const renderNode = (node: NPCConversationNodeWithChoices, isHistory = false) => {
    const emotion = node.metadata?.emotion || 'neutral';

    return (
      <Card
        key={node.id}
        className={`p-6 mb-4 ${
          isHistory ? 'opacity-60' : ''
        } transition-all duration-300 hover:shadow-lg`}
      >
        <div className="flex gap-4">
          {/* NPC Avatar */}
          <div className="flex-shrink-0">
            {renderNPCAvatar(node.npc_avatar)}
          </div>

          {/* Content */}
          <div className="flex-1">
            {node.title && (
              <h3 className="font-bold text-lg mb-2">{node.title}</h3>
            )}

            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {node.text_content}
              </p>
            </div>

            {/* Emotion indicator */}
            {emotion !== 'neutral' && (
              <div className="text-sm text-gray-500 mb-2">
                <span className="italic">*{emotion}*</span>
              </div>
            )}

            {/* Node type indicator */}
            {node.node_type === 'end' && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-800 dark:text-green-300 font-semibold">
                  Conversation Complete
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderChoices = (choices: NPCConversationChoice[]) => {
    if (!choices || choices.length === 0) return null;

    const showTimer = currentNode?.metadata?.show_timer !== false && timeRemaining !== null;
    const timerSeconds = currentNode?.metadata?.timer_seconds || 0;

    return (
      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
            Choose your response:
          </p>

          {/* Timer Display */}
          {showTimer && timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              timeRemaining <= 3
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : timeRemaining <= 5
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            } transition-colors duration-300`}>
              <Clock className={`w-4 h-4 ${timeRemaining <= 3 ? 'animate-pulse' : ''}`} />
              <span className="font-mono font-bold text-sm">{timeRemaining}s</span>
            </div>
          )}
        </div>

        {/* Timer Progress Bar */}
        {showTimer && timeRemaining !== null && timerSeconds > 0 && (
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeRemaining <= 3
                  ? 'bg-red-500'
                  : timeRemaining <= 5
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${(timeRemaining / timerSeconds) * 100}%` }}
            />
          </div>
        )}

        {choices.map((choice, index) => {
          const isDefault = index === (currentNode?.metadata?.default_choice_index ?? 0);

          return (
            <Button
              key={choice.id}
              onClick={() => handleChoiceSelect(choice)}
              disabled={isSubmitting}
              variant="outline"
              className={`w-full justify-start text-left h-auto py-4 px-6 transition-all ${
                showTimer && isDefault
                  ? 'ring-2 ring-orange-400 dark:ring-orange-500 ring-offset-2'
                  : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                {choice.choice_label && (
                  <span className="flex-shrink-0 font-bold text-purple-600 dark:text-purple-400">
                    {choice.choice_label}:
                  </span>
                )}
                <span className="flex-1">{choice.choice_text}</span>
                {showTimer && isDefault && (
                  <span className="flex-shrink-0 text-xs text-orange-600 dark:text-orange-400 font-semibold">
                    [DEFAULT]
                  </span>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-600">Loading conversation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-800 dark:text-red-300">{error}</p>
        <Button onClick={loadConversation} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!conversation || !currentNode) {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-300">
          Conversation not available
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Conversation Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{conversation.title}</h2>
        {conversation.description && (
          <p className="text-gray-600 dark:text-gray-400">
            {conversation.description}
          </p>
        )}
      </div>

      {/* Conversation Thread */}
      <ScrollArea className="h-[600px] pr-4">
        {/* History */}
        {history.map((entry, index) => (
          <div key={`history-${index}`}>
            {renderNode(entry.node, true)}
            {entry.selectedChoice && (
              <div className="mb-4 ml-20 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">You said:</span>{' '}
                  {entry.selectedChoice.choice_text}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Current Node */}
        {currentNode && renderNode(currentNode, false)}

        {/* Current Choices */}
        {currentNode &&
          currentNode.node_type !== 'end' &&
          currentNode.choices &&
          renderChoices(currentNode.choices)}

        {/* Loading State */}
        {isSubmitting && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        )}
      </ScrollArea>

      {/* Progress Indicator */}
      {progress && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Nodes visited: {progress.visited_node_ids.length}</span>
            <span>
              Status: {progress.is_completed ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
