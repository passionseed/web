const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    fs.writeFileSync('test.txt', 'hello');
    console.log("uploading...");
    const res = await ai.files.upload({ file: "test.txt", mimeType: "text/plain" });
    console.log(res);
  } catch (e) {
    console.error(e.message);
  }
}
run();
