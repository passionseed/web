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

## Exploration Steps & Skill Tree Requirements
For EACH career vector, you MUST provide:
1. **Exploration Steps**: At least 5-7 concrete, actionable steps covering different types:
   - At least 1 project to build/create
   - At least 1 study resource (book, course, article)
   - At least 1 activity to try
   - At least 1 community to join
   - At least 1 person to talk to or shadow
   Each step should be specific, realistic, and achievable.

2. **Skill Tree**: A structured learning path with 3 levels (beginner → intermediate → advanced):
   - Beginner: 3-4 foundational skills they can start learning now
   - Intermediate: 3-4 skills that build on beginner level (with clear prerequisites)
   - Advanced: 2-3 specialized skills that complete the career path
   Each skill needs: name, clear description, realistic time estimate, and prerequisites.
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

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}
Do NOT mix languages. Be consistent throughout the entire response.

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

**EXPLORATION STEPS (REQUIRED - NEVER OMIT):**
For EVERY career vector, you MUST provide exploration_steps array with 5-7 items:
- At least 1 PROJECT: Something they can build/create (be specific, not generic)
- At least 1 STUDY resource: Book, online course, YouTube channel, or article (with specific names when possible)
- At least 1 ACTIVITY: Workshop, event, or hands-on experience to try
- At least 1 COMMUNITY: Online forum, Discord server, local group, or club to join
- At least 1 PERSON: Type of professional to talk to, shadow, or learn from (e.g., "Talk to a UX designer at a startup")
Make each step specific, actionable, and achievable for a high school/college student.
If you cannot think of steps, provide an empty array []. NEVER omit this field.

**SKILL TREE (REQUIRED - NEVER OMIT):**
For EVERY career vector, you MUST provide skill_tree object with ALL THREE levels:
- beginner_level: Array of 3-4 foundational skills (or empty array [] if none)
- intermediate_level: Array of 3-4 intermediate skills (or empty array [] if none)
  - MUST include prerequisites array (use beginner skill names, or [] if independent)
- advanced_level: Array of 2-3 advanced skills (or empty array [] if none)
  - MUST include prerequisites array (use intermediate skill names, or [] if independent)
Each skill object MUST have: skill_name, description, time_estimate, and prerequisites (for intermediate/advanced).
NEVER omit skill_tree, beginner_level, intermediate_level, or advanced_level. Always provide the structure even if empty.

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
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          match_scores: z.object({
            overall: z.number().describe('Overall match score from 0-100'),
            passion: z.number().describe('Passion alignment score from 0-100'),
            skill: z.number().describe('Skill alignment score from 0-100'),
          }),
          exploration_steps: z.array(z.object({
            type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']).describe('Type of exploration step'),
            description: z.string().describe('Specific, actionable description of the step'),
          })).describe('5-7 exploration steps covering different types (project, study, activity, community, person) - use empty array if none'),
          skill_tree: z.object({
            beginner_level: z.array(z.object({
              skill_name: z.string(),
              description: z.string(),
              time_estimate: z.string().describe('e.g., "2-3 weeks", "1 month"'),
            })).describe('3-4 foundational skills - use empty array if none'),
            intermediate_level: z.array(z.object({
              skill_name: z.string(),
              description: z.string(),
              time_estimate: z.string(),
              prerequisites: z.array(z.string()).describe('Skills from beginner level needed first (use empty array if none)'),
            })).describe('3-4 intermediate skills building on beginner - use empty array if none'),
            advanced_level: z.array(z.object({
              skill_name: z.string(),
              description: z.string(),
              time_estimate: z.string(),
              prerequisites: z.array(z.string()).describe('Skills from intermediate level needed first (use empty array if none)'),
            })).describe('2-3 advanced specialized skills - use empty array if none'),
          }).describe('Structured learning path from beginner to advanced'),
          first_step: z.string(),
        })),
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']).describe('Match level: High, Good, or Stretch'),
          match_percentage: z.number().describe('Match percentage from 0-100'),
          reason: z.string(),
        })),
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return {
      ...(object as any),
      debugMetadata: {
        modelId: modelName,
        prompt,
        engine: "generateDirectionProfile",
      },
    };
  } catch (error) {
    console.error("Error generating direction profile:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      // @ts-ignore - check if it's a zod validation error
      if (error.cause) {
        console.error("Error cause:", JSON.stringify(error.cause, null, 2));
      }
    }
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

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}
Do NOT mix languages. Be consistent throughout the entire response.

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

**EXPLORATION STEPS (REQUIRED - NEVER OMIT):**
For EVERY career vector, you MUST provide exploration_steps array with 5-7 items:
- At least 1 PROJECT: Something they can build/create (be specific, not generic)
- At least 1 STUDY resource: Book, online course, YouTube channel, or article (with specific names when possible)
- At least 1 ACTIVITY: Workshop, event, or hands-on experience to try
- At least 1 COMMUNITY: Online forum, Discord server, local group, or club to join
- At least 1 PERSON: Type of professional to talk to, shadow, or learn from (e.g., "Talk to a UX designer at a startup")
Make each step specific, actionable, and achievable for a high school/college student.
If you cannot think of steps, provide an empty array []. NEVER omit this field.

**SKILL TREE (REQUIRED - NEVER OMIT):**
For EVERY career vector, you MUST provide skill_tree object with ALL THREE levels:
- beginner_level: Array of 3-4 foundational skills (or empty array [] if none)
- intermediate_level: Array of 3-4 intermediate skills (or empty array [] if none)
  - MUST include prerequisites array (use beginner skill names, or [] if independent)
- advanced_level: Array of 2-3 advanced skills (or empty array [] if none)
  - MUST include prerequisites array (use intermediate skill names, or [] if independent)
Each skill object MUST have: skill_name, description, time_estimate, and prerequisites (for intermediate/advanced).
NEVER omit skill_tree, beginner_level, intermediate_level, or advanced_level. Always provide the structure even if empty.
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
          fit_reason: z.object({
            interest_alignment: z.string(),
            strength_alignment: z.string(),
            value_alignment: z.string(),
          }),
          match_scores: z.object({
            overall: z.number().describe('Overall match score from 0-100'),
            passion: z.number().describe('Passion alignment score from 0-100'),
            skill: z.number().describe('Skill alignment score from 0-100'),
          }),
          first_step: z.string(),
        })),
      }),
      prompt,
    });

    return {
      ...(object as any),
      debugMetadata: {
        modelId: modelName,
        prompt,
        engine: "generateDirectionProfileCore",
      },
    };
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

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}
Do NOT mix languages. Be consistent throughout the entire response.

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
          match_percentage: z.number().describe('Match percentage from 0-100'),
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

    return {
      ...(object as any),
      debugMetadata: {
        modelId: modelName,
        prompt,
        engine: "generateDirectionProfileDetails",
      },
    };
  } catch (error) {
    console.error("Error generating profile details:", error);
    throw error;
  }
}

// ==========================================
// PROGRAMS GENERATION (Step 2 - Split for timeout safety)
// ==========================================

export async function generatePrograms(
  coreResult: Partial<DirectionFinderResult>,
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<{ programs: DirectionFinderResult['programs'] }> {
  try {
    const context = buildProfileContext(answers);

    const prompt = `
Based on the student's Core Direction Vectors, generate 2-3 recommended programs/faculties.

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}
Do NOT mix languages. Be consistent throughout the entire response.

Core Vectors Identified:
${JSON.stringify(coreResult.vectors, null, 2)}

Student's Zone of Genius Domains:
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

Student's Environment Preferences:
${JSON.stringify(context.secondary_signals.environment, null, 2)}

---
Generate 2-3 recommended university programs or faculties that match the career vectors.
Include match level (High/Good/Stretch), match percentage, and reasoning.
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        programs: z.array(z.object({
          name: z.string(),
          match_level: z.enum(['High', 'Good', 'Stretch']).describe('Match level: High, Good, or Stretch'),
          match_percentage: z.number().describe('Match percentage from 0-100'),
          reason: z.string(),
        })),
      }),
      prompt,
    });

    return {
      ...(object as any),
      debugMetadata: {
        modelId: modelName,
        prompt,
        engine: "generatePrograms",
      },
    };
  } catch (error) {
    console.error("Error generating programs:", error);
    throw error;
  }
}

// ==========================================
// COMMITMENTS GENERATION (Step 3 - Split for timeout safety)
// ==========================================

export async function generateCommitments(
  coreResult: Partial<DirectionFinderResult>,
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<{ commitments: DirectionFinderResult['commitments'] }> {
  try {
    const context = buildProfileContext(answers);

    const prompt = `
Based on the student's Core Direction Vectors, generate actionable commitments (weekly and monthly).

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}
Do NOT mix languages. Be consistent throughout the entire response.

Core Vectors Identified:
${JSON.stringify(coreResult.vectors, null, 2)}

Student's Zone of Genius:
${JSON.stringify(context.primary_signals.zone_of_genius, null, 2)}

---
Generate:
- 2-3 commitments for this week (specific, actionable, small)
- 2-3 commitments for this month (larger milestones)
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        commitments: z.object({
          this_week: z.array(z.string()),
          this_month: z.array(z.string()),
        }),
      }),
      prompt,
    });

    return {
      ...(object as any),
      debugMetadata: {
        modelId: modelName,
        prompt,
        engine: "generateCommitments",
      },
    };
  } catch (error) {
    console.error("Error generating commitments:", error);
    throw error;
  }
}

// ==========================================
// VECTOR DETAILS GENERATION (Split for timeout safety)
// ==========================================

export async function generateVectorDetails(
  vector: { name: string; industry: string; role: string; specialization: string },
  answers: AssessmentAnswers,
  modelName?: string,
  language: 'en' | 'th' = 'en'
): Promise<{ exploration_steps: any[]; skill_tree: any }> {
  try {
    const context = buildProfileContext(answers);

    const prompt = `
Generate detailed exploration steps and a skill tree for the following career vector.

## LANGUAGE REQUIREMENT (CRITICAL)
Output Language: ${language === 'th' ? '**ภาษาไทย (Thai)**' : '**English**'}
${language === 'th'
        ? 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in THAI language only.'
        : 'ALL fields including names, descriptions, insights, exploration steps, skill names, and skill descriptions MUST be in ENGLISH language only.'}

## Target Career Vector:
- Name: ${vector.name}
- Industry: ${vector.industry}
- Role: ${vector.role}
- Specialization: ${vector.specialization}

## Student Context:
- Zone of Genius: ${JSON.stringify(context.primary_signals.zone_of_genius)}
- Flow Evidence: "${context.primary_signals.flow_evidence}"

---
**EXPLORATION STEPS (REQUIRED):**
Provide 5-7 concrete, actionable steps:
- At least 1 PROJECT (specific build/create)
- At least 1 STUDY resource (named book/course)
- At least 1 ACTIVITY (hands-on)
- At least 1 COMMUNITY (where to join)
- At least 1 PERSON (who to talk to)

**SKILL TREE (REQUIRED):**
A structured path (Beginner -> Intermediate -> Advanced).
- Beginner: 3-4 foundational
- Intermediate: 3-4 (with prerequisites)
- Advanced: 2-3 (with prerequisites)
`;

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        exploration_steps: z.array(z.object({
          type: z.enum(['project', 'study', 'activity', 'community', 'camp', 'person']),
          description: z.string(),
        })),
        skill_tree: z.object({
          beginner_level: z.array(z.object({
            skill_name: z.string(),
            description: z.string(),
            time_estimate: z.string(),
          })),
          intermediate_level: z.array(z.object({
            skill_name: z.string(),
            description: z.string(),
            time_estimate: z.string(),
            prerequisites: z.array(z.string()),
          })),
          advanced_level: z.array(z.object({
            skill_name: z.string(),
            description: z.string(),
            time_estimate: z.string(),
            prerequisites: z.array(z.string()),
          })),
        }),
      }),
      prompt,
    });

    return object as any;
  } catch (error) {
    console.error("Error generating vector details:", error);
    throw error;
  }
}
