# Direction Finder: Detailed Question Analysis

This document details every question in the **Direction Finder** flow, identifying its specific goal and explaining how the AI Advisor utilizes the data to generate the final **Direction Profile**.

## 1. Interest Scan (Ikigai: What you Love)

### **Q1: "Time Flies When..."**

- **Question Text**: "Select your top activities (1-3)"
- **Options**: Creating, Helping, Competing, Deep Learning, Organizing, Performing, Solving, Leading, Analyzing, Exploring.
- **Goal**: To identify the student's **Core Interests** and intrinsic motivators. This corresponds to the "What you Love" circle of Ikigai. It specifically looks for activities that induce state of flow.
- **AI Usage**:
  - **Profile Generation**: Populates the `energizers` section of the profile.
  - **Vector Matching**: Used to align "Interest Alignment" in the `fit_reason`. For example, if a student selects "Helping" and "Analyzing", the AI might suggest "Clinical Psychology" or "UX Research".

### **Q2: "Energy Check"**

- **Question Text**: "Which give you ENERGY? Pick 3"
- **Options**: Making things with hands, Ideas/Concepts, Collaborating with people, Systems/Data, Creative expression, Physical activity, Leading/Teaching.
- **Goal**: To perform an **Energy Audit**. Differentiating between what a student _can_ do vs. what actually _energizes_ them prevents burnout-prone career suggestions.
- **AI Usage**:
  - **Filtering**: The AI uses this to filter out mismatched roles. For example, if "People" is NOT selected, the AI will avoid high-social-contact roles like Sales or HR, even if other skills match.
  - **Context**: Adds nuance to the `passion_context` in the final result (e.g., "You light up when working with big ideas...").

### **Q3: "Work Style"**

- **Question Text**: "Click to show your preference" (Binary choice pairs)
- **Pairs**: Indoor/Outdoor, Structured/Flexible, Solo/Team, Hands-on/Theory, Routine/Challenge.
- **Goal**: To determine the ideal **Working Environment** and organizational fit.
- **AI Usage**:
  - **Role Refinement**: Differentiates between similar roles.
    - _Example_: A "Writer" who likes "Team/Flexible" might get "Content Strategist (Agency)". A "Writer" who likes "Solo/Structured" might get "Technical Writer".

## 2. Skill Mapping (Ikigai: What you are Good At)

### **Q4: "Subject Love & Capability" (The Skill/Will Matrix)**

- **Question Text**: "For subjects you like, rate how much you LOVE it vs how CAPABLE you are."
- **Goal**: To identify the **Zone of Genius**.
  - _High Love / High Skill_: Core Career Direction.
  - _High Love / Low Skill_: Growth Potential / Hobby.
  - _Low Love / High Skill_: The "Trap" (Competent but bored) - _AI explicitly avoids recommending these as primary paths._
- **AI Usage**:
  - **Faculty Recommendation**: Directly maps to `recommended_faculty` outputs (e.g., High Math/Physics -> Engineering).
  - **Constraint Checking**: Ensures recommendations are realistic based on self-reported capability.

### **Q6: "Strongest Skills"**

- **Question Text**: "Select your top 5 strengths"
- **Options**: A mix of hard skills (Coding, Visual Design) and soft skills (Empathy, Pattern Spotting, Public Speaking).
- **Goal**: To identify functional **Competencies**.
- **AI Usage**:
  - **Profile Generation**: Populates the `strengths` section.
  - **Differentiators**: Fill the `skill_tree` section of the `vectors`. The AI looks for unique combinations (e.g., "Coding" + "Empathy" -> "Product Management" or "EdTech Developer").

### **Q9: "What People Ask For" (Social Proof)**

- **Question Text**: "What do others ask you for help with?"
- **Options**: Tech help, Emotional support, Creative ideas, etc.
- **Goal**: To validate internal perceptions with **External Reality**. Often students undervalue skills that come easily to them; this question highlights "unconscious competence."
- **AI Usage**:
  - **Validation**: Increases the confidence score (`match_scores`) of related vectors. If a user thinks they aren't creative but everyone asks them for ideas, the AI might gently probe this discrepancy in the chat or weigh the "Creative" potential higher.

## 3. Deep Dive & Qualitative (The "Why")

### **Q5: "Flow State Memory"**

- **Question Text**: "Describe the last time you were so absorbed you lost track of time..." (Free Text)
- **Goal**: To get qualitative data that checkboxes miss. It reveals the _context_ of motivation.
- **AI Usage**:
  - **Chat Starter**: The AI Advisor often uses this answer to break the ice in the `ai_chat` phase (e.g., "You mentioned you lost track of time editing a video. Was it the storytelling or the technical side that hooked you?").
  - **First Step**: Helps generate the specific `first_step` in the prediction vector (e.g., "Edit a 1-minute video about [Topic]").

### **Q7: "Proud Moments"**

- **Question Text**: "What have you accomplished that made you proud?"
- **Goal**: To identify **Achievement Drivers**. Does the student value "Winning" (Competition), "Helping" (Altruism), or "Building" (Creation)?
- **AI Usage**:
  - **Value Alignment**: Populates the `values` section of the profile.
  - **Resilience Check**: Answers like "Stuck with something long-term" indicate high grit, allowing the AI to suggest steeper learning curves (e.g., Medicine, Architecture).

### **Q8: "Learning Style"**

- **Question Text**: "How do you learn best?"
- **Options**: Reading, Videos, Doing, Mentoring, etc.
- **Goal**: To customize the **Action Plan**.
- **AI Usage**:
  - **Exploration Steps**: Tailors the `exploration_steps` in the final result.
    - _Visual Learner_: "Watch this YouTube crash course."
    - _Hands-on_: "Build a small prototype."
    - _Social_: "Interview a professional in this field."

## 4. Synthesis & Validaton

### **Q10: "Fast Learner Moment"**

- **Question Text**: "Is there something you picked up way faster than others?"
- **Goal**: To identify **High Plasticity** areas (Natural Talent).
- **AI Usage**:
  - **Rarity Score**: If a rare skill was learned quickly, the AI might assign a higher `rarity` badge (e.g., "Legendary") to that profile vector.

### **Q13: "Recognition Pattern"**

- **Question Text**: "What do people often compliment you on?"
- **Goal**: To verify **Self-Perception** vs **External Perception**.
- **AI Usage**:
  - **Confidence Boost**: Used in the chat to encourage the student. "You mentioned people praise your calmness. That is a superpower in [Suggested Career]."

## 5. The AI Overlay ( `AIConversation.tsx` )

After the questionnaire, the AI Chat (`AIConversation`) acts as the **Connector**.

- **Input**: Receives the full JSON object of all answers above.
- **Process**:
  1.  **Gap Analysis**: It looks for inconsistencies (e.g., "Loves Math" but "Hates Systems").
  2.  **Probing**: It asks clarifying questions to resolve these gaps.
  3.  **Synthesis**: It generates the 3 `vectors` (Career Directions) by combining specific data points:
      - _Vector Interest_ = Q1 + Q5
      - _Vector Strength_ = Q6 + Q10
      - _Vector Vibe/Culture_ = Q2 + Q3
- **Output**: The final prompts (`generateDirectionProfile` in `directionProfileEngine.ts`) explicitly require the AI to map these inputs to:
  - `fit_reason`: "Why this fits" (uses Q1, Q4, Q6).
  - `match_scores`: Calculated quantitative match based on the density of supporting evidence from the questions.
