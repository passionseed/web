import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';

/**
 * Downloads a file from Google Drive and returns the local file path.
 * If credentials are not provided via environment variables, it will try an unauthenticated request (works for public files).
 */
export async function fetchFromGoogleDrive(fileUrl: string): Promise<string> {
  // Extract file ID from typical Drive URLs
  let fileId = '';
  // match /d/ID for drive and docs
  const matchD = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  
  if (matchD && matchD[1]) {
    fileId = matchD[1];
  } else if (matchId && matchId[1]) {
    fileId = matchId[1];
  } else {
    throw new Error('Invalid Google Drive/Docs URL. Could not extract file ID.');
  }

  const tmpDir = os.tmpdir();
  
  // If we have API credentials, try the official Google API first
  let driveClient = null;
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
       const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
       });
       driveClient = google.drive({ version: 'v3', auth: auth as any });
    } else if (process.env.GOOGLE_API_KEY) {
       driveClient = google.drive({ version: 'v3', auth: process.env.GOOGLE_API_KEY as any });
    } else {
       console.log("No Google API credentials found, skipping official Drive API client.");
       driveClient = null;
    }
  } catch (e: any) {
    console.warn("Failed to initialize Google API Auth client, skipping to public fallback:", e.message);
    driveClient = null;
  }

  if (driveClient) {
    try {
      // Get file metadata to determine extension
      const meta = await driveClient.files.get({
        fileId,
        fields: 'name, mimeType',
      });

      const ext = path.extname(meta.data.name || '') || '.bin';
      const filePath = path.join(tmpDir, `${fileId}${ext}`);

      // Download the file
      const dest = fs.createWriteStream(filePath);
      const res = await driveClient.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return await new Promise((resolve, reject) => {
        res.data
          .on('end', () => resolve(filePath))
          .on('error', (err: any) => reject(err))
          .pipe(dest);
      });
    } catch (e: any) {
      console.warn("Official Google API fetch failed, attempting public download fallback:", e.message);
    }
  }

  // Fallback: Direct public download for "Anyone with the link can view" files
  const filePath = path.join(tmpDir, `${fileId}.bin`);
  
  // If it's a doc/spreadsheet/presentation, export as PDF.
  // Otherwise, use the standard uc?export=download endpoint for files
  let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  if (fileUrl.includes('docs.google.com/document')) {
    downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  } else if (fileUrl.includes('docs.google.com/spreadsheets')) {
    downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf`;
  } else if (fileUrl.includes('docs.google.com/presentation')) {
    downloadUrl = `https://docs.google.com/presentation/d/${fileId}/export/pdf`;
  }
  
  const response = await fetch(downloadUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download public Drive file. Status: ${response.status}. Make sure the Drive link is shared as "Anyone with the link can view".`);
  }

  const dest = fs.createWriteStream(filePath);
  
  if (response.body) {
    // @ts-ignore - response.body is ReadableStream in Node 18+
    const readable = Readable.fromWeb(response.body as any);
    readable.pipe(dest);
    
    return await new Promise((resolve, reject) => {
      dest.on('finish', () => resolve(filePath));
      dest.on('error', reject);
      readable.on('error', reject);
    });
  } else {
    throw new Error("Empty response body when downloading public drive file.");
  }
}
