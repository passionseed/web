/**
 * Image analysis utilities for hackathon AI grading.
 * Calls MiniMax's coding-plan VLM endpoint — the exact same API the
 * minimax-coding-plan-mcp `understand_image` tool uses internally.
 *
 * Reference: https://github.com/MiniMax-AI/MiniMax-Coding-Plan-MCP
 *   - Endpoint:   POST {MINIMAX_API_HOST}/v1/coding_plan/vlm
 *   - Payload:    { prompt, image_url }  (image_url must be a base64 data URL)
 *   - Headers:    Authorization: Bearer <key>, MM-API-Source: Minimax-MCP
 *   - Response:   { content: string, base_resp: { status_code, status_msg } }
 *
 * Requires MINIMAX_API_KEY and (optionally) MINIMAX_API_HOST in env.
 * Default host is https://api.minimaxi.com (Mainland). Use
 * https://api.minimax.io for Global keys.
 */

const MINIMAX_API_HOST =
  process.env.MINIMAX_API_HOST ?? "https://api.minimaxi.com";

// Only JPEG/PNG/WebP are supported by the VLM endpoint (HEIC must be converted).
const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)(\?|$)/i;

export type ImageAnalysisResult = {
  analysis: string;
  error?: string;
};

export type FileAnalysisResult = {
  url: string;
  analysis: string;
  error?: string;
};

export type SubmissionImageAnalysis = {
  primaryImage: ImageAnalysisResult | null;
  files: FileAnalysisResult[];
};

/**
 * Detect image "type" from URL + activity title to choose a focused prompt.
 */
function detectImageType(
  url: string,
  activityTitle?: string | null
): "ui_mockup" | "diagram" | "photo" | "document" | "unknown" {
  const urlLower = url.toLowerCase();
  const titleLower = activityTitle?.toLowerCase() ?? "";

  if (SUPPORTED_IMAGE_EXTENSIONS.test(urlLower)) {
    if (
      titleLower.match(/(wireframe|mockup|prototype|design|ui|ux|figma|sketch)/) ||
      urlLower.match(/(wireframe|mockup|design|ui)/)
    ) {
      return "ui_mockup";
    }
    if (
      titleLower.match(/(diagram|flowchart|system|map|chart|graph|journey)/) ||
      urlLower.match(/(diagram|flow|chart)/)
    ) {
      return "diagram";
    }
    if (
      titleLower.match(/(photo|interview|observation|field|research)/) ||
      urlLower.match(/(photo|interview)/)
    ) {
      return "photo";
    }
  }

  if (urlLower.match(/\.(pdf|doc|docx|ppt|pptx)(\?|$)/)) {
    return "document";
  }

  return "unknown";
}

/**
 * Build analysis prompt based on image type and activity context.
 */
function buildAnalysisPrompt(
  imageType: ReturnType<typeof detectImageType>,
  activityLens?: {
    outcome: string;
    evidence: string;
    redFlag: string;
  } | null
): string {
  const baseContext = activityLens
    ? `This image is a hackathon submission. The learning goal is: ${activityLens.outcome}. Look for evidence of: ${activityLens.evidence}. Watch out for: ${activityLens.redFlag}.`
    : "This is a student hackathon submission image. Analyze it for learning evidence.";

  const typeSpecificPrompts: Record<typeof imageType, string> = {
    ui_mockup: `${baseContext}

Analyze this UI/UX design or prototype image. Describe concretely:
1. What the interface shows - key screens, features, user flows visible
2. Design thinking evidence - user-centered decisions, problem-solution fit
3. Visual hierarchy and usability
4. Completeness and polish
5. Specific strengths and gaps related to the learning goal

Be specific. Describe what you literally see, not generic praise.`,

    diagram: `${baseContext}

Analyze this diagram, system map, or user journey. Describe concretely:
1. Actors/components shown
2. Sequence or flow - what happens in what order, arrows, connections
3. Friction points, workarounds, or loops visible
4. Systems thinking evidence - causality, feedback loops, leverage points
5. Clarity and depth
6. Alignment with the learning goal

Describe what you literally see, including text labels if readable.`,

    photo: `${baseContext}

Analyze this photo or screenshot from field research. Describe concretely:
1. What is shown - context, people, activities, environment
2. Evidence quality - does it prove real engagement with users/reality
3. Research method clues - interview, observation, survey, etc.
4. Insights visible
5. Authenticity indicators

Describe what you literally see.`,

    document: `${baseContext}

This appears to be a document. If readable, describe:
1. Document type and purpose
2. Key sections and their text
3. Completeness and professionalism
4. Evidence of learning goal achievement

Quote specific text when readable.`,

    unknown: `${baseContext}

Analyze this submission image. Describe concretely:
1. What is literally visible (objects, text, people, structures)
2. What type of submission this appears to be
3. Evidence of effort and learning
4. Quality and completeness
5. Any concerns or limitations

Describe what you actually see.`,
  };

  return typeSpecificPrompts[imageType];
}

/**
 * Convert HEIC/HEIF image to JPEG Blob.
 */
async function convertHeicToJpeg(
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const blob = new Blob([imageBuffer], { type: contentType || "image/heic" });
  const jpegBlob = await heic2any({
    blob,
    toType: "image/jpeg",
    quality: 0.9,
  });
  // heic2any returns Blob | Blob[] — normalize to Blob
  return Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;
}

/**
 * Download a remote image and convert to a base64 data URL — mirrors
 * `process_image_url` in the MCP's utils.py.
 * HEIC/HEIF images are automatically converted to JPEG.
 */
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  // Already a data URL — pass through
  if (imageUrl.startsWith("data:")) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    );
  }

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const arrayBuffer = await response.arrayBuffer();

  // Detect if this is a HEIC/HEIF image
  const isHeic =
    contentType.includes("heic") ||
    contentType.includes("heif") ||
    /\.(heic|heif)(\?|$)/i.test(imageUrl);

  let imageFormat: "jpeg" | "png" | "webp" = "jpeg";
  let base64: string;

  if (isHeic) {
    // Convert HEIC to JPEG
    const jpegBlob = await convertHeicToJpeg(arrayBuffer, contentType);
    const jpegArrayBuffer = await jpegBlob.arrayBuffer();
    base64 = Buffer.from(jpegArrayBuffer).toString("base64");
    imageFormat = "jpeg";
  } else {
    if (contentType.includes("png")) imageFormat = "png";
    else if (contentType.includes("webp")) imageFormat = "webp";
    else if (contentType.includes("jpeg") || contentType.includes("jpg"))
      imageFormat = "jpeg";
    else {
      // Fall back to URL extension
      const lower = imageUrl.toLowerCase();
      if (lower.match(/\.png(\?|$)/)) imageFormat = "png";
      else if (lower.match(/\.webp(\?|$)/)) imageFormat = "webp";
    }
    base64 = Buffer.from(arrayBuffer).toString("base64");
  }

  return `data:image/${imageFormat};base64,${base64}`;
}

/**
 * Call MiniMax's coding-plan VLM endpoint.
 * This is byte-for-byte what the MCP's `understand_image` tool does.
 */
async function callMinimaxVlm(
  prompt: string,
  imageUrl: string
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not set");
  }

  // The VLM endpoint requires a base64 data URL, NOT an HTTP URL.
  const dataUrl = await fetchImageAsDataUrl(imageUrl);

  const response = await fetch(`${MINIMAX_API_HOST}/v1/coding_plan/vlm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "MM-API-Source": "Minimax-MCP",
    },
    body: JSON.stringify({
      prompt,
      image_url: dataUrl,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `MiniMax VLM API ${response.status}: ${errText.slice(0, 500)}`
    );
  }

  const data = (await response.json()) as {
    content?: string;
    base_resp?: { status_code?: number; status_msg?: string };
  };

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax VLM error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`
    );
  }

  const content = data.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("MiniMax VLM returned empty content");
  }

  return content.trim();
}

/**
 * Analyze a single image URL using MiniMax's VLM endpoint.
 */
export async function analyzeImage(
  imageUrl: string,
  activityLens?: { outcome: string; evidence: string; redFlag: string } | null,
  activityTitle?: string | null
): Promise<ImageAnalysisResult> {
  try {
    if (!SUPPORTED_IMAGE_EXTENSIONS.test(imageUrl)) {
      return {
        analysis: "",
        error:
          "Unsupported image format (VLM supports only JPEG, PNG, WebP, HEIC)",
      };
    }

    const imageType = detectImageType(imageUrl, activityTitle);
    const prompt = buildAnalysisPrompt(imageType, activityLens);
    const analysis = await callMinimaxVlm(prompt, imageUrl);
    return { analysis };
  } catch (error) {
    console.error("[image-analysis] Failed to analyze image:", imageUrl, error);
    return {
      analysis: "",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error analyzing image",
    };
  }
}

function isImageUrl(url: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.test(url);
}

/**
 * Analyze multiple file URLs in parallel. Non-image files are flagged
 * so the grader knows to rely on text only.
 */
export async function analyzeFiles(
  fileUrls: string[],
  activityLens?: { outcome: string; evidence: string; redFlag: string } | null,
  activityTitle?: string | null
): Promise<FileAnalysisResult[]> {
  if (!fileUrls.length) return [];

  const analyses = await Promise.all(
    fileUrls.map(async (url) => {
      if (!isImageUrl(url)) {
        return {
          url,
          analysis: "",
          error:
            "File is not a JPEG/PNG/WebP image; skipped vision analysis",
        };
      }
      try {
        const result = await analyzeImage(url, activityLens, activityTitle);
        return {
          url,
          analysis: result.analysis,
          error: result.error,
        };
      } catch (error) {
        return {
          url,
          analysis: "",
          error:
            error instanceof Error ? error.message : "Failed to analyze file",
        };
      }
    })
  );

  return analyses;
}

/**
 * Full submission analysis — primary image + all file urls, in parallel.
 */
export async function analyzeSubmission(params: {
  imageUrl: string | null;
  fileUrls: string[];
  activityLens?: { outcome: string; evidence: string; redFlag: string } | null;
  activityTitle?: string | null;
}): Promise<SubmissionImageAnalysis> {
  const { imageUrl, fileUrls, activityLens, activityTitle } = params;

  const [primaryImage, files] = await Promise.all([
    imageUrl
      ? analyzeImage(imageUrl, activityLens, activityTitle)
      : Promise.resolve(null),
    fileUrls.length > 0
      ? analyzeFiles(fileUrls, activityLens, activityTitle)
      : Promise.resolve([]),
  ]);

  return { primaryImage, files };
}

/**
 * Format analysis results for inclusion in the grading prompt.
 */
export function formatImageAnalysisForPrompt(
  analysis: SubmissionImageAnalysis
): string {
  const parts: string[] = [];

  if (analysis.primaryImage?.analysis) {
    parts.push("PRIMARY IMAGE ANALYSIS:");
    parts.push(analysis.primaryImage.analysis);
    parts.push("");
  }

  if (analysis.primaryImage?.error) {
    parts.push(`NOTE: Image analysis failed - ${analysis.primaryImage.error}`);
    parts.push("");
  }

  const successfulFileAnalyses = analysis.files.filter(
    (f) => f.analysis && !f.error
  );
  if (successfulFileAnalyses.length > 0) {
    parts.push("ADDITIONAL FILES:");
    successfulFileAnalyses.forEach((file, idx) => {
      parts.push(`File ${idx + 1} (${file.url}):`);
      parts.push(file.analysis);
      parts.push("");
    });
  }

  const failedAnalyses = analysis.files.filter((f) => f.error);
  if (failedAnalyses.length > 0) {
    parts.push("NOTE: Some files could not be analyzed:");
    failedAnalyses.forEach((file) => {
      parts.push(`- ${file.url}: ${file.error}`);
    });
    parts.push("");
  }

  return parts.join("\n");
}
