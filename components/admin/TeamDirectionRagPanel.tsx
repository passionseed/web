"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";

interface RagMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { team_name: string; relevance: string }[];
  followUpQuestions?: string[];
}

export function TeamDirectionRagPanel() {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage: RagMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/hackathon/team-directions/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer,
        citations: data.citedTeams,
        followUpQuestions: data.followUpQuestions,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process that question. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-[500px] overflow-y-auto space-y-4 border rounded-lg p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Ask anything about the teams...<br />
            <span className="text-xs">e.g., "Which teams are working on climate?" or "Find teams using AI for education"</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <Card key={i} className={`p-3 ${msg.role === "user" ? "ml-8 bg-primary/5" : "mr-8"}`}>
            <p className="text-sm">{msg.content}</p>
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                <span className="font-medium">Sources:</span>{" "}
                {msg.citations.map((c) => `${c.team_name} (${c.relevance})`).join(", ")}
              </div>
            )}
            {msg.followUpQuestions && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.followUpQuestions.map((q, qi) => (
                  <button
                    key={qi}
                    onClick={() => setInput(q)}
                    className="text-xs text-primary hover:underline"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ask about teams..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
        />
        <Button onClick={handleSubmit} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
