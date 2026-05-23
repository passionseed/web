import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchFromGoogleDrive } from "@/skills/google_drive";
import fs from "fs";
import path from "path";

// Initialize Gemini Client
const ai = new GoogleGenAI();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, text_answer, image_url, file_urls } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Assessment prompt is required for grading." }, { status: 400 });
    }

    // Prepare contents array for Gemini
    const contents: any[] = [];
    
    // Add textual content
    let textContent = `Assessment Prompt: ${prompt}\n\n`;
    if (text_answer) {
      textContent += `Student's Text Answer: ${text_answer}\n`;
    } else {
      textContent += `Student's Text Answer: [No text provided]\n`;
    }
    contents.push(textContent);

    const uploadedFiles: any[] = [];

    // Process Google Drive Links or standard image URLs
    const allLinks = [image_url, ...(file_urls || [])].filter(Boolean);
    
    for (const link of allLinks) {
      if (link.includes("drive.google.com")) {
        console.log(`Fetching from Google Drive: ${link}`);
        try {
          const localPath = await fetchFromGoogleDrive(link);
          const mimeType = getMimeType(localPath);
          console.log(`Uploading local file to Gemini: ${localPath} (${mimeType})`);
          
          const uploadResult = await ai.files.upload({
            file: localPath,
            mimeType: mimeType,
          });
          
          uploadedFiles.push(uploadResult);
          contents.push(uploadResult);
          
          // Clean up local temp file
          fs.unlinkSync(localPath);
        } catch (e: any) {
          console.error(`Failed to process Drive link ${link}:`, e);
          contents.push(`\nNote to Grader: A file was submitted via Google Drive but could not be automatically fetched due to access restrictions or errors. Drive link: ${link}`);
        }
      } else {
         // Just pass the URL as text if we don't handle it
         contents.push(`\nAttached Link: ${link}`);
      }
    }

    // Read the system instruction prompt
    const graderPromptPath = path.join(process.cwd(), 'agents', 'grader.md');
    const systemInstruction = fs.readFileSync(graderPromptPath, 'utf-8');

    console.log("Calling Gemini API for grading...");
    // Call Gemini to grade
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    
    // Cleanup any uploaded files from Gemini storage
    for (const f of uploadedFiles) {
      try {
        await ai.files.delete({ name: f.name });
      } catch (e) {
        console.error(`Failed to delete Gemini file ${f.name}:`, e);
      }
    }

    // Parse JSON
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return NextResponse.json({ result: parsed });
    }

    return NextResponse.json({ error: "Empty response from Gemini." }, { status: 500 });

  } catch (error: any) {
    console.error("Grader API Error:", error);
    return NextResponse.json({ error: error.message || "An unknown error occurred" }, { status: 500 });
  }
}

// Helper to guess mime type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.mp4': return 'video/mp4';
    case '.mov': return 'video/mp4'; // fallback
    case '.avi': return 'video/mp4'; // fallback
    default: return 'application/octet-stream';
  }
}
