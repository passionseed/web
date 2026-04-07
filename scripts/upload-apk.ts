import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Use the remote/production keys if available
const SUPABASE_URL = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const APK_PATH = '/Users/bunyasit/dev/passionseed/ps_app/build-1775426216647.apk';
const BUCKET_NAME = 'apks';

async function uploadApk() {
  console.log('--- STARTING UPLOAD PROCESS ---');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: Missing Supabase environment variables');
    process.exit(1);
  }

  console.log(`Connecting to: ${SUPABASE_URL}`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    console.log('Checking buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const bucketExists = buckets?.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 300 * 1024 * 1024, // 300MB
      });
      if (createError) throw createError;
    }

    console.log(`Reading file: ${APK_PATH}`);
    const fileBuffer = fs.readFileSync(APK_PATH);
    const fileName = 'passionseed-app.apk';

    console.log(`Uploading ${Math.round(fileBuffer.length / 1024 / 1024)}MB to Supabase Storage...`);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('\n--- UPLOAD SUCCESSFUL ---');
    console.log(`Public URL: ${publicUrl}`);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}

uploadApk();
