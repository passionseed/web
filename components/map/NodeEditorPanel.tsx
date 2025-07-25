"use client";

import { useEffect, useState, useTransition } from 'react';
import { Node } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MapNode, NodeContent, NodeAssessment } from '@/types/map';
import { updateNode } from '@/lib/supabase/maps';
import { Loader2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from '@/components/ui/slider';
import { ContentEditor } from './ContentEditor';
import { AssessmentEditor } from './AssessmentEditor';

interface NodeEditorPanelProps {
  selectedNode: Node<MapNode> | null;
  onNodeDataChange: (nodeId: string, data: Partial<MapNode>) => void;
}

export function NodeEditorPanel({ selectedNode, onNodeDataChange }: NodeEditorPanelProps) {
  const [nodeData, setNodeData] = useState<Partial<MapNode>>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    }
  }, [selectedNode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNodeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (value: number[]) => {
    setNodeData(prev => ({ ...prev, difficulty: value[0] }));
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;

    startTransition(async () => {
      try {
        const { id, title, instructions, difficulty, sprite_url } = nodeData;
        const updatedNode = await updateNode(id!, {
          title,
          instructions,
          difficulty,
          sprite_url,
        });
        toast({ title: 'Node Details Updated' });
        onNodeDataChange(selectedNode.id, { ...updatedNode, label: updatedNode.title });
      } catch (error) {
        toast({ title: 'Error updating node', variant: 'destructive' });
      }
    });
  };

  const handleContentChange = (changedContent: NodeContent, action: 'add' | 'update' | 'delete') => {
    if (!selectedNode) return;

    let newContentList: NodeContent[];
    const currentContent = (nodeData as any).node_content || [];

    if (action === 'add') {
        newContentList = [...currentContent, changedContent];
    } else if (action === 'update') {
        newContentList = currentContent.map((c: NodeContent) => c.id === changedContent.id ? changedContent : c);
    } else { // delete
        newContentList = currentContent.filter((c: NodeContent) => c.id !== changedContent.id);
    }
    
    const updatedNodeData = { ...nodeData, node_content: newContentList };
    setNodeData(updatedNodeData);
    onNodeDataChange(selectedNode.id, { node_content: newContentList } as any);
  };

  const handleAssessmentChange = (changedAssessment: NodeAssessment | null, action: 'add' | 'delete') => {
    if (!selectedNode) return;
    
    const newAssessments = action === 'add' && changedAssessment ? [changedAssessment] : [];
    
    const updatedNodeData = { ...nodeData, node_assessments: newAssessments };
    setNodeData(updatedNodeData);
    onNodeDataChange(selectedNode.id, { node_assessments: newAssessments } as any);
  };

  if (!selectedNode) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a node to edit its details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 h-full">
        <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
                <TabsTrigger value="assessment" className="flex-1">Assessment</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="flex-grow">
                <form onSubmit={handleSubmitDetails} className="p-2 space-y-4 h-full flex flex-col">
                    <div className="flex-grow space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" value={nodeData.title || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea id="instructions" name="instructions" placeholder="Instructions for the student..." value={nodeData.instructions || ''} onChange={handleInputChange} className="min-h-[100px]" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty: {nodeData.difficulty}</Label>
                            <Slider id="difficulty" name="difficulty" min={1} max={10} step={1} value={[nodeData.difficulty || 1]} onValueChange={handleSliderChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sprite_url">Sprite URL</Label>
                            <Input id="sprite_url" name="sprite_url" placeholder="http://path/to/image.png" value={nodeData.sprite_url || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Details
                    </Button>
                </form>
            </TabsContent>
            <TabsContent value="content" className="flex-grow overflow-y-auto">
                <div className="h-full flex flex-col">
                    <div className="flex-grow">
                        <ContentEditor 
                            nodeId={selectedNode.id} 
                            content={(nodeData as any).node_content || []}
                            onContentChange={handleContentChange}
                        />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="assessment" className="flex-grow overflow-y-auto">
                <div className="h-full flex flex-col">
                    <div className="flex-grow">
                        <AssessmentEditor 
                            nodeId={selectedNode.id}
                            assessment={(nodeData as any).node_assessments?.[0] || null}
                            onAssessmentChange={handleAssessmentChange}
                        />
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
