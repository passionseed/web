"use client";

import { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Target, Send, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIChatMetadata } from '@/types/pathlab-content';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PathAIChatEditorProps {
  metadata: Partial<AIChatMetadata>;
  onChange: (metadata: AIChatMetadata) => void;
}

export function PathAIChatEditor({
  metadata,
  onChange,
}: PathAIChatEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    metadata.system_prompt || ''
  );
  const [objective, setObjective] = useState(metadata.objective || '');
  const [completionCriteria, setCompletionCriteria] = useState(
    metadata.completion_criteria || ''
  );

  // Test chat state
  const [showTestChat, setShowTestChat] = useState(false);
  const [testMessages, setTestMessages] = useState<Message[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testCompletionPercentage, setTestCompletionPercentage] = useState(0);
  const [testIsCompleted, setTestIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (showTestChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testMessages, showTestChat]);

  const handleSave = () => {
    if (!systemPrompt.trim()) {
      toast.error('System prompt is required');
      return;
    }

    if (!objective.trim()) {
      toast.error('Objective is required');
      return;
    }

    onChange({
      system_prompt: systemPrompt,
      objective,
      completion_criteria: completionCriteria || undefined,
      model: 'passion-6',
    });

    toast.success('AI Chat configuration saved');
  };

  const handleTestChat = async () => {
    if (!systemPrompt.trim()) {
      toast.error('Please set a system prompt first');
      return;
    }

    // Reset test state
    setTestMessages([]);
    setTestCompletionPercentage(0);
    setTestIsCompleted(false);
    setShowTestChat(true);

    // Send initial greeting from AI
    setIsSending(true);
    try {
      const response = await fetch('/api/pathlab/ai-chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          objective: objective,
          completion_criteria: completionCriteria,
          messages: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat');
      }

      const data = await response.json();
      setTestMessages([
        {
          role: 'assistant',
          content: data.message,
        },
      ]);
      setTestCompletionPercentage(data.completion_percentage || 0);
    } catch (error) {
      console.error('Test chat error:', error);
      toast.error('Failed to start test chat');
      setShowTestChat(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testInput.trim() || isSending || testIsCompleted) return;

    const userMessage = testInput.trim();
    setTestInput('');

    // Add user message
    const newMessages = [
      ...testMessages,
      { role: 'user' as const, content: userMessage },
    ];
    setTestMessages(newMessages);

    // Send to AI
    setIsSending(true);
    try {
      const response = await fetch('/api/pathlab/ai-chat/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          objective: objective,
          completion_criteria: completionCriteria,
          messages: newMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const updatedMessages = [
        ...newMessages,
        {
          role: 'assistant',
          content: data.message,
        },
      ];
      setTestMessages(updatedMessages);
      setTestCompletionPercentage(data.completion_percentage || 0);
      setTestIsCompleted(data.is_completed || false);

      if (data.is_completed && !testIsCompleted) {
        toast.success('Test objective completed! 🎉');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      // Remove optimistic message
      setTestMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="system-prompt" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            System Prompt (AI Instructions)
          </Label>
          <Textarea
            id="system-prompt"
            placeholder="You are a helpful mentor guiding students through their learning journey..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="mt-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Instructions for the AI on how to behave and what to help with
          </p>
        </div>

        <div>
          <Label htmlFor="objective" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Conversation Objective
          </Label>
          <Input
            id="objective"
            placeholder="e.g., Help student identify 3 potential career paths"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="mt-2"
          />
          <p className="mt-1 text-xs text-neutral-500">
            What should students achieve by completing this chat?
          </p>
        </div>

        <div>
          <Label htmlFor="completion-criteria" className="text-neutral-400">
            Completion Criteria (Optional)
          </Label>
          <Textarea
            id="completion-criteria"
            placeholder="Chat completes when student has: 1) Listed 3 careers, 2) Explained why each interests them, 3) Identified next steps"
            value={completionCriteria}
            onChange={(e) => setCompletionCriteria(e.target.value)}
            rows={3}
            className="mt-2 text-sm"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Specific criteria for marking the chat as complete (helps AI know when to wrap up)
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Save Configuration
          </Button>
          <Button
            variant="outline"
            onClick={handleTestChat}
            className="gap-2"
            disabled={!systemPrompt}
          >
            <MessageSquare className="h-4 w-4" />
            Test Chat
          </Button>
        </div>
      </div>

      {/* Test Chat Modal - Student View */}
      <Dialog open={showTestChat} onOpenChange={setShowTestChat}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="border-b border-neutral-800 bg-neutral-900/50 p-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <DialogTitle className="text-white">Test AI Chat</DialogTitle>
                  {testIsCompleted && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <p className="mt-1 text-sm text-neutral-400">{objective || 'Testing AI chat behavior'}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Progress (Test Mode)</span>
                <span
                  className={cn(
                    'font-medium',
                    testIsCompleted ? 'text-green-500' : 'text-blue-400'
                  )}
                >
                  {testCompletionPercentage}%
                </span>
              </div>
              <Progress
                value={testCompletionPercentage}
                className={cn(
                  'h-2',
                  testIsCompleted ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'
                )}
              />
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {testMessages.length === 0 && !isSending && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-neutral-700" />
                  <p className="mt-3 text-sm text-neutral-500">
                    Testing your AI configuration
                  </p>
                </div>
              </div>
            )}

            {testMessages.map((msg, i) => (
              <div
                key={i}
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
          <div className="border-t border-neutral-800 bg-neutral-900/30 p-6 pt-4">
            {testIsCompleted ? (
              <div className="flex items-center justify-center gap-2 text-sm text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span>Test objective completed! Your AI configuration is working well.</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendTestMessage();
                    }
                  }}
                  placeholder="Type a message to test the AI..."
                  disabled={isSending || testIsCompleted}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendTestMessage}
                  disabled={!testInput.trim() || isSending || testIsCompleted}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
