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
      weight: 0.55
    },
    secondary_signals: {
      environment: answers.q3_work_style || {
        indoor_outdoor: 'neutral' as const,
        structured_flexible: 'neutral' as const,
        solo_team: 'neutral' as const,
        hands_on_theory: 'neutral' as const,
        steady_fast: 'neutral' as const
      },
      values: {
        story: answers.q5_proud?.story || '',
        drivers: answers.q5_proud?.tags || []
      },
      unique_edge: answers.q6_unique?.description || '',
      weight: 0.35
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
You MUST reference insights from ALL sections:
1. **Primary Signals** (Q1, Q2, Q4) - these are non-negotiable anchors
2. **Secondary Signals** (Q3, Q5, Q6) - these refine and validate
3. **Growth Edges** - consider as stretch goals or complementary skills

## Match Score Calculation
For each career vector, calculate fit as:
- Zone of Genius alignment (Q2 high-high): 30 points
- Flow state connection (Q1): 15 points  
- External validation (Q4): 10 points
- Environment fit (Q3): 15 points
- Value alignment (Q5): 10 points
- Growth potential (Q2 high-low): 10 points
- Unique advantage (Q6): 10 points bonus

Total = /100

## fit_reason Structure (MANDATORY)
Every fit_reason must include:
- "Your Zone of Genius in [X from Q2] connects to this because..."
- "When you described [specific detail from Q1], it shows..."
- "People recognize your [skill from Q4], which is crucial for..."
- "This matches your preference for [environment from Q3]..."

## Red Flags to Avoid
NEVER recommend careers that:
- Only match capability_traps (high skill, low interest)
- Conflict with >3 environment preferences from Q3
- Ignore the flow context from Q1

## Evidence Tracking (REQUIRED)
For each vector, include an evidence_used object showing:
- q1_insight: Quote or reference from flow description
- q2_quadrant: Which domains from zone_of_genius it connects to
- q3_preferences: Relevant environment preferences
- q4_validation: Which reputation items support this
- q5_driver: Value driver that aligns

## Rarity Assignment
- 'Rare': Common but good fit
- 'Epic': Strong niche market
- 'Legendary': Very specific/unique combination
- 'Mythical': One of a kind/Visionary path
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

### PRIMARY SIGNALS (55% weight)
**Zone of Genius** (Q2 - High Interest + High Capability):
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

**Flow State Evidence** (Q1):
"${context.primary_signals.flow_evidence}"

**External Validation** (Q4 - What people ask them for):
${JSON.stringify(context.primary_signals.external_proof, null, 2)}

### SECONDARY SIGNALS (35% weight)
**Environment Preferences** (Q3):
${JSON.stringify(context.secondary_signals.environment, null, 2)}

**Value Drivers** (Q5):
Story: "${context.secondary_signals.values.story}"
Tags: ${JSON.stringify(context.secondary_signals.values.drivers)}

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
          energizers: z.array(z.string()),
          strengths: z.array(z.string()),
          values: z.array(z.string()),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
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

    const prompt = `
${SYSTEM_PROMPT}

Language: ${language === 'th' ? 'Thai' : 'English'}
All output values MUST be in ${language === 'th' ? 'Thai' : 'English'}.

## Student Profile Context (Weighted Data)

### PRIMARY SIGNALS (55% weight)
**Zone of Genius** (Q2 - High Interest + High Capability):
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

**Flow State Evidence** (Q1):
"${context.primary_signals.flow_evidence}"

**External Validation** (Q4 - What people ask them for):
${JSON.stringify(context.primary_signals.external_proof, null, 2)}

### SECONDARY SIGNALS (35% weight)
**Environment Preferences** (Q3):
${JSON.stringify(context.secondary_signals.environment, null, 2)}

**Value Drivers** (Q5):
Story: "${context.secondary_signals.values.story}"
Tags: ${JSON.stringify(context.secondary_signals.values.drivers)}

**Unique Edge** (Q6):
"${context.secondary_signals.unique_edge}"

### GROWTH EDGES (10% weight - stretch opportunities)
${JSON.stringify(context.growth_edges, null, 2)}

### CAPABILITY TRAPS (AVOID)
${JSON.stringify(context.capability_traps, null, 2)}

### Conversation History
${JSON.stringify(history, null, 2)}

---
Generate the CORE profile (Profile + 3 Vectors). Include evidence_used for each vector.
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profile: z.object({
          energizers: z.array(z.string()),
          strengths: z.array(z.string()),
          values: z.array(z.string()),
          reality: z.array(z.string()),
        }),
        vectors: z.array(z.object({
          name: z.string(),
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
