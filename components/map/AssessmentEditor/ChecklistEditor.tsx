"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { NodeAssessment } from "@/types/map";

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
}

interface ChecklistEditorProps {
  assessment: NodeAssessment;
  onAssessmentChange: (updatedAssessment: NodeAssessment) => void;
}

export function ChecklistEditor({ assessment, onAssessmentChange }: ChecklistEditorProps) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  // Get checklist items from assessment metadata or initialize empty
  const checklistItems: ChecklistItem[] = assessment.metadata?.checklist_items || [];

  const addChecklistItem = () => {
    if (!newItemTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `checklist_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || undefined,
      required: true, // Default to required
    };

    const updatedItems = [...checklistItems, newItem];
    updateChecklistItems(updatedItems);
    
    // Clear form
    setNewItemTitle("");
    setNewItemDescription("");
  };

  const removeChecklistItem = (itemId: string) => {
    const updatedItems = checklistItems.filter(item => item.id !== itemId);
    updateChecklistItems(updatedItems);
  };

  const updateChecklistItem = (itemId: string, updates: Partial<ChecklistItem>) => {
    const updatedItems = checklistItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateChecklistItems(updatedItems);
  };

  const updateChecklistItems = (items: ChecklistItem[]) => {
    const updatedAssessment = {
      ...assessment,
      metadata: {
        ...assessment.metadata,
        checklist_items: items,
      }
    };
    onAssessmentChange(updatedAssessment);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= checklistItems.length) return;
    
    const newItems = [...checklistItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    updateChecklistItems(newItems);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckSquare className="h-4 w-4" />
        <span>Create a checklist of tasks that students must complete to pass this assessment</span>
      </div>

      {/* Add New Item Form */}
      <Card className="border-dashed border-2">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Title *</label>
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="e.g., Complete the reading assignment"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Additional details or instructions for this task..."
              className="w-full resize-none"
              rows={2}
            />
          </div>

          <Button 
            onClick={addChecklistItem}
            disabled={!newItemTitle.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Checklist Item
          </Button>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      {checklistItems.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Checklist Items</h4>
            <Badge variant="outline">
              {checklistItems.length} {checklistItems.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          <div className="space-y-2">
            {checklistItems.map((item, index) => (
              <Card key={item.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 cursor-move opacity-50 group-hover:opacity-100"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                      >
                        <GripVertical className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.title}
                        onChange={(e) => updateChecklistItem(item.id, { title: e.target.value })}
                        className="font-medium"
                        placeholder="Task title"
                      />
                      
                      {item.description !== undefined && (
                        <Textarea
                          value={item.description || ""}
                          onChange={(e) => updateChecklistItem(item.id, { 
                            description: e.target.value || undefined 
                          })}
                          placeholder="Task description..."
                          className="resize-none text-sm"
                          rows={2}
                        />
                      )}
                      
                      {item.description === undefined && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => updateChecklistItem(item.id, { description: "" })}
                        >
                          + Add description
                        </Button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeChecklistItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex flex-col gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-50 group-hover:opacity-100"
                          onClick={() => moveItem(index, index + 1)}
                          disabled={index === checklistItems.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Item Number */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Students will see this as item #{index + 1}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">No checklist items yet</h3>
            <p className="text-sm text-muted-foreground">
              Add tasks above to create a checklist for students to complete.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {checklistItems.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 mb-1">How the checklist works:</p>
              <ul className="text-blue-700 space-y-1 list-disc list-inside">
                <li>Students will see each task as a checkbox they can check off</li>
                <li>They must check all items to complete the assessment</li>
                <li>Once all items are checked, they can submit the assessment</li>
                <li>You can reorder items by using the arrow buttons</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}