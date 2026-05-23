import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { fetchFromGoogleDrive } from "@/skills/google_drive";
import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { GRADER_SYSTEM_INSTRUCTION } from "@/agents/graderPrompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY });
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
      if (link.includes("drive.google.com") || link.includes("docs.google.com")) {
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
      } else if (link.startsWith("http")) {
         console.log(`Fetching generic link: ${link}`);
         try {
           const response = await fetch(link);
           if (response.ok && response.body) {
             const contentType = response.headers.get("content-type") || "";
             // Only upload if it seems like a media file
             if (contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("application/pdf")) {
               const ext = mimeToExt(contentType) || path.extname(new URL(link).pathname) || ".bin";
               const localPath = path.join(os.tmpdir(), `generic_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
               const dest = fs.createWriteStream(localPath);
               
               // @ts-ignore
               const readable = Readable.fromWeb(response.body as any);
               readable.pipe(dest);
               
               await new Promise((resolve, reject) => {
                 dest.on('finish', resolve);
                 dest.on('error', reject);
               });
               
               console.log(`Uploading generic file to Gemini: ${localPath} (${contentType})`);
               const uploadResult = await ai.files.upload({
                 file: localPath,
                 mimeType: contentType,
               });
               
               uploadedFiles.push(uploadResult);
               contents.push(uploadResult);
               fs.unlinkSync(localPath);
             } else {
               contents.push(`\nAttached Link: ${link}`);
             }
           } else {
             contents.push(`\nAttached Link: ${link}`);
           }
         } catch (e) {
           console.error(`Failed to fetch generic link ${link}:`, e);
           contents.push(`\nAttached Link: ${link}`);
         }
      } else {
         // Just pass the URL as text if we don't handle it
         contents.push(`\nAttached Link: ${link}`);
      }
    }

    const systemInstruction = GRADER_SYSTEM_INSTRUCTION;

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

// Helper to map content-type to extension for generic files
function mimeToExt(mime: string): string | null {
  if (mime.includes("image/jpeg")) return ".jpg";
  if (mime.includes("image/png")) return ".png";
  if (mime.includes("image/gif")) return ".gif";
  if (mime.includes("image/webp")) return ".webp";
  if (mime.includes("application/pdf")) return ".pdf";
  if (mime.includes("video/mp4")) return ".mp4";
  return null;
}
