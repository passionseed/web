
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const USERS = [
    { full_name: 'Sattakun', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sattakun' },
    { full_name: 'Naruto', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naruto' },
    { full_name: 'Sasuke', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sasuke' },
    { full_name: 'Sakura', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sakura' },
    { full_name: 'Kakashi', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kakashi' },
];

async function seed() {
    // Dynamic import to ensure env vars are loaded first
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();

    console.log('🌱 Seeding focus graph data...');
    const today = new Date();

    for (const user of USERS) {
        console.log(`Creating user: ${user.full_name}`);

        // Create auth user (fake email)
        const email = `${user.full_name.toLowerCase()}@example.com`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: user.full_name, avatar_url: user.avatar_url }
        });

        // If user exists, we need their ID to proceed with seeding sessions
        let userId = authData.user?.id;

        if (authError) {
            console.warn(`User ${email} might already exist:`, authError.message);
            // Attempt to fetch existing user if not returned
            // Admin API doesn't have easy "getUserByEmail" without listUsers
            // We can try to upsert profile logic if we knew the ID, but we don't know ID easily without listing.
            // Let's list users to find ID.
            if (!userId) {
                const { data: users } = await supabase.auth.admin.listUsers();
                const existing = users?.users.find(u => u.email === email);
                if (existing) userId = existing.id;
            }
        }

        if (!userId) {
            console.error(`Skipping ${user.full_name} - could not get User ID`);
            continue;
        }

        // Upsert Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            full_name: user.full_name,
            username: user.full_name.toLowerCase(),
            avatar_url: user.avatar_url,
            updated_at: new Date().toISOString()
        });

        if (profileError) console.error('Profile upsert error:', profileError);

        // Create Focus Sessions for last 7 days
        const sessions = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Random number of sessions per day (0-3)
            const numSessions = Math.floor(Math.random() * 4);

            for (let j = 0; j < numSessions; j++) {
                // Random duration 15-120 mins
                const duration = 15 + Math.floor(Math.random() * 105);
                // Random time of day
                date.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

                sessions.push({
                    user_id: userId,
                    duration_minutes: duration,
                    created_at: date.toISOString(),
                    task_id: null // optional
                });
            }
        }

        if (sessions.length > 0) {
            const { error: sessionError } = await supabase.from('ps_focus_sessions').insert(sessions);
            if (sessionError) console.error('Session insert error:', sessionError);
            else console.log(`  Added ${sessions.length} sessions for ${user.full_name}`);
        }
    }

    console.log('✅ Seeding complete!');
}

seed().catch(console.error);
