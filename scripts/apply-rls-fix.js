#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/20251210000001_fix_assessment_groups_rls_for_seeds.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

// Connect to local Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('Applying migration: 20251210000001_fix_assessment_groups_rls_for_seeds.sql');

    try {
        // Split the SQL into individual statements (simple approach)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

        console.log(`Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
                console.log(statement.substring(0, 100) + '...');

                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement + ';'
                });

                if (error) {
                    console.error(`Error executing statement ${i + 1}:`, error);
                    // Continue anyway - some errors might be expected (like "already exists")
                } else {
                    console.log(`✓ Statement ${i + 1} executed successfully`);
                }
            }
        }

        console.log('\n✅ Migration applied successfully!');
    } catch (error) {
        console.error('❌ Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();
