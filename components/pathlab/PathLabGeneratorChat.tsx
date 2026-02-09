"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2, Sparkles, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PathLabGeneratorDraftInput } from "@/lib/ai/pathlab-generator-schema";
import type { PathLabQualityResult } from "@/types/pathlab-generator";
import type { ConversationParams } from "@/lib/pathlab/conversation-flow";
import { buildGreetingMessage } from "@/lib/ai/pathlab-chat-prompts";
import { DraftPreviewPanel } from "./DraftPreviewPanel";
import { ValidationErrorDisplay } from "./ValidationErrorDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PathLabGeneratorChatProps {
  onGenerationComplete: (draft: PathLabGeneratorDraftInput, params: ConversationParams) => void;
  onClose: () => void;
}

export function PathLabGeneratorChat({
  onGenerationComplete,
  onClose,
}: PathLabGeneratorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [accumulatedParams, setAccumulatedParams] = useState<ConversationParams>({});
  const [generatedDraft, setGeneratedDraft] = useState<PathLabGeneratorDraftInput | null>(
    null,
  );
  const [validationResult, setValidationResult] = useState<PathLabQualityResult | null>(
    null,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Start conversation on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const greeting = buildGreetingMessage();
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping || isGenerating) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Call chat API
      const response = await fetch("/api/pathlab/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: content,
          generationParams: accumulatedParams,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      console.log("💬 Chat API response:", data);

      // Update accumulated params
      setAccumulatedParams(data.updatedParams);
      console.log("📋 Updated accumulated params:", data.updatedParams);

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check if ready to generate
      if (data.readyToGenerate) {
        console.log("✅ AI signaled ready to generate!");

        // Double-check we actually have all required params
        if (!data.allParamsComplete) {
          console.warn("⚠️ AI said ready but params incomplete. Missing:", data.missingParams);

          // Send a message back to AI to collect missing params
          const clarificationMessage: Message = {
            id: `clarification-${Date.now()}`,
            role: "assistant",
            content: `Wait, I still need some information:\n\n${data.missingParams.map((p: string) => `- ${p}`).join("\n")}\n\nLet me ask you about these before we generate.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, clarificationMessage]);
        } else {
          await handleGeneration(data.updatedParams);
        }
      } else {
        console.log("⏳ Not ready yet. Missing:", data.missingParams);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error("Failed to process message");
    } finally {
      setIsTyping(false);
    }
  };

  const handleGeneration = async (params: ConversationParams) => {
    setIsGenerating(true);

    try {
      console.log("🚀 Calling preview API with params:", params);

      // Validate we have all required params before calling API
      if (!params.topic || !params.audience || !params.difficulty || !params.totalDays || !params.tone) {
        const missing = [];
        if (!params.topic) missing.push("topic");
        if (!params.audience) missing.push("audience");
        if (!params.difficulty) missing.push("difficulty");
        if (!params.totalDays) missing.push("totalDays");
        if (!params.tone) missing.push("tone");
        throw new Error(`Missing required parameters: ${missing.join(", ")}`);
      }

      // Call preview API to generate draft
      const response = await fetch("/api/pathlab/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Preview API error:", errorData);
        throw new Error(errorData.error || `Generation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Preview API response:", data);

      setGeneratedDraft(data.draft);
      setValidationResult(data.validation);

      // Add status message
      const statusMessage: Message = {
        id: `status-${Date.now()}`,
        role: "assistant",
        content: data.validation.valid
          ? `✅ **Draft generated successfully!**\n\nI've created a ${data.stats.dayCount}-day pathLab with ${data.stats.nodeCount} nodes and ${data.stats.assessmentCount} assessments.\n\n**👆 Check the Preview and Validation tabs above** to review the draft, then click "Accept Draft" below if it looks good!`
          : `⚠️ **Draft generated with ${data.validation.errors.length} validation error(s).**\n\n**👆 Check the Validation tab above** to see what needs to be fixed.\n\nWould you like me to try again with the same parameters, or would you like to change something?`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, statusMessage]);
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate pathLab");

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          `I'm sorry, I encountered an error while generating the pathLab:\n\n**Error:** ${error.message}\n\nWould you like to try again? You can tell me what to change, or I can try generating with the same parameters.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptDraft = () => {
    if (generatedDraft && validationResult?.valid) {
      onGenerationComplete(generatedDraft, accumulatedParams);
    }
  };

  const handleRejectDraft = () => {
    setGeneratedDraft(null);
    setValidationResult(null);

    const rejectMessage: Message = {
      id: `reject-${Date.now()}`,
      role: "assistant",
      content:
        "No problem! Let me know what you'd like to change and I'll help you generate a better draft.",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, rejectMessage]);
  };

  const handleReset = () => {
    if (confirm("Reset conversation? This will clear all progress.")) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: buildGreetingMessage(),
          timestamp: new Date(),
        },
      ]);
      setAccumulatedParams({});
      setGeneratedDraft(null);
      setValidationResult(null);
    }
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">PathLab AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area - Shows chat or preview */}
      {generatedDraft && validationResult ? (
        /* Preview Mode */
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="preview" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="validation">
                Validation
                {validationResult.errors.length > 0 && (
                  <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                    {validationResult.errors.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-auto m-0 p-4">
              <DraftPreviewPanel draft={generatedDraft} />
            </TabsContent>

            <TabsContent value="validation" className="flex-1 overflow-auto m-0 p-4">
              <ValidationErrorDisplay validation={validationResult} />
              {validationResult.valid && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <div className="font-medium">No validation errors!</div>
                  </div>
                  <p className="mt-1 text-sm">
                    Your pathLab draft looks great and is ready to be created.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-auto m-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>

                      {message.role === "user" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Chat Mode */
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Generating pathLab draft...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Accept/Reject Draft Buttons */}
      {generatedDraft && validationResult && (
        <div className="border-t px-4 py-3">
          {validationResult.valid ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleAcceptDraft}>
                Accept Draft
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleRejectDraft}>
                Reject & Revise
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={handleRejectDraft}>
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Quick Action Buttons */}
      {!isTyping && !isGenerating && (
        <div className="border-t px-4 py-2 bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {!accumulatedParams.difficulty && (
              <>
                <span className="text-xs text-muted-foreground self-center">
                  Difficulty:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("beginner")}
                  className="h-7 text-xs"
                >
                  Beginner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("intermediate")}
                  className="h-7 text-xs"
                >
                  Intermediate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("advanced")}
                  className="h-7 text-xs"
                >
                  Advanced
                </Button>
              </>
            )}
            {!accumulatedParams.totalDays && accumulatedParams.difficulty && (
              <>
                <span className="text-xs text-muted-foreground self-center">Days:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("5 days")}
                  className="h-7 text-xs"
                >
                  5 days
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("7 days")}
                  className="h-7 text-xs"
                >
                  7 days
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendMessage("10 days")}
                  className="h-7 text-xs"
                >
                  10 days
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            disabled={isTyping || isGenerating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isTyping || isGenerating}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
