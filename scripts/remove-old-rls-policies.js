#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
    console.log('🔧 Fixing RLS Policies - Removing Conflicting Policies...\n');

    const client = new Client({
        host: '127.0.0.1',
        port: 54322,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Drop all old conflicting policies
        console.log('📝 Dropping old conflicting policies...');

        const policiesToDrop = [
            'assessment_groups_select',
            'assessment_groups_insert',
            'assessment_groups_delete',
            'assessment_groups_modify',
            'assessment_group_members_select',
            'assessment_group_members_insert',
            'assessment_group_members_delete',
        ];

        for (const policy of policiesToDrop) {
            try {
                await client.query(`DROP POLICY IF EXISTS "${policy}" ON public.assessment_groups`);
                console.log(`   ✓ Dropped ${policy} from assessment_groups (if existed)`);
            } catch (err) {
                // Ignore errors for policies that don't exist
            }

            try {
                await client.query(`DROP POLICY IF EXISTS "${policy}" ON public.assessment_group_members`);
                console.log(`   ✓ Dropped ${policy} from assessment_group_members (if existed)`);
            } catch (err) {
                // Ignore errors for policies that don't exist
            }
        }

        console.log('\n✅ Old policies removed!');
        console.log('✅ The new comprehensive policies should now work correctly.');
        console.log('🔄 Please refresh your application.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
