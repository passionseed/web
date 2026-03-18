'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, ArrowLeft, Code } from 'lucide-react';

export function NPCConversationEditor({
  conversation,
  nodes,
  avatars,
}: any) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{conversation.title}</h1>
          <p className="text-muted-foreground">{conversation.description}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card className="bg-yellow-950/20 border-yellow-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-300">
            <Code className="w-5 h-5" />
            Visual Builder Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-yellow-200/80">
            The visual conversation builder is under development. For now, you can:
          </p>

          <div className="space-y-2">
            <h3 className="font-semibold text-yellow-300">Option 1: Use the Seed Script</h3>
            <p className="text-sm text-yellow-200/80">
              Run the seed script to create a complete example conversation:
            </p>
            <pre className="bg-black/30 p-3 rounded text-sm text-yellow-100 overflow-x-auto">
              npx tsx scripts/seed-npc-conversation.ts
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-yellow-300">Option 2: Use SQL</h3>
            <p className="text-sm text-yellow-200/80">
              Create nodes and choices directly using SQL. See the documentation at:
            </p>
            <pre className="bg-black/30 p-3 rounded text-sm text-yellow-100">
              docs/npc-conversation-system.md
            </pre>
          </div>

          <div className="pt-4 border-t border-yellow-700/30">
            <p className="text-xs text-yellow-200/60">
              Conversation ID: <code className="bg-black/30 px-1 py-0.5 rounded">{conversation.id}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation Nodes ({nodes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nodes.map((node: any) => (
                <div
                  key={node.id}
                  className="p-3 bg-muted rounded border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{node.title || node.text_content.substring(0, 50)}...</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Type: {node.node_type} • Choices: {node.choices?.length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
