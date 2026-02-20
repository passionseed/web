import { Client } from 'pg';

const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({ connectionString: dbUrl });

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        await client.query(`
      CREATE TABLE IF NOT EXISTS hackathon_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        lobby_code TEXT UNIQUE NOT NULL,
        owner_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hackathon_team_members (
        team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (team_id, participant_id)
      );

      CREATE INDEX IF NOT EXISTS idx_hackathon_team_members_participant ON hackathon_team_members(participant_id);
    `);

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
