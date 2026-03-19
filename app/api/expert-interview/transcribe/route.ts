import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Format chat history into context string for post-processing
 */
function formatChatContext(messages: ChatMessage[]): string {
  return messages
    .map((msg) => `${msg.role === "user" ? "Expert" : "Interviewer"}: ${msg.content}`)
    .join("\n");
}

/**
 * Extract names and terms from chat context for Whisper prompt hinting
 * This helps with spelling of proper nouns mentioned in conversation
 */
function extractNamesAndTerms(messages: ChatMessage[]): string {
  const text = messages.map((m) => m.content).join(" ");
  
  // Simple extraction: look for capitalized words that might be names
  const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  // Also extract quoted terms and technical terms
  const quotedTerms = text.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, "")) || [];
  
  const allTerms = [...new Set([...capitalizedWords, ...quotedTerms])].slice(0, 20);
  return allTerms.join(", ");
}

/**
 * POST /api/expert-interview/transcribe
 * 
 * Transcribes audio using Groq Whisper and post-processes with LLM
 * using chat context for better accuracy on names and terms.
 * 
 * Request body (FormData):
 * - audio: Audio blob (webm, wav, mp3, etc.)
 * - chatHistory: JSON string of ChatMessage[] (last N messages for context)
 * - language: "en" | "th"
 */
export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob | null;
    const chatHistoryStr = formData.get("chatHistory") as string | null;
    const language = (formData.get("language") as string) || "en";

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio provided" },
        { status: 400 }
      );
    }

    // Parse chat history for context
    let chatHistory: ChatMessage[] = [];
    if (chatHistoryStr) {
      try {
        chatHistory = JSON.parse(chatHistoryStr);
      } catch {
        // Ignore parse errors
      }
    }

    // Take last 10 messages for context
    const recentHistory = chatHistory.slice(-10);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Step 1: Transcribe audio with Whisper
    // Use prompt hinting with names/terms from chat history
    const namesAndTerms = extractNamesAndTerms(recentHistory);
    const whisperPrompt = namesAndTerms 
      ? `Names and terms in this conversation: ${namesAndTerms}`
      : undefined;

    // Convert blob to File for Groq API
    const audioFile = new File([audioBlob], "audio.webm", { type: audioBlob.type || "audio/webm" });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      language: language === "th" ? "th" : "en",
      prompt: whisperPrompt,
      response_format: "json",
    });

    const rawTranscript = transcription.text;

    if (!rawTranscript.trim()) {
      return NextResponse.json({ text: "" });
    }

    // Step 2: Post-process with LLM using chat context
    const contextSummary = formatChatContext(recentHistory);

    const systemPrompt = language === "th"
      ? `คุณเป็นตัวช่วยประมวลผลคำพูด

หน้าที่ของคุณ:
- ลบคำเติมเช่น (อืม, เอ่อ, อะไรนะ, แบบ)
- แก้ไขการสะกด ไวยากรณ์ และวรรคตอน
- ใช้บริบทจากการสนทนาเพื่อสะกดชื่อและคำศัพท์ให้ถูกต้อง
- รักษาเจตนาของผู้พูดให้แม่นยำ

ส่งคืนเฉพาะข้อความที่แก้ไขแล้ว ไม่ต้องมีอะไรอื่น`
      : `You are a dictation post-processor.

Your job:
- Remove filler words (um, uh, you know, like, I mean)
- Fix spelling, grammar, and punctuation
- Use the CHAT CONTEXT to correctly spell names, terms, and topics that were mentioned earlier
- Preserve the speaker's intent exactly
- Keep the response natural and conversational

Return ONLY the cleaned text, nothing else.`;

    const userPrompt = recentHistory.length > 0
      ? `CHAT CONTEXT:
${contextSummary}

RAW TRANSCRIPT:
"${rawTranscript}"

Return the cleaned transcript:`
      : `RAW TRANSCRIPT:
"${rawTranscript}"

Return the cleaned transcript:`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const cleanedText = completion.choices[0]?.message?.content?.trim() || rawTranscript;

    return NextResponse.json({ text: cleanedText });
  } catch (error) {
    console.error("[transcribe] failed", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}