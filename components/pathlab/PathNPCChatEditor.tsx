'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MessageSquare } from 'lucide-react';
import type { NPCChatMetadata } from '@/types/pathlab-content';
import type { NPCConversation } from '@/types/npc-conversations';

interface PathNPCChatEditorProps {
  metadata: Partial<NPCChatMetadata>;
  onChange: (metadata: Partial<NPCChatMetadata>) => void;
}

export function PathNPCChatEditor({ metadata, onChange }: PathNPCChatEditorProps) {
  const [conversations, setConversations] = useState<NPCConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available conversations
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pathlab/npc-conversations');

      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationChange = (conversationId: string) => {
    onChange({
      ...metadata,
      conversation_id: conversationId,
    });
  };

  const handleAllowRestartChange = (checked: boolean) => {
    onChange({
      ...metadata,
      allow_restart: checked,
    });
  };

  const handleShowHistoryChange = (checked: boolean) => {
    onChange({
      ...metadata,
      show_history: checked,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-purple-950/20 rounded-lg border border-purple-800/50">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400 mr-2" />
        <span className="text-sm text-purple-300">Loading conversations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-950/20 rounded-lg border border-red-800/50">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  const selectedConversation = conversations.find(
    (c) => c.id === metadata.conversation_id
  );

  return (
    <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/50 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        <Label className="text-base font-semibold text-purple-300">
          NPC Conversation Configuration
        </Label>
      </div>

      {/* Conversation Selection */}
      <div className="space-y-2">
        <Label htmlFor="conversation">Select Conversation *</Label>
        <Select
          value={metadata.conversation_id || ''}
          onValueChange={handleConversationChange}
        >
          <SelectTrigger id="conversation" className="bg-background">
            <SelectValue placeholder="Choose a conversation..." />
          </SelectTrigger>
          <SelectContent>
            {conversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center space-y-2">
                <p>No conversations available.</p>
                <a
                  href="/admin/npc-conversations/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                >
                  Create Conversation →
                </a>
              </div>
            ) : (
              conversations.map((conv) => (
                <SelectItem key={conv.id} value={conv.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{conv.title}</span>
                    {conv.description && (
                      <span className="text-xs text-muted-foreground">
                        {conv.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {selectedConversation && (
          <div className="mt-2 p-3 bg-purple-900/30 rounded border border-purple-700/30">
            <p className="text-xs text-purple-200">
              <strong>Selected:</strong> {selectedConversation.title}
            </p>
            {selectedConversation.description && (
              <p className="text-xs text-purple-300 mt-1">
                {selectedConversation.description}
              </p>
            )}
            {selectedConversation.estimated_minutes && (
              <p className="text-xs text-purple-300 mt-1">
                Estimated time: {selectedConversation.estimated_minutes} minutes
              </p>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3 pt-2 border-t border-purple-700/30">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowRestart"
            checked={metadata.allow_restart ?? false}
            onCheckedChange={handleAllowRestartChange}
          />
          <Label
            htmlFor="allowRestart"
            className="cursor-pointer text-sm text-purple-200"
          >
            Allow students to restart conversation
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showHistory"
            checked={metadata.show_history ?? true}
            onCheckedChange={handleShowHistoryChange}
          />
          <Label
            htmlFor="showHistory"
            className="cursor-pointer text-sm text-purple-200"
          >
            Show conversation history
          </Label>
        </div>
      </div>

      <div className="pt-2 border-t border-purple-700/30">
        <p className="text-xs text-purple-300/70">
          Students will navigate through the branching conversation by making choices.
          Progress is automatically saved and the activity completes when they reach an
          ending node.
        </p>
        {conversations.length === 0 && (
          <div className="mt-3">
            <a
              href="/admin/npc-conversations/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              + Create Your First Conversation
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
