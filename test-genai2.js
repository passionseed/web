const { GoogleGenAI } = require("@google/genai");

async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: undefined });
    console.log("initialized");
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello"
    });
    console.log(res.text);
  } catch (e) {
    console.error(e.message);
  }
}
run();
