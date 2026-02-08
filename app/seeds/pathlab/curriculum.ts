export const PATHLAB_CURRICULUM = [
    {
        day_number: 1,
        title: "Day 0: Auto-Onboarding",
        context_text: `**Purpose:** Set expectations + remove fear

**Content**
* What startups/SMEs *actually* involve (uncertainty, decisions, tradeoffs)
* This is **not** Shark Tank, coding, or “be your own boss”
* Explicit permission to quit

**Prompt**
> “After this week, we care more about what you learned about yourself than the idea.”`,
        reflection_prompts: [
            "Why are you trying this path?",
            "Confidence level: Business interest (1–5)"
        ],
        node_ids: []
    },
    {
        day_number: 2,
        title: "Day 1: Spot a Real Problem",
        context_text: `**Goal:** Can they tolerate ambiguity?

**Task**
* List **3 real problems** from:
  * school life
  * family business
  * local shops
* Choose **ONE** to explore

**Guidance**
* Problems ≠ ideas
* Annoying, repetitive, costly

**Deliverable**
* Problem statement (2–3 sentences)

**Quit signal**
* “I don’t know what problem to pick”
* “This feels vague / uncomfortable”`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 3,
        title: "Day 2: Who Cares & Why",
        context_text: `**Goal:** Empathy + logic

**Task**
* Who has this problem?
* When does it happen?
* What do they do today instead?

**Deliverable**
* Simple customer profile
* “Worst moment” description

**Self-check**
> “Does this problem feel interesting to think about for 30 minutes?”`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 4,
        title: "Day 3: Solution & Reality Check (Core Exposure)",
        context_text: `**THIS IS THE KEY DAY**

**Task**
* Describe a simple solution (no tech)
* How does it help better than current options?
* One reason it might fail

**Deliverable**
* 1-page solution explanation OR voice note

**Completion threshold**
* Finishing Day 3 = **Completed Trial**

If they quit **after this**, that’s still a win.`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 5,
        title: "Day 4: Money & Tradeoffs",
        context_text: `**Goal:** Remove fantasy

**Task**
* Would someone pay?
* How much?
* What would you need to give up to pursue this?

**Prompt**
> “If this were your life for 6 months, how would it feel?”

**Quit signal**
* Strong emotional drain
* Clear disinterest after realism`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 6,
        title: "Day 5: Reflection & Direction",
        context_text: `**No pitching. No grading.**

**Output**
* Direction result:
  * 👍 Continue exploring business
  * 🤔 Try another path
  * ❌ Business is not for me (valuable)`,
        reflection_prompts: [
            "Which day felt most energizing?",
            "Which day felt draining?",
            "More interested, less interested, or unsure?",
            "Would you try another business-like path again?"
        ],
        node_ids: []
    }
];
