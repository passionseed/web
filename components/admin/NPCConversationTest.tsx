'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCcw } from 'lucide-react';

interface NPCConversationTestProps {
  conversationId: string;
}

interface TestNode {
  id: string;
  node_type: 'question' | 'statement' | 'end';
  text_content: string;
  title: string | null;
  npc_avatar?: {
    name: string;
    avatar_url?: string;
  } | null;
  metadata: any;
  choices?: TestChoice[];
}

interface TestChoice {
  id: string;
  to_node_id: string | null;
  choice_text: string;
  choice_label: string | null;
  display_order: number;
}

interface ConversationData {
  conversation: {
    conversation: {
      id: string;
      title: string;
      description: string | null;
      root_node_id: string;
    };
    nodes: TestNode[];
    root_node: TestNode | null;
  };
}

interface HistoryEntry {
  node: TestNode;
  choice?: TestChoice;
}

export function NPCConversationTest({ conversationId }: NPCConversationTestProps) {
  const [data, setData] = useState<ConversationData | null>(null);
  const [currentNode, setCurrentNode] = useState<TestNode | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/pathlab/npc-conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const result = await response.json();
      setData(result);

      // Use root node from response or find it
      const rootNode = result.conversation.root_node ||
        result.conversation.nodes.find((n: TestNode) => n.id === result.conversation.conversation.root_node_id);
      if (rootNode) {
        setCurrentNode(rootNode);
        setHistory([{ node: rootNode }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceSelect = (choice: TestChoice) => {
    if (!data || !currentNode) return;

    // Find next node
    const nextNode = choice.to_node_id
      ? data.conversation.nodes.find((n) => n.id === choice.to_node_id)
      : null;

    if (nextNode) {
      setHistory((prev) => [...prev, { node: currentNode, choice }, { node: nextNode }]);
      setCurrentNode(nextNode);
    } else {
      // No next node - conversation ends
      setHistory((prev) => [...prev, { node: currentNode, choice }]);
      setCurrentNode(null);
    }
  };

  const handleRestart = () => {
    if (!data) return;
    const rootNode = data.conversation.root_node ||
      data.conversation.nodes.find((n) => n.id === data.conversation.conversation.root_node_id);
    if (rootNode) {
      setCurrentNode(rootNode);
      setHistory([{ node: rootNode }]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadConversation} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data || !currentNode) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Conversation completed or unavailable</p>
        <Button onClick={handleRestart} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Restart
        </Button>
      </div>
    );
  }

  const isEndNode = currentNode.node_type === 'end';
  const sortedChoices = currentNode.choices?.sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <div className="flex flex-col h-[600px]">
      {/* Conversation History */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={index}>
              {/* Show choice if it exists */}
              {entry.choice && (
                <div className="flex justify-end mb-2">
                  <div className="bg-primary/20 text-primary px-4 py-2 rounded-lg max-w-[80%]">
                    {entry.choice.choice_label && (
                      <span className="font-bold mr-2">{entry.choice.choice_label}.</span>
                    )}
                    {entry.choice.choice_text}
                  </div>
                </div>
              )}

              {/* Show node */}
              {entry.node && (
                <div className="flex gap-3 mb-4">
                  {/* NPC Avatar */}
                  {entry.node.npc_avatar && (
                    <div className="flex-shrink-0">
                      {entry.node.npc_avatar.avatar_url ? (
                        <img
                          src={entry.node.npc_avatar.avatar_url}
                          alt={entry.node.npc_avatar.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {entry.node.npc_avatar.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="flex-1">
                    <Card className="bg-muted">
                      <CardContent className="p-4">
                        {entry.node.title && (
                          <h4 className="font-semibold mb-2">{entry.node.title}</h4>
                        )}
                        <p className="text-sm leading-relaxed">{entry.node.text_content}</p>
                        {entry.node.npc_avatar && (
                          <p className="text-xs text-muted-foreground mt-2">
                            — {entry.node.npc_avatar.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Choice Selection - Only show if not at end */}
      {!isEndNode && sortedChoices.length > 0 && (
        <div className="border-t p-4 bg-background">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Choose your response:</p>
            {sortedChoices.map((choice) => (
              <Button
                key={choice.id}
                onClick={() => handleChoiceSelect(choice)}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4"
              >
                {choice.choice_label && (
                  <span className="font-bold mr-2">{choice.choice_label}.</span>
                )}
                {choice.choice_text}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* End state */}
      {isEndNode && (
        <div className="border-t p-4 bg-background">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-green-600">Conversation Complete</p>
            <Button onClick={handleRestart} variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Conversation
            </Button>
          </div>
        </div>
      )}

      {/* Restart button at bottom (always visible) */}
      <div className="border-t p-2 bg-muted/30">
        <Button
          onClick={handleRestart}
          variant="ghost"
          size="sm"
          className="w-full text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-2" />
          Restart from Beginning
        </Button>
      </div>
    </div>
  );
}
