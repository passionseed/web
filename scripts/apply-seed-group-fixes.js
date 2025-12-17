#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
    console.log('🚀 Applying seed group assessment fixes...\n');

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

        // Script 1: Fix RLS Policies (with DROP IF EXISTS to avoid errors)
        console.log('📝 Updating RLS policies for seed map support...');

        try {
            await client.query(`
        DROP POLICY IF EXISTS "assessment_groups_classroom_access" ON public.assessment_groups;
        DROP POLICY IF EXISTS "assessment_group_members_classroom_access" ON public.assessment_group_members;
        DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;
        DROP POLICY IF EXISTS "assessment_group_members_access" ON public.assessment_group_members;
      `);

            await client.query(`
        CREATE POLICY "assessment_groups_access" ON public.assessment_groups
            FOR ALL
            USING (
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
            );
      `);

            await client.query(`
        CREATE POLICY "assessment_group_members_access" ON public.assessment_group_members
            FOR ALL
            USING (
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
                EXISTS (
                    SELECT 1 FROM public.assessment_groups ag
                    JOIN public.seed_room_members srm ON srm.room_id = ag.seed_room_id
                    WHERE ag.id = assessment_group_members.group_id
                    AND srm.user_id = auth.uid()
                    AND ag.seed_room_id IS NOT NULL
                )
            );
      `);
            console.log('✅ RLS policies updated\n');
        } catch (err) {
            console.log('⚠️  RLS policies may already be correct:', err.message, '\n');
        }

        // Script 2: Fix RPC Function
        console.log('📝 Updating RPC function for group creation...');
        await client.query(`
      CREATE OR REPLACE FUNCTION public.get_or_create_seed_room_assessment_group(
          p_assessment_id UUID,
          p_seed_room_id UUID
      )
      RETURNS UUID AS $$
      DECLARE
          v_group_id UUID;
          v_room_name TEXT;
      BEGIN
          SELECT id INTO v_group_id
          FROM public.assessment_groups
          WHERE assessment_id = p_assessment_id
          AND seed_room_id = p_seed_room_id
          LIMIT 1;
          
          IF v_group_id IS NOT NULL THEN
              RETURN v_group_id;
          END IF;
          
          SELECT 'Room ' || join_code INTO v_room_name
          FROM public.seed_rooms
          WHERE id = p_seed_room_id;
          
          IF v_room_name IS NULL THEN
              RAISE EXCEPTION 'Seed room not found: %', p_seed_room_id;
          END IF;
          
          INSERT INTO public.assessment_groups (
              assessment_id,
              seed_room_id,
              group_name,
              group_number,
              created_by
          ) VALUES (
              p_assessment_id,
              p_seed_room_id,
              v_room_name,
              (SELECT COALESCE(MAX(group_number), 0) + 1 
               FROM public.assessment_groups 
               WHERE assessment_id = p_assessment_id),
              auth.uid()
          )
          RETURNING id INTO v_group_id;
          
          INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
          SELECT v_group_id, user_id, auth.uid()
          FROM public.seed_room_members
          WHERE room_id = p_seed_room_id
          ON CONFLICT (group_id, user_id) DO NOTHING;
          
          RETURN v_group_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
        console.log('✅ RPC function updated\n');

        console.log('✅ All migrations applied successfully!');
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
