"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { GoogleGenAI } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, AlertCircle, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { log } from "console";
import { User } from "@supabase/supabase-js";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function ReflectionPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [keyTouched, setKeyTouched] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [user, setUser] = useState<User>();
  const [interests, setInterests] = useState<string[]>([]);
  // get user from supabase

  useEffect(() => {
    async function fetchUserAndInterests() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        console.log(user, "user");

        if (user) {
          setUser(user);
          // Fetch existing profile data to pre-fill the form
          loadReflectionHistory(user);

          const { data: userInterests, error: interestsError } = await supabase
            .from("interests")
            .select("interest")
            .eq("user_id", user.id);

          if (interestsError) throw interestsError;

          if (userInterests) {
            setInterests(userInterests.map((item) => item.interest));
          }
        } else {
          // Redirect to login if no user is found, or handle appropriately
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user or interests:", error);
        // Handle error, maybe redirect to an error page or show a toast
      }
    }

    fetchUserAndInterests();
  }, []);

  // Gemini client is created only if key is present
  const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

  const config = {
    responseMimeType: "text/plain",
    systemInstruction: [
      {
        text: `
**Passion Reflection AI System Protocol v2.0**  
*"Cultivating Growth Through Structured Curiosity"*

**Primary Objective**  
Facilitate deep self-discovery by collaboratively building and refining a dynamic Passion Tree through natural, focused dialogue. Prioritize meaningful progression over data completeness.

**Core Principles**  
1. **Progressive Disclosure**  
   - Address 1-2 high-impact areas per interaction  
   - Focus on growth and self-discovery

2. **Socratic Engagement**  
   - Use the "5 Whys" framework for motivation exploration  
   - Employ growth-focused phrasing

3. **Conversational Pathways**  
   - Challenge reframing for frustrations
   - Value rediscovery for low engagement
   - Skill scaffolding for stagnant mastery
   - Cross-pollination for emerging connections

**User Interests:** ${interests.join(", ") || "No interests provided."}

**Response Guidelines**
- Keep responses concise but meaningful
- Use a warm, encouraging tone
- Ask follow-up questions to deepen understanding
- Acknowledge emotions and validate experiences
- Suggest actionable next steps when appropriate
`,
      },
    ],
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadReflectionHistory = async (user: User) => {
    try {
      const { data: reflections, error } = await supabase
        .from("reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      console.log(reflections, "reflectionss");

      if (error) throw error;

      if (reflections) {
        const formattedMessages = reflections.map((reflection) => ({
          role: reflection.role as "user" | "assistant",
          content: reflection.content,
          timestamp: new Date(reflection.created_at).toISOString(),
        }));
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error("Error loading reflection history:", err);
      setError(
        "Failed to load reflection history. Please try refreshing the page."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !geminiKey || !user) return;

    console.log(input, "is submitting");

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Save user message to Supabase
      const { error: insertError } = await supabase.from("reflections").insert([
        {
          role: "user",
          user_id: user.id,
          content: input,
        },
      ]);

      if (insertError) throw insertError;

      // Get AI response
      if (!ai) throw new Error("Gemini API key is required.");
      const model = "gemini-2.5-flash-preview-05-20";
      const contents = [
        {
          role: "user",
          parts: [{ text: input }],
        },
      ];

      console.log(contents);

      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });

      let aiResponse = "";
      for await (const chunk of response) {
        aiResponse += chunk.text;
        console.log(aiResponse);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      // Save AI response to Supabase
      const { error: aiInsertError } = await supabase
        .from("reflections")
        .insert([
          {
            user_id: user.id,
            role: "assistant",
            content: aiResponse,
          },
        ]);

      if (aiInsertError) throw aiInsertError;

      setMessages((prev) => [...prev, assistantMessage]);
      toast({
        title: "Reflection saved",
        description: "Your reflection has been recorded successfully.",
      });
    } catch (err) {
      console.error("Error in reflection:", err);
      setError("Failed to save reflection. Please try again.");
      toast({
        title: "Error",
        description: "Failed to save reflection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10 px-4 md:px-6 font-mono">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950 via-violet-900 to-red-700 -z-10 opacity-80"></div>

      {/* this is a way to get the key from the user https://aistudio.google.com/apikey, add a link */}

      <Card className="w-full mb-6 border-0 bg-white/10 backdrop-blur-md shadow-lg">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5 text-yellow-400" />
            <CardTitle className="text-lg font-bold text-white">
              Google Gemini API Key
            </CardTitle>
          </div>
          <CardDescription className="text-white/80">
            Enter your Gemini API key. It will only be used in this session and
            never saved.{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get your key here
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <input
            type="password"
            className="w-full px-3 py-2 border border-white/20 rounded bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-white/50"
            placeholder="Paste your Gemini API key here..."
            value={geminiKey}
            onChange={(e) => {
              setGeminiKey(e.target.value);
              setKeyTouched(true);
            }}
            autoComplete="off"
          />
          {keyTouched && !geminiKey && (
            <div className="text-sm text-red-600 mt-2">
              API key is required to use Gemini reflection chat.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full border-0 bg-white/10 backdrop-blur-md shadow-lg overflow-hidden">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Daily Reflection
              </CardTitle>
              <CardDescription className="text-white/80">
                Take a moment to reflect on your journey and growth
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 border-red-700 bg-red-700/20 text-white"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <ScrollArea
            ref={scrollRef}
            className="h-[500px] rounded-md border border-white/20 p-4 mb-6 bg-black/20"
          >
            <div className="space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-white/70">
                    Start your reflection journey by sharing your thoughts...
                  </p>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-violet-800 to-violet-900 text-white"
                        : "bg-white/10 backdrop-blur-sm border border-white/20 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <span
                      className={`text-xs mt-2 block ${
                        message.role === "user"
                          ? "text-white/60"
                          : "text-white/50"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="What's on your mind? Share your thoughts, feelings, or questions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[100px] resize-none bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:ring-yellow-400"
              disabled={isLoading || !geminiKey}
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-800 to-red-600 hover:from-violet-900 hover:to-red-700 text-white font-bold transition-all duration-300 border-0"
              disabled={isLoading || !input.trim() || !geminiKey}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send Reflection
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
