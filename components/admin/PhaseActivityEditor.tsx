"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Plus,
  Trash2,
  Edit3,
  Eye,
  MessageSquare,
  FileText,
  CheckCircle2,
  X,
  Send,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface ChatMessage {
  sender: string;
  avatar: string;
  type: "text" | "image" | "video";
  content: string;
  caption?: string;
}

interface ChatComicData {
  messages: ChatMessage[];
}

interface ContentItem {
  id: string;
  activity_id: string;
  content_type: string;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Assessment {
  id: string;
  activity_id: string;
  assessment_type: string;
  points_possible: number | null;
  is_graded: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  phase_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  hackathon_phase_activity_content: ContentItem[];
  hackathon_phase_activity_assessments: Assessment[];
}

interface Phase {
  id: string;
  title: string;
  description: string | null;
  phase_number: number;
  hackathon_phase_activities: Activity[];
}

interface MessageEditorData {
  sender: string;
  avatar: string;
  type: "text" | "image" | "video";
  content: string;
  caption: string;
}

const SENDER_OPTIONS = [
  { label: "P'Seed (Mentor)", value: "P'Seed", avatar: "👨‍🏫" },
  { label: "น้ำอ้อย (Student)", value: "น้ำอ้อย", avatar: "👩‍💻" },
  { label: "นัท (Student)", value: "นัท", avatar: "🧑‍💻" },
  { label: "ทีม Alpha", value: "ทีม Alpha", avatar: "🧑‍💻" },
  { label: "ทีม Beta", value: "ทีม Beta", avatar: "👩‍💻" },
];

export function PhaseActivityEditor() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // Activity form state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityInstructions, setActivityInstructions] = useState("");
  const [activityMinutes, setActivityMinutes] = useState("");
  const [activityRequired, setActivityRequired] = useState(true);
  const [activityDraft, setActivityDraft] = useState(false);

  // Content state
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // Chat comic editing
  const [chatComicDialogOpen, setChatComicDialogOpen] = useState(false);
  const [chatComicData, setChatComicData] = useState<ChatComicData>({ messages: [] });
  const [messageEditorOpen, setMessageEditorOpen] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [messageEditorData, setMessageEditorData] = useState<MessageEditorData>({
    sender: "P'Seed",
    avatar: "👨‍🏫",
    type: "text",
    content: "",
    caption: "",
  });

  // Assessment state
  const [assessmentType, setAssessmentType] = useState("text_answer");
  const [assessmentPoints, setAssessmentPoints] = useState("");
  const [assessmentGraded, setAssessmentGraded] = useState(false);
  const [assessmentMinWords, setAssessmentMinWords] = useState("");

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  // Save notification
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/hackathon/activities/editor");
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch data:", data.error);
        return;
      }

      setPhases(data.phases ?? []);

      // Auto-expand first phase
      if (data.phases?.length > 0) {
        setExpandedPhases(new Set([data.phases[0].id]));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  const selectedActivity = React.useMemo(() => {
    if (!selectedActivityId) return null;
    for (const phase of phases) {
      const activity = phase.hackathon_phase_activities.find(
        (a) => a.id === selectedActivityId
      );
      if (activity) return activity;
    }
    return null;
  }, [phases, selectedActivityId]);

  useEffect(() => {
    if (selectedActivity) {
      setActivityTitle(selectedActivity.title);
      setActivityInstructions(selectedActivity.instructions ?? "");
      setActivityMinutes(selectedActivity.estimated_minutes?.toString() ?? "");
      setActivityRequired(selectedActivity.is_required);
      setActivityDraft(selectedActivity.is_draft);
      setContents(selectedActivity.hackathon_phase_activity_content ?? []);

      const assessment = selectedActivity.hackathon_phase_activity_assessments?.[0];
      if (assessment) {
        setAssessmentType(assessment.assessment_type);
        setAssessmentPoints(assessment.points_possible?.toString() ?? "");
        setAssessmentGraded(assessment.is_graded ?? false);
        setAssessmentMinWords(
          (assessment.metadata as Record<string, unknown>)?.min_words?.toString() ?? ""
        );
      } else {
        setAssessmentType("text_answer");
        setAssessmentPoints("");
        setAssessmentGraded(false);
        setAssessmentMinWords("");
      }
    }
  }, [selectedActivity]);

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }

  async function saveActivity() {
    if (!selectedActivityId) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/activities/editor/${selectedActivityId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: activityTitle,
            instructions: activityInstructions,
            estimated_minutes: activityMinutes ? parseInt(activityMinutes) : null,
            is_required: activityRequired,
            is_draft: activityDraft,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage(`Error: ${data.error}`);
        return;
      }

      // Update local state
      setPhases((prevPhases) =>
        prevPhases.map((phase) => ({
          ...phase,
          hackathon_phase_activities: phase.hackathon_phase_activities.map((act) =>
            act.id === selectedActivityId
              ? { ...act, title: activityTitle, instructions: activityInstructions }
              : act
          ),
        }))
      );

      setSaveMessage("Activity saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save activity");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssessment() {
    if (!selectedActivityId) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const metadata: Record<string, unknown> = {};
      if (assessmentMinWords) {
        metadata.min_words = parseInt(assessmentMinWords);
      }

      const response = await fetch(
        `/api/admin/hackathon/activities/editor/${selectedActivityId}/assessment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessment_type: assessmentType,
            points_possible: assessmentPoints ? parseInt(assessmentPoints) : null,
            is_graded: assessmentGraded,
            metadata,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage(`Error: ${data.error}`);
        return;
      }

      setSaveMessage("Assessment saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  }

  function openChatComicEditor(content: ContentItem) {
    setSelectedContentId(content.id);
    if (content.content_body) {
      try {
        setChatComicData(JSON.parse(content.content_body));
      } catch {
        setChatComicData({ messages: [] });
      }
    } else {
      setChatComicData({ messages: [] });
    }
    setChatComicDialogOpen(true);
  }

  function createChatComicContent() {
    if (!selectedActivityId) return;

    setSaving(true);
    setSaveMessage("");

    const newContent: ContentItem = {
      id: `temp-${Date.now()}`,
      activity_id: selectedActivityId,
      content_type: "chat_comic",
      content_title: "Chat Comic",
      content_url: null,
      content_body: JSON.stringify({ messages: [] }),
      display_order: contents.length + 1,
      metadata: {
        chat_style: "whatsapp",
        click_to_reveal: true,
        show_typing_indicator: true,
      },
      created_at: new Date().toISOString(),
    };

    fetch(`/api/admin/hackathon/activities/editor/${selectedActivityId}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: "chat_comic",
        content_title: "Chat Comic",
        content_body: JSON.stringify({ messages: [] }),
        display_order: contents.length + 1,
        metadata: {
          chat_style: "whatsapp",
          click_to_reveal: true,
          show_typing_indicator: true,
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContents((prev) => [...prev, data.content]);
          openChatComicEditor(data.content);
        }
      })
      .catch(() => setSaveMessage("Failed to create content"))
      .finally(() => setSaving(false));
  }

  async function saveChatComic() {
    if (!selectedContentId) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(
        `/api/admin/hackathon/activities/editor/${selectedActivityId}/content/${selectedContentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_body: JSON.stringify(chatComicData),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setSaveMessage(`Error: ${data.error}`);
        return;
      }

      setChatComicDialogOpen(false);
      setSaveMessage("Chat comic saved!");
      setTimeout(() => setSaveMessage(""), 3000);

      // Refresh data
      void fetchData();
    } catch (error) {
      setSaveMessage("Failed to save chat comic");
    } finally {
      setSaving(false);
    }
  }

  function openMessageEditor(index: number | null) {
    if (index !== null) {
      const msg = chatComicData.messages[index];
      setMessageEditorData({
        sender: msg.sender,
        avatar: msg.avatar,
        type: msg.type,
        content: msg.content,
        caption: msg.caption ?? "",
      });
    } else {
      setMessageEditorData({
        sender: "P'Seed",
        avatar: "👨‍🏫",
        type: "text",
        content: "",
        caption: "",
      });
    }
    setEditingMessageIndex(index);
    setMessageEditorOpen(true);
  }

  function saveMessageEdit() {
    const newMessage: ChatMessage = {
      sender: messageEditorData.sender,
      avatar: messageEditorData.avatar,
      type: messageEditorData.type,
      content: messageEditorData.content,
      caption: messageEditorData.caption || undefined,
    };

    if (editingMessageIndex !== null) {
      const newMessages = [...chatComicData.messages];
      newMessages[editingMessageIndex] = newMessage;
      setChatComicData({ messages: newMessages });
    } else {
      setChatComicData((prev) => ({
        messages: [...prev.messages, newMessage],
      }));
    }

    setMessageEditorOpen(false);
  }

  function deleteMessage(index: number) {
    const newMessages = chatComicData.messages.filter((_, i) => i !== index);
    setChatComicData({ messages: newMessages });
  }

  async function deleteContent(contentId: string) {
    if (!selectedActivityId) return;
    if (!confirm("Delete this content item?")) return;

    try {
      const response = await fetch(
        `/api/admin/hackathon/activities/editor/${selectedActivityId}/content/${contentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setContents((prev) => prev.filter((c) => c.id !== contentId));
        setSaveMessage("Content deleted");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (error) {
      setSaveMessage("Failed to delete content");
    }
  }

  function openPreview(content: ContentItem) {
    setSelectedContentId(content.id);
    if (content.content_body) {
      try {
        setChatComicData(JSON.parse(content.content_body));
      } catch {
        setChatComicData({ messages: [] });
      }
    }
    setRevealedCount(1);
    setPreviewOpen(true);
  }

  function revealNextMessage() {
    if (revealedCount < chatComicData.messages.length) {
      setTimeout(() => {
        setRevealedCount((prev) => Math.min(prev + 1, chatComicData.messages.length));
      }, 500);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Phase Activity Editor</h2>
          <p className="text-sm text-muted-foreground">
            Edit hackathon phase activities and chat comic content
          </p>
        </div>
        {saveMessage && (
          <Badge
            variant="outline"
            className={
              saveMessage.startsWith("Error") || saveMessage.startsWith("Failed")
                ? "border-rose-500/50 text-rose-200"
                : "border-emerald-500/50 text-emerald-200"
            }
          >
            {saveMessage}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Activity List Sidebar */}
        <Card className="border-slate-700/50 bg-slate-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {phases.map((phase) => {
              const isExpanded = expandedPhases.has(phase.id);
              return (
                <div key={phase.id} className="space-y-1">
                  <button
                    onClick={() => togglePhase(phase.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-slate-800/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span>
                      P{phase.phase_number}. {phase.title}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {phase.hackathon_phase_activities.map((activity) => (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivityId(activity.id)}
                          className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            selectedActivityId === activity.id
                              ? "bg-blue-500/20 text-blue-200"
                              : "hover:bg-slate-800/50 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{activity.display_order}.</span>
                            <span className="truncate">{activity.title}</span>
                            {activity.is_draft && (
                              <Badge
                                variant="outline"
                                className="ml-auto border-slate-600 text-[10px] h-4 px-1"
                              >
                                Draft
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Editor Panel */}
        <div className="space-y-4">
          {!selectedActivity ? (
            <Card className="border-slate-700/50 bg-slate-900/50">
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-slate-500">Select an activity to edit</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Activity Form */}
              <Card className="border-slate-700/50 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-300" />
                    Activity Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={activityTitle}
                        onChange={(e) => setActivityTitle(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minutes">Estimated Minutes</Label>
                      <Input
                        id="minutes"
                        type="number"
                        value={activityMinutes}
                        onChange={(e) => setActivityMinutes(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={activityInstructions}
                      onChange={(e) => setActivityInstructions(e.target.value)}
                      rows={3}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="required"
                        checked={activityRequired}
                        onCheckedChange={setActivityRequired}
                      />
                      <Label htmlFor="required">Required</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="draft"
                        checked={activityDraft}
                        onCheckedChange={setActivityDraft}
                      />
                      <Label htmlFor="draft">Draft</Label>
                    </div>
                    <Button
                      onClick={saveActivity}
                      disabled={saving}
                      size="sm"
                      className="ml-auto"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Chat Comic Content */}
              <Card className="border-slate-700/50 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-emerald-300" />
                    Chat Comic Content
                  </CardTitle>
                  <CardDescription>
                    Manage WhatsApp-style chat content for this activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contents.filter((c) => c.content_type === "chat_comic").length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 mb-4">No chat comic content yet</p>
                      <Button onClick={createChatComicContent} disabled={saving}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Chat Comic
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contents
                        .filter((c) => c.content_type === "chat_comic")
                        .map((content) => {
                          let messageCount = 0;
                          try {
                            if (content.content_body) {
                              const parsed = JSON.parse(content.content_body);
                              messageCount = parsed.messages?.length ?? 0;
                            }
                          } catch {}

                          return (
                            <div
                              key={content.id}
                              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-950/50 p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  {content.content_title ?? "Chat Comic"}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {messageCount} messages
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openPreview(content)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openChatComicEditor(content)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteContent(content.id)}
                                  className="text-rose-400 hover:text-rose-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      <Button onClick={createChatComicContent} disabled={saving} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Chat Comic
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assessment */}
              <Card className="border-slate-700/50 bg-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-amber-300" />
                    Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={assessmentType}
                        onValueChange={setAssessmentType}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text_answer">Text Answer</SelectItem>
                          <SelectItem value="file_upload">File Upload</SelectItem>
                          <SelectItem value="image_upload">Image Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        value={assessmentPoints}
                        onChange={(e) => setAssessmentPoints(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Words</Label>
                      <Input
                        type="number"
                        value={assessmentMinWords}
                        onChange={(e) => setAssessmentMinWords(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                        placeholder="For text_answer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="graded"
                        checked={assessmentGraded}
                        onCheckedChange={setAssessmentGraded}
                      />
                      <Label htmlFor="graded">Graded</Label>
                    </div>
                    <Button onClick={saveAssessment} disabled={saving} size="sm">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Assessment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Chat Comic Editor Dialog */}
      <Dialog open={chatComicDialogOpen} onOpenChange={setChatComicDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chat Comic</DialogTitle>
            <DialogDescription>
              Add, edit, or remove messages from this chat comic
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                {chatComicData.messages.length} messages
              </p>
              <Button size="sm" onClick={() => openMessageEditor(null)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Message
              </Button>
            </div>

            <div className="space-y-2">
              {chatComicData.messages.map((msg, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/50 p-3"
                >
                  <span className="text-2xl">{msg.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{msg.sender}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {msg.type === "text"
                        ? msg.content
                        : `${msg.type}: ${msg.content}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openMessageEditor(index)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMessage(index)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {chatComicData.messages.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No messages yet. Click "Add Message" to start.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
              <Button variant="outline" onClick={() => setChatComicDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveChatComic} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save Chat Comic
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Editor Dialog */}
      <Dialog open={messageEditorOpen} onOpenChange={setMessageEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMessageIndex !== null ? "Edit Message" : "Add Message"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sender</Label>
                <Select
                  value={messageEditorData.sender}
                  onValueChange={(val) => {
                    const option = SENDER_OPTIONS.find((o) => o.value === val);
                    setMessageEditorData({
                      ...messageEditorData,
                      sender: val,
                      avatar: option?.avatar ?? "👨‍🏫",
                    });
                  }}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.avatar} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={messageEditorData.type}
                  onValueChange={(val) =>
                    setMessageEditorData({
                      ...messageEditorData,
                      type: val as "text" | "image" | "video",
                    })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Text
                      </span>
                    </SelectItem>
                    <SelectItem value="image">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Image
                      </span>
                    </SelectItem>
                    <SelectItem value="video">
                      <span className="flex items-center gap-2">
                        <Video className="h-4 w-4" /> Video
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {messageEditorData.type === "text" ? "Message Content" : "URL"}
              </Label>
              {messageEditorData.type === "text" ? (
                <Textarea
                  value={messageEditorData.content}
                  onChange={(e) =>
                    setMessageEditorData({ ...messageEditorData, content: e.target.value })
                  }
                  rows={3}
                  className="bg-slate-950 border-slate-700"
                />
              ) : (
                <Input
                  value={messageEditorData.content}
                  onChange={(e) =>
                    setMessageEditorData({ ...messageEditorData, content: e.target.value })
                  }
                  placeholder={
                    messageEditorData.type === "image"
                      ? "https://storage.example.com/image.png"
                      : "https://storage.example.com/video.mp4"
                  }
                  className="bg-slate-950 border-slate-700"
                />
              )}
            </div>

            {(messageEditorData.type === "image" || messageEditorData.type === "video") && (
              <div className="space-y-2">
                <Label>Caption (optional)</Label>
                <Input
                  value={messageEditorData.caption}
                  onChange={(e) =>
                    setMessageEditorData({ ...messageEditorData, caption: e.target.value })
                  }
                  className="bg-slate-950 border-slate-700"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setMessageEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveMessageEdit}>
                <Send className="h-4 w-4 mr-1" />
                {editingMessageIndex !== null ? "Update" : "Add"} Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat Comic Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {chatComicData.messages.slice(0, revealedCount).map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${
                  msg.sender === "P'Seed" ? "" : "flex-row-reverse"
                }`}
              >
                <div className="text-2xl">{msg.avatar}</div>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === "P'Seed"
                      ? "bg-slate-700 text-slate-100"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {msg.type === "text" ? (
                    <p>{msg.content}</p>
                  ) : msg.type === "image" ? (
                    <div>
                      <img
                        src={msg.content}
                        alt={msg.caption ?? ""}
                        className="rounded max-h-48 object-cover"
                      />
                      {msg.caption && (
                        <p className="text-xs mt-1 opacity-80">{msg.caption}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <video
                        src={msg.content}
                        className="rounded max-h-48"
                        controls
                      />
                      {msg.caption && (
                        <p className="text-xs mt-1 opacity-80">{msg.caption}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {revealedCount < chatComicData.messages.length && (
              <button
                onClick={revealNextMessage}
                className="w-full py-2 text-center text-sm text-slate-400 hover:text-slate-300 border border-dashed border-slate-700 rounded-lg"
              >
                Tap to reveal next message
              </button>
            )}

            {revealedCount >= chatComicData.messages.length &&
              chatComicData.messages.length > 0 && (
                <p className="text-center text-sm text-slate-500 py-2">
                  End of chat
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
