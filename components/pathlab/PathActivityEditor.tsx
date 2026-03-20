"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Save, AlertTriangle } from "lucide-react";
import type {
  FullPathActivity,
  CreatePathActivityInput,
  UpdatePathActivityInput,
} from "@/types/pathlab";
import type { AIChatMetadata, NPCChatMetadata } from "@/types/pathlab-content";
import { PathAIChatEditor } from "./PathAIChatEditor";
import { PathNPCChatEditor } from "./PathNPCChatEditor";
import { VideoUpload } from "./VideoUpload";
import { toast } from "sonner";

interface PathActivityEditorProps {
  dayId: string;
  activity?: FullPathActivity;
  onSave: () => Promise<void>; // Just a callback to refresh parent
  onCancel: () => void;
  isInline?: boolean;
  displayOrder?: number;
}

// Unified activity formats - what students actually DO
const ACTIVITY_FORMATS = [
  { value: "video", label: "Watch a Video", needsUrl: true },
  { value: "short_video", label: "Watch a Short Video (< 2 min)", needsUrl: true },
  { value: "canva_slide", label: "View Slides (Canva)", needsUrl: true },
  { value: "text", label: "Read Text/Article", needsBody: true },
  { value: "pdf", label: "Read PDF Document", needsUrl: true },
  { value: "image", label: "View Image", needsUrl: true },
  { value: "resource_link", label: "Visit External Link", needsUrl: true },
  { value: "quiz", label: "Take a Quiz", hasAssessment: true },
  { value: "text_answer", label: "Submit Text Answer", hasAssessment: true },
  { value: "file_upload", label: "Upload a File", hasAssessment: true },
  { value: "image_upload", label: "Upload an Image", hasAssessment: true },
  { value: "checklist", label: "Complete Checklist", hasAssessment: true },
  { value: "daily_reflection", label: "Daily Reflection", hasAssessment: true, needsBody: true },
  { value: "daily_prompt", label: "Respond to Daily Prompt", needsBody: true, hasAssessment: true },
  { value: "ai_chat", label: "AI Chat (with Objective)", isAIChat: true },
  { value: "npc_chat", label: "NPC Conversation (Branching Dialogue)", isNPCChat: true },
];

export function PathActivityEditor({
  dayId,
  activity,
  onSave,
  onCancel,
  isInline = false,
  displayOrder = 0,
}: PathActivityEditorProps) {
  const isEdit = !!activity;

  // Debug logging
  if (activity) {
    console.log('[PathActivityEditor] Editing activity:', {
      id: activity.id,
      title: activity.title,
      path_content: activity.path_content,
      format: activity.path_content?.map(c => c.content_type),
    });
  }

  // Form state
  const [title, setTitle] = useState(activity?.title || "");
  const [instructions, setInstructions] = useState(activity?.instructions || "");
  const [format, setFormat] = useState(() => {
    // Find the actual content type - prefer specific types (ai_chat, npc_chat) over generic
    const npcChat = activity?.path_content?.find(c => c.content_type === 'npc_chat');
    const aiChat = activity?.path_content?.find(c => c.content_type === 'ai_chat');

    return (
      npcChat?.content_type ||
      aiChat?.content_type ||
      activity?.path_content?.[0]?.content_type ||
      activity?.path_assessment?.assessment_type ||
      "text"
    );
  });
  const [contentUrl, setContentUrl] = useState(activity?.path_content?.[0]?.content_url || "");
  const [contentBody, setContentBody] = useState(activity?.path_content?.[0]?.content_body || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    activity?.estimated_minutes?.toString() || ""
  );
  const [isRequired, setIsRequired] = useState(activity?.is_required ?? true);
  const [pointsPossible, setPointsPossible] = useState(
    activity?.path_assessment?.points_possible?.toString() || ""
  );
  const [isGraded, setIsGraded] = useState(activity?.path_assessment?.is_graded || false);
  const [isSaving, setIsSaving] = useState(false);

  // AI Chat state
  const [aiChatMetadata, setAIChatMetadata] = useState<Partial<AIChatMetadata>>(
    activity?.path_content?.find(c => c.content_type === 'ai_chat')?.metadata || {}
  );

  // NPC Chat state
  const [npcChatMetadata, setNPCChatMetadata] = useState<Partial<NPCChatMetadata>>(
    activity?.path_content?.find(c => c.content_type === 'npc_chat')?.metadata || {}
  );
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Video upload state - determine if using URL or upload based on existing content
  const [videoSourceType, setVideoSourceType] = useState<'url' | 'upload'>(() => {
    // If we have an existing URL and it's from our storage, use upload mode
    if (contentUrl && contentUrl.includes('supabase.co/storage')) {
      return 'upload';
    }
    return 'url';
  });

  // Validation
  const selectedFormat = ACTIVITY_FORMATS.find(f => f.value === format);
  const needsUrl = selectedFormat?.needsUrl;
  const needsBody = selectedFormat?.needsBody;
  const hasAssessment = selectedFormat?.hasAssessment;
  const isAIChat = selectedFormat?.isAIChat;
  const isNPCChat = selectedFormat?.isNPCChat;

  // Auto-create conversation when NPC Chat is selected (for new activities only)
  useEffect(() => {
    if (isNPCChat && !isEdit && !npcChatMetadata.conversation_id && !isCreatingConversation) {
      console.log('[Activity Editor] Auto-creating conversation for new NPC Chat activity');
      setIsCreatingConversation(true);
      fetch('/api/admin/npc-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path_day_id: dayId,
          title: title || 'New Conversation',
          description: 'Branching dialogue conversation',
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const { conversation } = await res.json();
            console.log('[Activity Editor] Created conversation:', conversation.id);
            setNPCChatMetadata((prev) => ({
              ...prev,
              conversation_id: conversation.id,
            }));
            toast.success('Conversation created! You can now import your JSON.');
          } else {
            const errorData = await res.json();
            console.error('Failed to create conversation:', errorData);
            toast.error('Failed to create conversation');
          }
        })
        .catch((err) => {
          console.error('Error creating conversation:', err);
          toast.error('Error creating conversation');
        })
        .finally(() => {
          setIsCreatingConversation(false);
        });
    }
  }, [isNPCChat, isEdit, npcChatMetadata.conversation_id, isCreatingConversation, dayId, title]);

  // Basic validation - just need title
  const isValid = title.trim().length > 0;

  // Check if activity is complete (has all required fields)
  const isComplete =
    title.trim().length > 0 &&
    (!needsUrl || contentUrl.trim().length > 0) &&
    (!needsBody || contentBody.trim().length > 0) &&
    (!isAIChat || (aiChatMetadata.system_prompt && aiChatMetadata.objective));
    // Note: NPC chat conversation is auto-created, so we don't check for conversation_id

  // Determine draft reason
  const getDraftReason = (): string | null => {
    if (isComplete) return null;
    if (needsUrl && !contentUrl.trim()) return 'Missing content URL';
    if (needsBody && !contentBody.trim()) return 'Missing content body';
    if (isAIChat && !aiChatMetadata.system_prompt) return 'Missing AI chat system prompt';
    if (isAIChat && !aiChatMetadata.objective) return 'Missing AI chat objective';
    return 'Incomplete configuration';
  };

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      const draftReason = getDraftReason();
      const activityData = {
        title,
        instructions: instructions || undefined,
        // activity_type removed - type is determined by content_type or assessment_type
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
        is_required: isRequired,
        is_draft: !isComplete,
        draft_reason: draftReason,
      };

      let activityId = activity?.id;

      // Step 1: Create or update the activity
      if (isEdit && activityId) {
        // Update existing activity
        const updateResponse = await fetch('/api/pathlab/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityId,
            updates: activityData,
          }),
        });

        if (!updateResponse.ok) throw new Error('Failed to update activity');
      } else {
        // Create new activity
        const createResponse = await fetch('/api/pathlab/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...activityData,
            path_day_id: dayId,
            display_order: displayOrder,
          }),
        });

        if (!createResponse.ok) throw new Error('Failed to create activity');

        const { activity: newActivity } = await createResponse.json();
        activityId = newActivity.id;
      }

      // Step 1.5: Auto-create NPC conversation if needed
      if (isNPCChat && activityId && !npcChatMetadata.conversation_id) {
        const conversationResponse = await fetch('/api/admin/npc-conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path_day_id: dayId,
            title: title || 'Untitled Conversation',
            description: `Conversation for activity: ${title}`,
          }),
        });

        if (conversationResponse.ok) {
          const { conversation } = await conversationResponse.json();
          // Update metadata with new conversation_id
          const updatedMetadata = {
            ...npcChatMetadata,
            conversation_id: conversation.id,
          };
          setNPCChatMetadata(updatedMetadata);
          // Update the local variable for immediate use
          Object.assign(npcChatMetadata, updatedMetadata);
        } else {
          const errorData = await conversationResponse.json();
          console.error('Failed to create conversation:', errorData);
          toast.error('Failed to create conversation. Please try again.');
        }
      }

      // Step 2: Save content or assessment based on format
      // Only create content/assessment if activity is complete OR if editing and had content before
      if (activityId && (isComplete || isEdit)) {
        // If editing, delete old content/assessment first to avoid conflicts
        if (isEdit) {
          // Delete old content items
          if (activity?.path_content && activity.path_content.length > 0) {
            for (const content of activity.path_content) {
              await fetch(`/api/pathlab/content?contentId=${content.id}`, {
                method: 'DELETE',
              });
            }
          }

          // Delete old assessment if exists
          if (activity?.path_assessment) {
            await fetch(`/api/pathlab/assessments?assessmentId=${activity.path_assessment.id}`, {
              method: 'DELETE',
            });
          }
        }

        // Only create content/assessment if we have complete data
        if (isComplete) {
          if (hasAssessment) {
            // Create assessment
            const assessmentResponse = await fetch('/api/pathlab/assessments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activity_id: activityId,
                assessment_type: format,
                points_possible: pointsPossible ? parseInt(pointsPossible) : null,
                is_graded: isGraded,
                metadata: {},
              }),
            });

            if (!assessmentResponse.ok) {
              const errorData = await assessmentResponse.json();
              console.error('Failed to save assessment:', errorData);
              throw new Error('Failed to save assessment');
            }
          } else {
            // Create content
            let contentMetadata = {};
            if (isAIChat) {
              contentMetadata = aiChatMetadata;
            } else if (isNPCChat) {
              contentMetadata = npcChatMetadata;
              console.log('[Activity Editor] Saving NPC Chat with metadata:', contentMetadata);
            }

            const contentResponse = await fetch('/api/pathlab/content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activity_id: activityId,
                content_type: format,
                content_title: null,
                content_url: needsUrl ? contentUrl : null,
                content_body: needsBody ? contentBody : null,
                display_order: 0,
                metadata: contentMetadata,
              }),
            });

            if (!contentResponse.ok) {
              const errorData = await contentResponse.json();
              console.error('Failed to save content:', errorData);
              throw new Error('Failed to save content');
            }
          }
        }
      }

      // Notify parent to refresh
      await onSave();

      // Show appropriate success message
      if (isComplete) {
        toast.success(isEdit ? 'Activity updated!' : 'Activity created!');
      } else {
        toast.success(
          isEdit ? 'Draft saved! Complete missing fields to publish.' : 'Activity saved as draft!',
          { description: getDraftReason() || undefined }
        );
      }

    } catch (error: any) {
      console.error("Error saving activity:", error);
      toast.error(error?.message || 'Failed to save activity');
    } finally {
      setIsSaving(false);
    }
  };

  const editorContent = (
    <div className="space-y-4">
      {/* Activity Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Activity Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Introduction to Constitutional Law"
          className="bg-background"
        />
      </div>

      {/* What students do - Format Selection */}
      <div className="space-y-2">
        <Label htmlFor="format">What will students do? *</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_FORMATS.map((fmt) => (
              <SelectItem key={fmt.value} value={fmt.value}>
                {fmt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* URL/Upload Field - for videos, slides, PDFs, images, external links */}
      {needsUrl && (
        <div className="space-y-2">
          {/* Video formats get tabs for URL vs Upload */}
          {(format === 'video' || format === 'short_video') ? (
            <div className="space-y-3">
              <Label>
                {format === 'video' ? 'Video Source *' : 'Short Video Source *'}
              </Label>
              <Tabs value={videoSourceType} onValueChange={(v) => setVideoSourceType(v as 'url' | 'upload')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">YouTube/External URL</TabsTrigger>
                  <TabsTrigger value="upload">Upload Video File</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-2 mt-3">
                  <Label htmlFor="contentUrl">
                    {format === 'video' ? 'Video URL (YouTube, Vimeo, etc.)' : 'Short Video URL (YouTube Shorts, TikTok, etc.)'}
                  </Label>
                  <Input
                    id="contentUrl"
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="bg-background"
                  />
                  {format === 'short_video' && (
                    <p className="text-xs text-muted-foreground">
                      Best for videos under 2 minutes. Supports YouTube Shorts, TikTok, Instagram Reels, etc.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="upload" className="mt-3">
                  <VideoUpload
                    onUploadComplete={(url) => setContentUrl(url)}
                    initialUrl={contentUrl}
                    maxSizeMB={format === 'short_video' ? 50 : 50} // 50MB for both (free tier limit)
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            /* Non-video formats use simple URL input */
            <>
              <Label htmlFor="contentUrl">
                {format === 'canva_slide' && 'Canva Slide URL *'}
                {format === 'pdf' && 'PDF URL *'}
                {format === 'image' && 'Image URL *'}
                {format === 'resource_link' && 'Link URL *'}
              </Label>
              <Input
                id="contentUrl"
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://..."
                className="bg-background"
              />
            </>
          )}
        </div>
      )}

      {/* AI Chat Configuration */}
      {isAIChat && (
        <div className="space-y-2">
          <PathAIChatEditor
            metadata={aiChatMetadata}
            onChange={setAIChatMetadata}
          />
        </div>
      )}

      {/* NPC Chat Configuration */}
      {isNPCChat && (
        <div className="space-y-2">
          <PathNPCChatEditor
            metadata={npcChatMetadata}
            onChange={setNPCChatMetadata}
            activityTitle={title}
          />
        </div>
      )}

      {/* Body Field - for text content, prompts, reflections */}
      {needsBody && (
        <div className="space-y-2">
          <Label htmlFor="contentBody">
            {format === 'text' && 'Text Content (Markdown supported) *'}
            {format === 'daily_reflection' && 'Reflection Prompt *'}
            {format === 'daily_prompt' && 'Daily Prompt *'}
          </Label>
          <Textarea
            id="contentBody"
            value={contentBody}
            onChange={(e) => setContentBody(e.target.value)}
            placeholder={
              format === 'text'
                ? "Enter your text content here. Markdown is supported for formatting."
                : "What should students reflect on or respond to?"
            }
            rows={8}
            className="bg-background resize-none font-mono text-sm"
          />
        </div>
      )}

      {/* Instructions - always shown */}
      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Additional instructions or context for students..."
          rows={3}
          className="bg-background resize-none"
        />
      </div>

      {/* Assessment Settings - show if format has assessment */}
      {hasAssessment && (
        <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/50 space-y-3">
          <Label className="text-base font-semibold text-blue-300">Assessment Settings</Label>

          <div className="space-y-2">
            <Label htmlFor="pointsPossible">Points Possible (optional)</Label>
            <Input
              id="pointsPossible"
              type="number"
              min="0"
              value={pointsPossible}
              onChange={(e) => setPointsPossible(e.target.value)}
              placeholder="e.g., 100"
              className="bg-background"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isGraded"
              checked={isGraded}
              onCheckedChange={(checked) => setIsGraded(!!checked)}
            />
            <Label htmlFor="isGraded" className="cursor-pointer text-blue-200">
              This assessment is graded
            </Label>
          </div>

          {format === 'quiz' && (
            <p className="text-xs text-blue-300/70">
              Note: Quiz questions can be added after creating the activity
            </p>
          )}
        </div>
      )}

      {/* Time and Requirements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
          <Input
            id="estimatedMinutes"
            type="number"
            min="0"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="e.g., 30"
            className="bg-background"
          />
        </div>

        <div className="flex items-center space-x-2 pt-7">
          <Checkbox
            id="isRequired"
            checked={isRequired}
            onCheckedChange={(checked) => setIsRequired(!!checked)}
          />
          <Label htmlFor="isRequired" className="cursor-pointer">
            Required activity
          </Label>
        </div>
      </div>

      {/* Draft Warning */}
      {!isComplete && (
        <div className="p-4 rounded-lg bg-yellow-950/30 border border-yellow-800/50 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-300">
                Activity Incomplete (Draft Mode)
              </p>
              <p className="text-sm text-yellow-200/80 mt-1">
                {getDraftReason()}
              </p>
              <p className="text-xs text-yellow-200/60 mt-2">
                Students will not be able to access this activity until all required fields are completed.
                You can save this as a draft and finish it later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : isEdit ? (isComplete ? "Update Activity" : "Save Draft") : (isComplete ? "Create Activity" : "Save as Draft")}
        </Button>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            {isEdit ? "Edit Activity" : "New Activity"}
          </CardTitle>
          {/* Sticky action buttons at top */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isSaving} size="sm">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isSaving} size="sm">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : isEdit ? (isComplete ? "Update" : "Save Draft") : (isComplete ? "Create" : "Save Draft")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto">
          {editorContent}
        </CardContent>
      </Card>
    );
  }

  return <div className="space-y-4">{editorContent}</div>;
}
