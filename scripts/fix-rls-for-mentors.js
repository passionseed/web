#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
    console.log('🔧 Fixing RLS Policies for Mentors...\n');

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

        // Drop existing policies
        console.log('📝 Dropping existing policies...');
        await client.query(`
      DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;
      DROP POLICY IF EXISTS "assessment_group_members_access" ON public.assessment_group_members;
    `);
        console.log('✅ Existing policies dropped\n');

        // Create new policy for assessment_groups that includes mentors
        console.log('📝 Creating new assessment_groups_access policy (with mentor support)...');
        await client.query(`
      CREATE POLICY "assessment_groups_access" ON public.assessment_groups
          FOR ALL
          USING (
              -- Allow access for classroom maps
              EXISTS (
                  SELECT 1 FROM public.node_assessments na
                  JOIN public.map_nodes mn ON na.node_id = mn.id
                  JOIN public.learning_maps lm ON mn.map_id = lm.id
                  JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
                  WHERE na.id = assessment_groups.assessment_id
                  AND cm.user_id = auth.uid()
                  AND lm.map_type = 'classroom_exclusive'
              )
              OR
              -- Allow access for seed maps (members)
              EXISTS (
                  SELECT 1 FROM public.node_assessments na
                  JOIN public.map_nodes mn ON na.node_id = mn.id
                  JOIN public.learning_maps lm ON mn.map_id = lm.id
                  JOIN public.seed_room_members srm ON srm.room_id = assessment_groups.seed_room_id
                  WHERE na.id = assessment_groups.assessment_id
                  AND srm.user_id = auth.uid()
                  AND lm.map_type = 'seed'
                  AND assessment_groups.seed_room_id IS NOT NULL
              )
              OR
              -- Allow access for seed maps (mentors)
              EXISTS (
                  SELECT 1 FROM public.node_assessments na
                  JOIN public.map_nodes mn ON na.node_id = mn.id
                  JOIN public.learning_maps lm ON mn.map_id = lm.id
                  JOIN public.seed_rooms sr ON sr.id = assessment_groups.seed_room_id
                  WHERE na.id = assessment_groups.assessment_id
                  AND sr.mentor_id = auth.uid()
                  AND lm.map_type = 'seed'
                  AND assessment_groups.seed_room_id IS NOT NULL
              )
          );
    `);
        console.log('✅ assessment_groups_access policy created\n');

        // Create new policy for assessment_group_members that includes mentors
        console.log('📝 Creating new assessment_group_members_access policy (with mentor support)...');
        await client.query(`
      CREATE POLICY "assessment_group_members_access" ON public.assessment_group_members
          FOR ALL
          USING (
              -- Allow access for classroom maps
              EXISTS (
                  SELECT 1 FROM public.assessment_groups ag
                  JOIN public.node_assessments na ON ag.assessment_id = na.id
                  JOIN public.map_nodes mn ON na.node_id = mn.id
                  JOIN public.learning_maps lm ON mn.map_id = lm.id
                  JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
                  WHERE ag.id = assessment_group_members.group_id
                  AND cm.user_id = auth.uid()
                  AND lm.map_type = 'classroom_exclusive'
              )
              OR
              -- Allow access for seed maps (members)
              EXISTS (
                  SELECT 1 FROM public.assessment_groups ag
                  JOIN public.seed_room_members srm ON srm.room_id = ag.seed_room_id
                  WHERE ag.id = assessment_group_members.group_id
                  AND srm.user_id = auth.uid()
                  AND ag.seed_room_id IS NOT NULL
              )
              OR
              -- Allow access for seed maps (mentors)
              EXISTS (
                  SELECT 1 FROM public.assessment_groups ag
                  JOIN public.seed_rooms sr ON sr.id = ag.seed_room_id
                  WHERE ag.id = assessment_group_members.group_id
                  AND sr.mentor_id = auth.uid()
                  AND ag.seed_room_id IS NOT NULL
              )
          );
    `);
        console.log('✅ assessment_group_members_access policy created\n');

        console.log('✅ All policies updated with mentor support!');
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
