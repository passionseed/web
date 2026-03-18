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
import { Save, ArrowLeft } from 'lucide-react';

interface Seed {
  id: string;
  title: string;
}

interface NPCAvatar {
  id: string;
  seed_id: string;
  name: string;
  description: string | null;
}

interface NPCConversationBuilderProps {
  seeds: Seed[];
  avatars: NPCAvatar[];
}

export function NPCConversationBuilder({ seeds, avatars }: NPCConversationBuilderProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [seedId, setSeedId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  const handleSave = async () => {
    if (!seedId || !title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/npc-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_id: seedId,
          title,
          description: description || null,
          estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      toast.success('Conversation created!');

      // Redirect to the builder
      router.push(`/admin/npc-conversations/${data.conversation.id}/edit`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seed Selection */}
          <div className="space-y-2">
            <Label htmlFor="seed">Seed *</Label>
            <Select value={seedId} onValueChange={setSeedId}>
              <SelectTrigger id="seed">
                <SelectValue placeholder="Select a seed..." />
              </SelectTrigger>
              <SelectContent>
                {seeds.map((seed) => (
                  <SelectItem key={seed.id} value={seed.id}>
                    {seed.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Conversation Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Career Path Discovery"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this conversation is about..."
              rows={3}
            />
          </div>

          {/* Estimated Minutes */}
          <div className="space-y-2">
            <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min="0"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="e.g., 10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-950/20 border-blue-800/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-300">What's Next?</h3>
            <p className="text-sm text-blue-200/80">
              After creating the conversation, you'll be taken to the visual builder where you can:
            </p>
            <ul className="text-sm text-blue-200/80 list-disc list-inside space-y-1 ml-2">
              <li>Add conversation nodes (questions, statements, endings)</li>
              <li>Create choice branches</li>
              <li>Assign NPC avatars to nodes</li>
              <li>Preview the conversation flow</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!seedId || !title || isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Creating...' : 'Create Conversation'}
        </Button>
      </div>
    </div>
  );
}
