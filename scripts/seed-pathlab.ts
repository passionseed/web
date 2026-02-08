
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });

// We use hardcoded values for seeding if we can't easily import from the app
const PATHLAB_CURRICULUM = [
    {
        day_number: 1,
        title: "Day 0: Auto-Onboarding",
        context_text: `**Purpose:** Set expectations + remove fear\n\n**Content**\n* What startups/SMEs *actually* involve (uncertainty, decisions, tradeoffs)\n* This is **not** Shark Tank, coding, or “be your own boss”\n* Explicit permission to quit\n\n**Prompt**\n> “After this week, we care more about what you learned about yourself than the idea.”`,
        reflection_prompts: [
            "Why are you trying this path?",
            "Confidence level: Business interest (1–5)"
        ],
        node_ids: []
    },
    {
        day_number: 2,
        title: "Day 1: Spot a Real Problem",
        context_text: `**Goal:** Can they tolerate ambiguity?\n\n**Task**\n* List **3 real problems** from:\n  * school life\n  * family business\n  * local shops\n* Choose **ONE** to explore\n\n**Guidance**\n* Problems ≠ ideas\n* Annoying, repetitive, costly\n\n**Deliverable**\n* Problem statement (2–3 sentences)\n\n**Quit signal**\n* “I don’t know what problem to pick”\n* “This feels vague / uncomfortable”`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 3,
        title: "Day 2: Who Cares & Why",
        context_text: `**Goal:** Empathy + logic\n\n**Task**\n* Who has this problem?\n* When does it happen?\n* What do they do today instead?\n\n**Deliverable**\n* Simple customer profile\n* “Worst moment” description\n\n**Self-check**\n> “Does this problem feel interesting to think about for 30 minutes?”`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 4,
        title: "Day 3: Solution & Reality Check (Core Exposure)",
        context_text: `**THIS IS THE KEY DAY**\n\n**Task**\n* Describe a simple solution (no tech)\n* How does it help better than current options?\n* One reason it might fail\n\n**Deliverable**\n* 1-page solution explanation OR voice note\n\n**Completion threshold**\n* Finishing Day 3 = **Completed Trial**\n\nIf they quit **after this**, that’s still a win.`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 5,
        title: "Day 4: Money & Tradeoffs",
        context_text: `**Goal:** Remove fantasy\n\n**Task**\n* Would someone pay?\n* How much?\n* What would you need to give up to pursue this?\n\n**Prompt**\n> “If this were your life for 6 months, how would it feel?”\n\n**Quit signal**\n* Strong emotional drain\n* Clear disinterest after realism`,
        reflection_prompts: [],
        node_ids: []
    },
    {
        day_number: 6,
        title: "Day 5: Reflection & Direction",
        context_text: `**No pitching. No grading.**\n\n**Output**\n* Direction result:\n  * 👍 Continue exploring business\n  * 🤔 Try another path\n  * ❌ Business is not for me (valuable)`,
        reflection_prompts: [
            "Which day felt most energizing?",
            "Which day felt draining?",
            "More interested, less interested, or unsure?",
            "Would you try another business-like path again?"
        ],
        node_ids: []
    }
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const CATEGORY_ID = '21576490-c1bd-4a40-8b64-09f761cc56ce'; // Course

async function seed() {
    console.log('🌱 Seeding PathLab: Mindset: Entrepreneurship...');

    // 1. Create a blank learning map
    const { data: map, error: mapError } = await supabase
        .from('learning_maps')
        .insert({
            title: 'PathLab: Entrepreneurship Map',
            description: 'Solo exploration map for PathLab',
            creator_id: ADMIN_ID,
            map_type: 'seed',
            visibility: 'public'
        })
        .select()
        .single();

    if (mapError) {
        console.error('Error creating map:', mapError);
        return;
    }
    console.log('✅ Created learning map:', map.id);

    // 2. Create the seed
    const { data: seed, error: seedError } = await supabase
        .from('seeds')
        .insert({
            title: 'Mindset: Entrepreneurship',
            slogan: 'Discover if building a business fits how you think.',
            description: 'A 6-day solo exploration into the world of startups and SMEs. No grades, no groups, just real decisions.',
            map_id: map.id,
            created_by: ADMIN_ID,
            category_id: CATEGORY_ID,
            seed_type: 'pathlab'
        })
        .select()
        .single();

    if (seedError) {
        console.error('Error creating seed:', seedError);
        return;
    }
    console.log('✅ Created seed:', seed.id);

    // 3. Create path config
    const { data: path, error: pathError } = await supabase
        .from('paths')
        .insert({
            seed_id: seed.id,
            total_days: 6,
            created_by: ADMIN_ID
        })
        .select()
        .single();

    if (pathError) {
        console.error('Error creating path:', pathError);
        return;
    }
    console.log('✅ Created path config:', path.id);

    // 4. Create path days
    const daysToInsert = PATHLAB_CURRICULUM.map(day => ({
        path_id: path.id,
        day_number: day.day_number,
        context_text: day.context_text,
        reflection_prompts: day.reflection_prompts,
        node_ids: day.node_ids
    }));

    const { error: daysError } = await supabase
        .from('path_days')
        .insert(daysToInsert);

    if (daysError) {
        console.error('Error creating path days:', daysError);
        return;
    }
    console.log('✅ Created 6 path days');

    console.log('\n🚀 PathLab seeding complete!');
    console.log(`Explore it at: /seeds/${seed.id}`);
}

seed().catch(console.error);
