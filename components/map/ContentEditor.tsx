"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createNodeContent, updateNodeContent, deleteNodeContent } from '@/lib/supabase/maps';
import { NodeContent, ContentType } from '@/types/map';
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ContentEditorProps {
  nodeId: string;
  content: NodeContent[];
  onContentChange: (newContent: NodeContent, action: 'add' | 'update' | 'delete') => void;
}

const ContentForm = ({
  nodeId,
  existingContent,
  onSave,
  onCancel,
}: {
  nodeId: string;
  existingContent?: NodeContent;
  onSave: (content: NodeContent) => void;
  onCancel: () => void;
}) => {
  const [contentType, setContentType] = useState<ContentType>(existingContent?.content_type || 'video');
  const [contentUrl, setContentUrl] = useState(existingContent?.content_url || '');
  const [contentBody, setContentBody] = useState(existingContent?.content_body || '');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      id: existingContent?.id || `temp_content_${Date.now()}_${Math.random()}`,
      node_id: nodeId,
      content_type: contentType,
      content_url: ['video', 'canva_slide'].includes(contentType) ? contentUrl : null,
      content_body: contentType === 'text_with_images' ? contentBody : null,
      created_at: existingContent?.created_at || new Date().toISOString()
    };
    
    onSave(payload as NodeContent);
    toast({ title: `Content ${existingContent ? 'updated' : 'created'} (Save map to persist)` });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <Select value={contentType} onValueChange={(v: ContentType) => setContentType(v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select content type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="video">Video</SelectItem>
          <SelectItem value="canva_slide">Canva Slide</SelectItem>
          <SelectItem value="text_with_images">Text & Images</SelectItem>
        </SelectContent>
      </Select>

      {(contentType === 'video' || contentType === 'canva_slide') && (
        <div className="space-y-2">
          <Label htmlFor="content_url">URL</Label>
          <Input id="content_url" value={contentUrl} onChange={e => setContentUrl(e.target.value)} placeholder="https://..." />
        </div>
      )}

      {contentType === 'text_with_images' && (
        <div className="space-y-2">
          <Label htmlFor="content_body">Content (HTML supported)</Label>
          <Textarea id="content_body" value={contentBody} onChange={e => setContentBody(e.target.value)} className="min-h-[150px]" />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
};

export function ContentEditor({ nodeId, content, onContentChange }: ContentEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSave = (savedContent: NodeContent) => {
    const isUpdate = content.some(c => c.id === savedContent.id);
    onContentChange(savedContent, isUpdate ? 'update' : 'add');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onContentChange({ id } as NodeContent, 'delete');
    toast({ title: 'Content deleted (Save map to persist)' });
  };

  return (
    <div className="space-y-4 p-2">
      {content.map(item => (
        <Card key={item.id}>
          <CardContent className="p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold capitalize">{item.content_type.replace('_', ' ')}</p>
              <p className="text-sm text-muted-foreground truncate max-w-xs">
                {item.content_url || item.content_body?.substring(0, 50) + '...'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingId(item.id)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
          {editingId === item.id && (
            <div className="p-2">
              <ContentForm nodeId={nodeId} existingContent={item} onSave={handleSave} onCancel={() => setEditingId(null)} />
            </div>
          )}
        </Card>
      ))}

      {isAdding ? (
        <ContentForm nodeId={nodeId} onSave={handleSave} onCancel={() => setIsAdding(false)} />
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      )}
    </div>
  );
}
