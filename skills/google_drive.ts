import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Downloads a file from Google Drive and returns the local file path.
 * If credentials are not provided via environment variables, it will try an unauthenticated request (works for public files).
 */
export async function fetchFromGoogleDrive(fileUrl: string): Promise<string> {
  // Extract file ID from typical Drive URLs
  // Examples: 
  // https://drive.google.com/file/d/1X_abc123/view
  // https://drive.google.com/open?id=1X_abc123
  let fileId = '';
  const matchD = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  
  if (matchD && matchD[1]) {
    fileId = matchD[1];
  } else if (matchId && matchId[1]) {
    fileId = matchId[1];
  } else {
    throw new Error('Invalid Google Drive URL. Could not extract file ID.');
  }

  // Setup auth
  let auth;
  // If we have a service account key or standard ADC, we can use it.
  // Otherwise we try without auth (for public files)
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
       auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
       });
    } else {
       auth = new google.auth.GoogleAuth();
    }
  } catch (e) {
    // Fallback to unauthenticated if ADC fails
    auth = process.env.GOOGLE_API_KEY || null;
  }

  const drive = google.drive({ version: 'v3', auth: auth as any });

  // Get file metadata to determine extension
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
  });

  const ext = path.extname(meta.data.name || '') || '.bin';
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `${fileId}${ext}`);

  // Download the file
  const dest = fs.createWriteStream(filePath);
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    res.data
      .on('end', () => {
        resolve(filePath);
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .pipe(dest);
  });
}
