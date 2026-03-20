'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, MessageSquare, Play, Upload, Download, FileJson, CheckCircle } from 'lucide-react';
import type { NPCChatMetadata } from '@/types/pathlab-content';
import { NPCConversationTest } from '@/components/admin/NPCConversationTest';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PathNPCChatEditorProps {
  metadata: Partial<NPCChatMetadata>;
  onChange: (metadata: Partial<NPCChatMetadata>) => void;
  activityTitle?: string;
}

interface ConversationData {
  conversation: {
    id: string;
    title: string;
    description: string | null;
  };
  nodes: any[];
}

export function PathNPCChatEditor({ metadata, onChange, activityTitle }: PathNPCChatEditorProps) {
  const router = useRouter();
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Load conversation data if conversation_id exists
  useEffect(() => {
    if (metadata.conversation_id) {
      loadConversation();
    }
  }, [metadata.conversation_id]);

  const loadConversation = async () => {
    if (!metadata.conversation_id) return;

    try {
      setIsLoading(true);
      console.log('[NPC Chat] Loading conversation:', metadata.conversation_id);
      const response = await fetch(`/api/pathlab/npc-conversations/${metadata.conversation_id}`);
      if (!response.ok) throw new Error('Failed to load conversation');

      const data = await response.json();
      console.log('[NPC Chat] Loaded conversation:', data.conversation);
      setConversationData(data.conversation);
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      toast.error('Please paste conversation JSON');
      return;
    }

    if (!metadata.conversation_id) {
      toast.error('No conversation ID found. Please save the activity first.');
      return;
    }

    setIsImporting(true);
    try {
      const parsedData = JSON.parse(importJson);

      const response = await fetch(`/api/admin/npc-conversations/${metadata.conversation_id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      toast.success(`Imported ${result.nodesCreated} nodes and ${result.choicesCreated} choices!`);
      setShowImportDialog(false);
      setImportJson('');

      // Reload conversation data
      await loadConversation();
    } catch (error: any) {
      console.error('Import error:', error);
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format. Please check your syntax.');
      } else {
        toast.error(error.message || 'Failed to import conversation');
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadExample = () => {
    const exampleConversation = {
      "_comment": "Example NPC Conversation - Modify this template for your needs",
      "_documentation": "See docs/npc-conversation-json-format.md for full format details",
      "_note": "Add the conversation summary in the PathLab activity editor UI (not in this JSON)",

      nodes: [
        {
          id: "start",
          type: "question",
          title: "Welcome!",
          text: "Hi! What would you like to explore today?",
          metadata: {
            emotion: "happy",
            timer_seconds: 10,
            default_choice_index: 0,
            show_timer: true
          }
        },
        {
          id: "tech_path",
          type: "question",
          text: "Technology is exciting! Which area interests you most?",
          metadata: {
            emotion: "thoughtful"
          }
        },
        {
          id: "creative_path",
          type: "question",
          text: "Creative fields are wonderful! What creative area calls to you?",
          metadata: {
            emotion: "happy"
          }
        },
        {
          id: "ai_ending",
          type: "end",
          title: "AI Journey",
          text: "Artificial Intelligence is a great choice! Start with Python and machine learning basics.",
          metadata: {
            emotion: "happy"
          }
        },
        {
          id: "web_ending",
          type: "end",
          title: "Web Development",
          text: "Web development is in high demand! Begin with HTML, CSS, and JavaScript.",
          metadata: {
            emotion: "happy"
          }
        },
        {
          id: "design_ending",
          type: "end",
          title: "Design Path",
          text: "Design is all about creativity! Learn tools like Figma and study design principles.",
          metadata: {
            emotion: "happy"
          }
        },
        {
          id: "art_ending",
          type: "end",
          title: "Digital Art",
          text: "Digital art opens endless possibilities! Master digital painting tools.",
          metadata: {
            emotion: "happy"
          }
        }
      ],

      choices: [
        {
          from: "start",
          to: "tech_path",
          text: "Technology and programming",
          label: "A",
          order: 0
        },
        {
          from: "start",
          to: "creative_path",
          text: "Creative arts and design",
          label: "B",
          order: 1
        },
        {
          from: "tech_path",
          to: "ai_ending",
          text: "Artificial Intelligence & Machine Learning",
          label: "Q1",
          order: 0
        },
        {
          from: "tech_path",
          to: "web_ending",
          text: "Web Development & Frontend",
          label: "Q2",
          order: 1
        },
        {
          from: "creative_path",
          to: "design_ending",
          text: "UX/UI Design",
          label: "Q1",
          order: 0
        },
        {
          from: "creative_path",
          to: "art_ending",
          text: "Digital Art & Illustration",
          label: "Q2",
          order: 1
        }
      ],

      root_node: "start"
    };

    const blob = new Blob([JSON.stringify(exampleConversation, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'conversation-example.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Example downloaded! Modify it and import back.');
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

  const hasNodes = conversationData && conversationData.nodes.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-purple-950/20 rounded-lg border border-purple-800/50">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400 mr-2" />
        <span className="text-sm text-purple-300">Loading conversation...</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-800/50 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-purple-400" />
        <Label className="text-base font-semibold text-purple-300">
          NPC Conversation Configuration
        </Label>
      </div>

      {/* Import Section - Show if no nodes OR show import button */}
      {!metadata.conversation_id ? (
        <div className="p-4 bg-blue-950/20 border border-blue-700/50 rounded text-sm text-blue-200">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating conversation...
          </div>
        </div>
      ) : (
        <>
          {hasNodes ? (
            // Conversation imported - show success state
            <div className="space-y-3">
              <div className="p-3 bg-green-900/30 rounded border border-green-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className="text-sm font-medium text-green-200">
                    Conversation Ready
                  </p>
                </div>
                <p className="text-xs text-green-300">
                  {conversationData.nodes.length} nodes configured
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowTestDialog(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-purple-600/50 hover:bg-purple-900/50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test Conversation
                </Button>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-purple-600/50 hover:bg-purple-900/50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Re-import
                </Button>
              </div>
            </div>
          ) : (
            // No conversation - show import options
            <div className="space-y-3">
              <p className="text-sm text-purple-200">
                Import your conversation JSON to get started.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={downloadExample}
                  variant="outline"
                  size="sm"
                  className="border-purple-600/50 hover:bg-purple-900/50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Example
                </Button>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Conversation Summary */}
      <div className="space-y-2 pt-2 border-t border-purple-700/30">
        <Label htmlFor="conversationSummary" className="text-sm text-purple-200">
          Conversation Summary (optional)
          <span className="text-xs text-purple-400 ml-2">
            Brief description shown to students
          </span>
        </Label>
        <Textarea
          id="conversationSummary"
          value={metadata.summary || ''}
          onChange={(e) => onChange({ ...metadata, summary: e.target.value })}
          placeholder="e.g., Explore career paths through a guided conversation with a career counselor..."
          rows={3}
          className="bg-background resize-none text-sm"
        />
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
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="importJson">Paste your conversation JSON:</Label>
              <Textarea
                id="importJson"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"nodes": [...], "choices": [...], "root_node": "node_1"}'
                rows={15}
                className="font-mono text-sm mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportJson('');
                }}
                variant="outline"
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importJson.trim() || isImporting}
              >
                {isImporting ? 'Importing...' : 'Import Conversation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Conversation Dialog */}
      {metadata.conversation_id && (
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Test Conversation</DialogTitle>
            </DialogHeader>
            <NPCConversationTest conversationId={metadata.conversation_id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
