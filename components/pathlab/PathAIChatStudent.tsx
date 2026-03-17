"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface PathAIChatStudentProps {
  activityId: string;
  progressId: string;
  objective: string;
  onComplete?: () => void;
}

export function PathAIChatStudent({
  activityId,
  progressId,
  objective,
  onComplete,
}: PathAIChatStudentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing chat history
  useEffect(() => {
    loadChatHistory();
  }, [activityId, progressId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(
        `/api/pathlab/ai-chat/${activityId}?progressId=${progressId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load chat');
      }

      const data = await response.json();

      if (data.session) {
        setMessages(data.messages || []);
        setCompletionPercentage(data.session.completion_percentage || 0);
        setIsCompleted(data.session.is_completed || false);
      }
    } catch (error) {
      console.error('Load chat error:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending || isCompleted) return;

    const userMessage = input.trim();
    setInput('');

    // Optimistically add user message
    const optimisticUserMsg: Message = {
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    setIsSending(true);
    try {
      const response = await fetch(`/api/pathlab/ai-chat/${activityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          progressId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
        },
      ]);

      // Update progress
      setCompletionPercentage(data.completion_percentage);
      setIsCompleted(data.is_completed);

      if (data.is_completed && !isCompleted) {
        toast.success('Objective completed! 🎉');
        onComplete?.();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      // Remove optimistic message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="flex h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-neutral-400">Loading chat...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden">
      {/* Header with objective and progress */}
      <div className="border-b border-neutral-800 bg-neutral-900/50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <h3 className="font-medium text-white">AI Chat</h3>
              {isCompleted && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-400">{objective}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Progress</span>
            <span
              className={cn(
                'font-medium',
                isCompleted ? 'text-green-500' : 'text-blue-400'
              )}
            >
              {completionPercentage}%
            </span>
          </div>
          <Progress
            value={completionPercentage}
            className={cn(
              'h-2',
              isCompleted ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'
            )}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Sparkles className="mx-auto h-12 w-12 text-neutral-700" />
              <p className="mt-3 text-sm text-neutral-500">
                Start chatting to work towards your objective
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-200'
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-neutral-800 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 bg-neutral-900/30 p-4">
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 text-sm text-green-500">
            <CheckCircle className="h-5 w-5" />
            <span>Objective completed! Great work!</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              disabled={isSending || isCompleted}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isSending || isCompleted}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
