import { generateObject } from "ai";
import { z } from "zod";
import {
  AssessmentAnswers,
  DirectionFinderResult,
  ProfileContext,
  extractByQuadrant,
  ZoneGridItem
} from "@/types/direction-finder";
import { getModel } from "./modelRegistry";

// ==========================================
// HELPER FUNCTIONS FOR CONTEXT EXTRACTION
// ==========================================

/**
 * Extract domains from Zone of Genius (high interest + high capability)
 */
export function extractZoneOfGenius(items: ZoneGridItem[]): string[] {
  return extractByQuadrant(items, 'genius');
}

/**
 * Extract domains from Growth Edge (high interest + low capability)
 */
export function extractGrowthEdge(items: ZoneGridItem[]): string[] {
  return extractByQuadrant(items, 'growth');
}

/**
 * Extract domains from Capability Trap (low interest + high capability) - AVOID these
 */
export function extractCapabilityTraps(items: ZoneGridItem[]): string[] {
  return extractByQuadrant(items, 'trap');
}

/**
 * Build the weighted ProfileContext from assessment answers
 */
export function buildProfileContext(answers: AssessmentAnswers): ProfileContext {
  const gridItems = answers.q2_zone_grid?.items || [];

  return {
    primary_signals: {
      zone_of_genius: extractZoneOfGenius(gridItems),
      flow_evidence: answers.q1_flow?.description || '',
      external_proof: answers.q4_reputation || [],
      // MOVE Q5 HERE (Gold Signal)
      values: {
        story: answers.q5_proud?.story || '',
        role_description: answers.q5_proud?.role_description || '', /* NEW */
        drivers: answers.q5_proud?.tags || []
      },
      weight: 0.60 // Increased from 0.55
    },
    secondary_signals: {
      // MOVE Q3 HERE (Low Weight)
      environment: answers.q3_work_style || {
        indoor_outdoor: 'neutral' as const,
        structured_flexible: 'neutral' as const,
        solo_team: 'neutral' as const,
        hands_on_theory: 'neutral' as const,
        steady_fast: 'neutral' as const
      },
      unique_edge: answers.q6_unique?.description || '',
      weight: 0.30 // Decreased from 0.35
    },
    growth_edges: extractGrowthEdge(gridItems),
    capability_traps: extractCapabilityTraps(gridItems)
  };
}

// ==========================================
// SYSTEM PROMPT TEMPLATE
// ==========================================

const SYSTEM_PROMPT = `You are generating a Direction Profile based on student data. Follow these rules STRICTLY:

## Data Utilization Requirements
1. **Primary Signals** (Q1, Q2, Q4, Q5) - these are non-negotiable anchors.
   - Q5 (Proud Moment) is a "GOLD" signal. It reveals true values and motivation.
   - Use the "role_description" in Q5 to distinguish between 'Initiators' (started it), 'Contributors' (helped), or 'Observers'.
   - Q2 (Zone of Genius) & Q1 (Flow) remain core pillars.
2. **Secondary Signals** (Q3, Q6) - these refine but DO NOT BLOCK.
   - Q3 (Work Style) is "Low Stakes". If a vector fits Q1/Q2/Q5 perfectly but mismatches Q3, recommend it anyway (just note the mismatch).
3. **Growth Edges** - consider as stretch goals or complementary skills

## Direction Vector Strategy (BROAD & FUTURE-FOCUSED)
- **Industry**: Suggest broad, resilient industries (e.g., "Digital Health" not "Health App Dev").
- **Role**: High-level role types (e.g., "Product Architect", "System Designer").
- **Specialization**: A specific, futuristic niche they could own (e.g., "AI-Ethics Compliance", "Neuro-Architecture").
- **Do NOT** suggest specific entry-level job titles like "Junior Developer". Think mid-career trajectory.

## Insight Generation
For every Energizer, Strength, and Value, provide:
- **Name**: The label.
- **Description**: A user-friendly explanation.
- **Insight**: "Why this matters for YOU" based on the assessment data (e.g., "because you love [Q1 activity]...").

## Match Score Calculation
For each career vector, calculate fit as:
- Zone of Genius alignment (Q2 high-high): 25 points
- Proud Moment/Values alignment (Q5): 20 points (Increased weight)
- Flow state connection (Q1): 15 points  
- External validation (Q4): 10 points
- Environment fit (Q3): 10 points (Decreased weight - Low Stakes)
- Growth potential (Q2 high-low): 10 points
- Unique advantage (Q6): 10 points bonus

Total = /100
`;

// ==========================================
// MAIN PROFILE GENERATION (COMBINED)
// ==========================================

export async function generateDirectionProfile(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<DirectionFinderResult> {
  try {
    const context = buildProfileContext(answers);

    const prompt = `
${SYSTEM_PROMPT}

Language: ${language === 'th' ? 'Thai' : 'English'}
All output values MUST be in ${language === 'th' ? 'Thai' : 'English'}.

## Student Profile Context (Weighted Data)

### PRIMARY SIGNALS (60% weight - HIGH SIGNAL)
**Zone of Genius** (Q2 - High Interest + High Capability):
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

**Flow State Evidence** (Q1):
"${context.primary_signals.flow_evidence}"

**External Validation** (Q4 - What people ask them for):
${JSON.stringify(context.primary_signals.external_proof, null, 2)}

**Proud Moment & Values** (Q5 - GOLD SIGNAL):
Story: "${context.primary_signals.values.story}"
Role: "${context.primary_signals.values.role_description}"
Tags: ${JSON.stringify(context.primary_signals.values.drivers)}

### SECONDARY SIGNALS (30% weight - LOW STAKES)
**Environment Preferences** (Q3 - No Right Answer):
${JSON.stringify(context.secondary_signals.environment, null, 2)}
(Note: Treat these as preferences, not requirements. Do not block career paths even if they slightly mismatch.)

**Unique Edge** (Q6):
"${context.secondary_signals.unique_edge}"

### GROWTH EDGES (10% weight - stretch opportunities)
${JSON.stringify(context.growth_edges, null, 2)}

### CAPABILITY TRAPS (AVOID - low interest, high skill)
${JSON.stringify(context.capability_traps, null, 2)}

### Conversation History
${JSON.stringify(history, null, 2)}

---

Generate 3 career direction vectors. For EACH vector:
1. Show which Q2 domains from zone_of_genius it connects to
2. Quote a specific phrase from q1_flow_evidence
3. Reference at least 2 items from q4_reputation
4. Check alignment with q3_environment preferences
5. Explain how it honors their q5_values

Include an "evidence_used" object in each vector showing you used data from Q1-Q6.
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          strengths: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          values: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
          industry: z.string(),
          role: z.string(),
          specialization: z.string(),
          rarity: z.enum(['Rare', 'Epic', 'Legendary', 'Mythical']).optional(),
          recommended_faculty: z.string().optional(),
          match_context: z.object({
            passion_context: z.string(),
            skill_context: z.string(),
          }).optional(),
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          differentiators: z.object({
            main_focus: z.string(),
            knowledge_base: z.array(z.string()),
            skill_tree: z.array(z.string()),
          }).optional(),
          match_scores: z.object({
            overall: z.number().min(0).max(100),
            passion: z.number().min(0).max(100),
            skill: z.number().min(0).max(100),
          }),
          evidence_used: z.object({
            q1_insight: z.string().optional(),
            q2_quadrant: z.string().optional(),
            q3_preferences: z.array(z.string()).optional(),
            q4_validation: z.string().optional(),
            q5_driver: z.string().optional(),
            q6_bonus: z.string().optional(),
          }).optional(),
          exploration_steps: z.array(z.object({
            type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']),
            description: z.string(),
            reason: z.string().optional(),
          })),
          first_step: z.string(),
        })),
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']),
          match_percentage: z.number(),
          reason: z.string(),
          deadline: z.string().optional(),
          application_link: z.string().optional(),
        })),
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating direction profile:", error);
    throw error;
  }
}

// ... (keep generateDirectionProfile as is, but we'll focus on the schema update inside generateCoreLogic/generateDirectionProfile)

// ==========================================
// CONVERSATION HISTORY COMPRESSION
// ==========================================

/**
 * Compress conversation history to reduce prompt size
 * Keeps: first message, important messages with keywords, last 6 messages
 * This reduces prompt size by 40-60% while preserving critical context
 *
 * @param history - Full conversation history
 * @returns Compressed conversation history
 */
export function compressConversationHistory(
  history: { role: 'user' | 'assistant'; content: string }[]
): { role: 'user' | 'assistant'; content: string }[] {
  if (history.length <= 8) {
    // Already short enough, return as is
    return history;
  }

  // Keywords that indicate important messages
  const importantKeywords = [
    'zone of genius',
    'proud',
    'value',
    'strength',
    'passion',
    'flow',
    'talent',
    'gift',
    'uniqu',
    'best at',
    'love',
    'enjoy',
  ];

  // Check if a message contains important keywords
  const isImportant = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    return importantKeywords.some(keyword => lowerContent.includes(keyword));
  };

  // Keep first message (greeting)
  const first = history.slice(0, 1);

  // Find important messages in the middle (skip first and last 6)
  const middle = history.slice(1, -6);
  const importantMiddle = middle.filter(msg => isImportant(msg.content)).slice(0, 2);

  // Keep last 6 messages (3 exchanges)
  const last = history.slice(-6);

  // Combine: first + important middle + last
  return [...first, ...importantMiddle, ...last];
}

// ==========================================
// CORE PROFILE GENERATION (Vectors Only)
// ==========================================

export async function generateDirectionProfileCore(
  history: { role: 'user' | 'assistant'; content: string }[],
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<Partial<DirectionFinderResult>> {
  try {
    const context = buildProfileContext(answers);

    // Compress conversation history to reduce prompt size (40-60% reduction)
    const compressedHistory = compressConversationHistory(history);

    const prompt = `
${SYSTEM_PROMPT}

Language: ${language === 'th' ? 'Thai' : 'English'}
All output values MUST be in ${language === 'th' ? 'Thai' : 'English'}.

## Student Profile Context (Weighted Data)

### PRIMARY SIGNALS (60% weight - HIGH SIGNAL)
**Zone of Genius** (Q2 - High Interest + High Capability):
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

**Flow State Evidence** (Q1):
"${context.primary_signals.flow_evidence}"

**External Validation** (Q4 - What people ask them for):
${JSON.stringify(context.primary_signals.external_proof, null, 2)}

**Proud Moment & Values** (Q5 - GOLD SIGNAL):
Story: "${context.primary_signals.values.story}"
Role: "${context.primary_signals.values.role_description}"
Tags: ${JSON.stringify(context.primary_signals.values.drivers)}

### SECONDARY SIGNALS (30% weight - LOW STAKES)
**Environment Preferences** (Q3 - No Right Answer):
${JSON.stringify(context.secondary_signals.environment, null, 2)}
(Note: Treat these as preferences, not requirements. Do not block career paths even if they slightly mismatch.)

**Unique Edge** (Q6):
"${context.secondary_signals.unique_edge}"

### GROWTH EDGES (10% weight - stretch opportunities)
${JSON.stringify(context.growth_edges, null, 2)}

### CAPABILITY TRAPS (AVOID)
${JSON.stringify(context.capability_traps, null, 2)}

### Conversation History (Compressed)
${JSON.stringify(compressedHistory, null, 2)}

---
Generate the CORE profile (Profile + 3 Vectors). 
Ensure 'energizers', 'strengths', and 'values' are arrays of objects with { name, description, insight }.
Ensure vectors include 'industry', 'role', and 'specialization'.
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          strengths: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          values: z.array(z.object({
            name: z.string(),
            description: z.string(),
            insight: z.string(),
          })),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
          industry: z.string(),
          role: z.string(),
          specialization: z.string(),
          rarity: z.enum(['Rare', 'Epic', 'Legendary', 'Mythical']).optional(),
          recommended_faculty: z.string().optional(),
          match_context: z.object({
            passion_context: z.string(),
            skill_context: z.string(),
          }).optional(),
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          differentiators: z.object({
            main_focus: z.string(),
            knowledge_base: z.array(z.string()),
            skill_tree: z.array(z.string()),
          }).optional(),
          match_scores: z.object({
            overall: z.number().min(0).max(100),
            passion: z.number().min(0).max(100),
            skill: z.number().min(0).max(100),
          }),
          evidence_used: z.object({
            q1_insight: z.string().optional(),
            q2_quadrant: z.string().optional(),
            q3_preferences: z.array(z.string()).optional(),
            q4_validation: z.string().optional(),
            q5_driver: z.string().optional(),
            q6_bonus: z.string().optional(),
          }).optional(),
          exploration_steps: z.array(z.object({
            type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']),
            description: z.string(),
            reason: z.string().optional(),
          })),
          first_step: z.string(),
        })),
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']),
          match_percentage: z.number(),
          reason: z.string(),
          deadline: z.string().optional(),
          application_link: z.string().optional(),
        })),
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating core profile:", error);
    throw error;
  }
}

// ==========================================
// DETAILS GENERATION (Programs & Commitments)
// ==========================================

export async function generateDirectionProfileDetails(
  coreResult: Partial<DirectionFinderResult>,
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<Partial<DirectionFinderResult>> {
  try {
    const context = buildProfileContext(answers);

    const prompt = `
Based on the student's Core Direction Vectors, generate supporting details (Programs & Commitments).

Language: ${language === 'th' ? 'Thai' : 'English'}
All output values MUST be in ${language === 'th' ? 'Thai' : 'English'}.

Core Vectors Identified:
${JSON.stringify(coreResult.vectors, null, 2)}

Student's Zone of Genius Domains:
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

Student's Environment Preferences:
${JSON.stringify(context.secondary_signals.environment, null, 2)}

---
Generate 2-3 recommended programs/faculties and weekly/monthly commitments.
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']),
          match_percentage: z.number(),
          reason: z.string(),
          deadline: z.string().optional(),
          application_link: z.string().optional(),
        })),
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return object;
  } catch (error) {
    console.error("Error generating profile details:", error);
    throw error;
  }
}
