# PathLabMapStructure

Use this exact structure:

```ts
interface PathLabMapStructure {
  seed: {
    title: string;
    description: string;
    slogan: string;
  };
  nodes: {
    [key: string]: {
      title: string;
      instructions: string;
      node_type: "learning" | "text" | "comment" | "end";
      position: { x: number; y: number };
      content: Array<{
        content_type: "text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link";
        content_url?: string;
        content_body: string;
      }>;
      assessments: Array<{
        type: "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist";
        prompt: string;
        isGraded: boolean;
        pointsPossible: number;
      }>;
    };
  };
  edges?: Array<{
    source_key: string;
    destination_key: string;
  }>;
  path: {
    total_days: number;
    days: Array<{
      day_number: number;
      title: string;
      context_text: string;
      reflection_prompts: string[];
      node_keys: string[];
    }>;
  };
}
```

## Hard Constraints

- Output exactly one JSON object.
- Use `total_days` of `5`, `6`, or `7`.
- `days.length` must equal `total_days`.
- Day numbers are sequential starting at `1`.
- Each day has `1-2` reflection prompts.
- Each day has `1-2` `node_keys`.
- Every `node_key` must exist in `nodes`.
- Every node includes at least one `content` item and one `assessment`.
- Every node includes `quiz` or `checklist`.
- Final day includes this exact decision prompt:
  - `Based on this week, what's your next step? Continue / Pause / Quit`
