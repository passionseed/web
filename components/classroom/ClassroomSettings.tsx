"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, Settings, Users, BookOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClassroomSettingsData {
  id: string;
  name: string;
  description?: string;
  join_code: string;
  max_students: number;
  enable_assignments: boolean;
  settings: Record<string, any>;
}

interface ClassroomSettingsProps {
  classroom: ClassroomSettingsData;
  onSave: (settings: Partial<ClassroomSettingsData>) => Promise<void>;
  canManage: boolean;
}

export function ClassroomSettings({ 
  classroom, 
  onSave, 
  canManage 
}: ClassroomSettingsProps) {
  const [formData, setFormData] = useState({
    name: classroom.name,
    description: classroom.description || "",
    max_students: classroom.max_students,
    enable_assignments: classroom.enable_assignments,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!canManage) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      await onSave({
        name: formData.name,
        description: formData.description,
        max_students: formData.max_students,
        enable_assignments: formData.enable_assignments,
      });
      
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = 
    formData.name !== classroom.name ||
    formData.description !== (classroom.description || "") ||
    formData.max_students !== classroom.max_students ||
    formData.enable_assignments !== classroom.enable_assignments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Classroom Settings</h1>
            <p className="text-muted-foreground">
              Configure your classroom preferences and features
            </p>
          </div>
        </div>
        {canManage && (
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </Button>
        )}
      </div>

      {/* Save Status Alert */}
      {saveMessage && (
        <Alert className={saveMessage.includes("success") ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
          <CardDescription>
            Update your classroom's basic details and enrollment settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Classroom Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!canManage}
                placeholder="Enter classroom name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_students">Maximum Students</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  max_students: Math.max(1, Math.min(1000, parseInt(e.target.value) || 30))
                }))}
                disabled={!canManage}
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canManage}
              placeholder="Enter a description for your classroom (optional)"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Join Code</p>
                <p className="text-sm text-muted-foreground">
                  Students use this code to join your classroom
                </p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-lg px-3 py-1">
              {classroom.join_code}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Settings</CardTitle>
          <CardDescription>
            Enable or disable specific features for your classroom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">Assignment System</div>
              <div className="text-sm text-muted-foreground">
                Enable assignment creation and tracking features. When disabled, 
                progress will be based only on linked map completion.
              </div>
            </div>
            <Switch
              checked={formData.enable_assignments}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, enable_assignments: checked }))
              }
              disabled={!canManage}
            />
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Progress Tracking
                </p>
                <p className="text-sm text-blue-700">
                  Student progress is calculated based on completion of linked learning maps. 
                  {formData.enable_assignments 
                    ? " Assignment features provide additional tracking and organization tools."
                    : " With assignments disabled, progress is purely map-based."
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!canManage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to modify these settings. Only classroom instructors can make changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}