# Direction Finder: 6-Question Quiz Design

This document details the **6 focused questions** in the redesigned Direction Finder flow, their specific goals, and how the AI Advisor utilizes the data to generate the final **Direction Profile**.

---

## Overview

| #   | Question                | Purpose                       | AI Weight        |
| --- | ----------------------- | ----------------------------- | ---------------- |
| Q1  | Energy & Flow Discovery | Identify intrinsic motivators | 25% (Primary)    |
| Q2  | Zone Grid               | Map interest vs capability    | 30% (Primary)    |
| Q3  | Work Style              | Environment preferences       | 15% (Secondary)  |
| Q4  | Reputation              | External validation           | 20% (Primary)    |
| Q5  | Proud Moment            | Value drivers                 | 10% (Secondary)  |
| Q6  | Secret Weapon           | Unique differentiator         | Bonus Multiplier |

---

## Q1: Energy & Flow Discovery 🔥

**Question**: "Think of a time you were so absorbed in something you lost track of time. What were you doing?"

### Format

- **Free text area** (minimum 20 characters, 3-4 sentences encouraged)
- **Follow-up checkboxes**: "This activity involved..."
  - Creating/Building
  - Helping/Teaching
  - Problem Solving
  - Competing
  - Learning/Researching
  - Performing
  - Leading/Organizing
  - Analyzing

### Goal

Identify the student's **intrinsic motivators** and **flow state triggers**. This corresponds to the "What you Love" circle of Ikigai.

### Redirect Logic

```typescript
if (description.trim().length < 20) {
  redirect("/seeds");
  toast("No worries! Let's get you exploring first. Check out our camps! 🌱");
}
```

### AI Usage

- **Profile Generation**: Populates `energizers` section
- **Vector Matching**: Used in `fit_reason.interest_alignment`
- **Evidence Tracking**: AI must quote specific phrases from this answer

---

## Q2: Zone Grid 🎯

**Question**: "Pick areas you're interested in, then rate how much you ENJOY vs how CAPABLE you are"

### Format

- **Domain selector**: 18 predefined domains (Math, Art, Coding, Sports, etc.)
- **Dual sliders** per domain:
  - Interest (1-10)
  - Capability (1-10)

### Quadrant Classification

| Interest | Capability | Quadrant           | AI Action             |
| -------- | ---------- | ------------------ | --------------------- |
| ≥7       | ≥7         | Zone of Genius ⭐  | Primary career anchor |
| ≥7       | <5         | Growth Edge 🌱     | Stretch goals         |
| <4       | ≥7         | Capability Trap ⚠️ | **AVOID**             |
| else     | else       | Ignore             | Not considered        |

### Goal

Identify the **Zone of Genius** (where passion meets skill) and explicitly flag **Capability Traps** (skills without passion = burnout risk).

### AI Usage

- **Primary Signal**: 30% of match score comes from Zone of Genius alignment
- **Constraint**: AI is instructed to NEVER recommend paths matching only Capability Traps
- **Faculty Recommendation**: Directly maps to `recommended_faculty` outputs

---

## Q3: Work Style ⚙️

**Question**: "Click to show your preferences"

### Format

5 binary choice pairs (can stay neutral):
| Left | Right |
|------|-------|
| Indoor | Outdoor |
| Structured | Flexible |
| Solo | Team |
| Hands-on | Theory |
| Steady pace | Fast-paced |

### Goal

Determine ideal **working environment** and organizational culture fit.

### AI Usage

- **Role Refinement**: Differentiates between similar careers
  - Example: "Writer" → Structured+Solo = Technical Writer; Flexible+Team = Content Strategist
- **Red Flag**: AI avoids careers conflicting with 3+ preferences

---

## Q4: Reputation 💬

**Question**: "What do people often ask you for help with OR compliment you about?"

### Format

- Multi-select (pick 1-3)
- Options: Tech stuff, Creative ideas, Emotional support, Explaining things, Organizing events, Problem-solving, Making things fun, Staying calm, Spotting patterns, Design/aesthetics, Leadership, Listening

### Goal

Capture **external validation** - what skills others recognize that the student may undervalue.

### AI Usage

- **Validation Signal**: 20% of match score
- **Confidence Boost**: Used in `match_context.skill_context`
- **Chat Conversation**: AI advisor uses these to encourage the student

---

## Q5: Proud Moment 🏆

**Question**: "Describe something you accomplished that made you genuinely proud"

### Format

- **Free text** (minimum 10 characters)
- **Tag selector** (pick 1-2):
  - Helped others
  - Won or achieved
  - Built/Created something
  - Overcame difficulty
  - Learned something hard
  - Got recognized

### Goal

Identify **achievement drivers** and core **values**.

### AI Usage

- **Profile Generation**: Populates `values` section
- **Value Alignment**: Used in `fit_reason.value_alignment`
- **Resilience Check**: Tags like "Overcame difficulty" indicate high grit

---

## Q6: Secret Weapon ✨

**Question**: "Is there something unique about you - maybe you learn certain things crazy fast, or have an unusual combination of interests?"

### Format

- **Optional free text** (1-2 sentences)
- **Skip checkbox**: "I can't think of anything right now"

### Goal

Capture **differentiators** that make the student's profile unique.

### AI Usage

- **Rarity Multiplier**: If filled, can boost rarity score (Legendary → Mythical)
- **Unique Edge**: Stored in `secondary_signals.unique_edge`
- **Chat Conversation**: AI may explore this in more depth

---

## AI Profile Context Structure

```typescript
interface ProfileContext {
  primary_signals: {
    zone_of_genius: string[]; // Q2 high/high domains
    flow_evidence: string; // Q1 description
    external_proof: string[]; // Q4 selections
    weight: 0.55;
  };
  secondary_signals: {
    environment: WorkStyleData; // Q3
    values: {
      story: string; // Q5 story
      drivers: string[]; // Q5 tags
    };
    unique_edge: string; // Q6
    weight: 0.35;
  };
  growth_edges: string[]; // Q2 high-interest/low-capability
  capability_traps: string[]; // Q2 low-interest/high-capability (AVOID)
}
```

---

## Match Score Formula

For each career vector:

| Factor                   | Source | Points    |
| ------------------------ | ------ | --------- |
| Zone of Genius alignment | Q2     | 30        |
| Flow state connection    | Q1     | 15        |
| External validation      | Q4     | 10        |
| Environment fit          | Q3     | 15        |
| Value alignment          | Q5     | 10        |
| Growth potential         | Q2     | 10        |
| Unique advantage         | Q6     | +10 bonus |

**Total: 100 points** (110 with Q6 bonus)

---

## Evidence Tracking

Each generated vector includes an `evidence_used` object:

```typescript
{
  q1_insight: "When you mentioned 'editing videos for hours'...",
  q2_quadrant: "Zone of Genius: coding, art",
  q3_preferences: ["flexible", "team"],
  q4_validation: "People ask you for creative ideas",
  q5_driver: "overcame difficulty",
  q6_bonus: "Learn languages fast"
}
```

This ensures the AI explicitly connects recommendations to student input.
