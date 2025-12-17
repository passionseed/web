import { createClient } from "@/utils/supabase/client";
import { AssessmentGroupWithMembers } from "@/types/map";

/**
 * Gets or creates an assessment group for a seed room.
 * All members of the seed room are automatically added to the group.
 */
export async function getSeedRoomAssessmentGroup(
    assessmentId: string,
    userId: string
): Promise<AssessmentGroupWithMembers | null> {
    const supabase = createClient();

    try {
        // 1. Check if user is a mentor first
        const { data: mentorRoom, error: mentorError } = await supabase
            .from('seed_rooms')
            .select('id, join_code, status')
            .eq('mentor_id', userId)
            .in('status', ['waiting', 'active'])
            .single();

        let roomId: string | null = null;
        let roomStatus: string | null = null;

        if (mentorRoom && !mentorError) {
            // User is a mentor
            console.log('User is a mentor of seed room:', mentorRoom.id);
            roomId = mentorRoom.id;
            roomStatus = mentorRoom.status;
        } else {
            // User might be a member
            const { data: membership, error: membershipError } = await supabase
                .from('seed_room_members')
                .select(`
            room_id,
            room:seed_rooms(
              id,
              join_code,
              status
            )
          `)
                .eq('user_id', userId)
                .single();

            if (membershipError || !membership?.room_id) {
                console.log('User is not in a seed room and not a mentor');
                return null;
            }

            const room = membership.room as any;
            roomId = membership.room_id;
            roomStatus = room.status;
        }

        // Only process active or waiting rooms
        if (roomStatus === 'completed') {
            console.log('Seed room is completed');
            return null;
        }

        if (!roomId) {
            console.log('No valid seed room found');
            return null;
        }

        // 2. Get or create assessment group for this room
        console.log('🔧 Calling RPC: get_or_create_seed_room_assessment_group');
        console.log('   Assessment ID:', assessmentId);
        console.log('   Seed Room ID:', roomId);

        const { data: groupId, error: rpcError } = await supabase
            .rpc('get_or_create_seed_room_assessment_group', {
                p_assessment_id: assessmentId,
                p_seed_room_id: roomId
            });

        console.log('📦 RPC Response:');
        console.log('   Group ID:', groupId);
        console.log('   Error:', rpcError);

        if (rpcError) {
            console.error('Failed to get/create seed room assessment group:',
                rpcError.message || rpcError.code || String(rpcError)
            );
            console.error('Full error:', JSON.stringify(rpcError, Object.getOwnPropertyNames(rpcError)));

            // If function doesn't exist, provide helpful message
            if (rpcError.message?.includes('function') || rpcError.code === '42883') {
                console.error('❌ The database function get_or_create_seed_room_assessment_group does not exist.');
                console.error('📝 Please apply the migration: supabase/migrations/20251208000010_seed_room_assessment_groups.sql');
            }

            return null;
        }

        if (!groupId) {
            console.error('❌ No group ID returned from RPC');
            console.error('This might indicate the RPC function completed but returned NULL');
            return null;
        }

        console.log('✅ RPC returned group ID:', groupId);

        // 3. Fetch full group details with compatible structure
        // First, let's verify the user's seed room membership
        console.log('🔍 Checking user seed room membership...');
        const { data: membershipCheck } = await supabase
            .from('seed_room_members')
            .select('*')
            .eq('user_id', userId)
            .eq('room_id', roomId);
        console.log('   User membership:', membershipCheck);

        // Check how many rows exist (this query might be blocked by RLS)
        console.log('🔍 Attempting to fetch group with ID:', groupId);
        const { data: groupCheck, error: checkError } = await supabase
            .from('assessment_groups')
            .select('id, seed_room_id, assessment_id')
            .eq('id', groupId);

        console.log('   Query result:', { data: groupCheck, error: checkError });

        if (checkError) {
            console.error('❌ Failed to check group existence:', checkError);
            console.error('   This suggests RLS is blocking the query');
            console.error('   Group ID:', groupId);
            console.error('   User ID:', userId);
            console.error('   Room ID:', roomId);

            // Try to fetch without the filter to see if RLS is the issue
            console.log('🔍 Attempting to fetch ANY assessment groups (to test RLS)...');
            const { data: anyGroups, error: anyError } = await supabase
                .from('assessment_groups')
                .select('id')
                .limit(1);
            console.log('   Can access any groups?', { data: anyGroups, error: anyError });

            return null;
        }

        console.log(`🔍 Found ${groupCheck?.length || 0} group(s) with ID ${groupId}`);

        if (!groupCheck || groupCheck.length === 0) {
            console.error('❌ No assessment group found with ID:', groupId);
            console.error('This might indicate the RPC function returned an invalid ID or the group was deleted.');
            return null;
        }

        if (groupCheck.length > 1) {
            console.error('❌ Multiple assessment groups found with the same ID:', groupId);
            console.error('This indicates a data integrity issue. Found:', groupCheck.length, 'groups');
            return null;
        }

        // Now fetch the full group details
        const { data: group, error: groupError } = await supabase
            .from('assessment_groups')
            .select(`
        id,
        assessment_id,
        seed_room_id,
        group_name,
        group_number,
        created_by,
        created_at,
        members:assessment_group_members(
          user_id,
          assigned_at,
          profiles(username, full_name)
        )
      `)
            .eq('id', groupId)
            .single();

        if (groupError) {
            console.error('Failed to fetch group details:',
                groupError.message || groupError.code || String(groupError)
            );
            console.error('Group ID:', groupId);
            console.error('Full error:', JSON.stringify(groupError, Object.getOwnPropertyNames(groupError)));
            return null;
        }

        // Transform to match AssessmentGroupWithMembers structure
        const transformedGroup = {
            ...group,
            members: group.members.map((member: any) => ({
                user_id: member.user_id,
                username: member.profiles?.username || null,
                full_name: member.profiles?.full_name || null,
                assigned_at: member.assigned_at,
            })),
        };

        return transformedGroup as any; // Compatible with AssessmentGroupWithMembers
    } catch (error) {
        console.error('Error in getSeedRoomAssessmentGroup:', error);
        return null;
    }
}

/**
 * Checks if the current map is a seed map
 */
export function isSeedMap(map: any): boolean {
    return map?.map_type === 'seed' && map?.parent_seed_id != null;
}
