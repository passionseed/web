/**
 * Seed progress management
 * Handles resetting user progress when joining new seed rooms
 */

import { createClient } from "@/utils/supabase/server";

/**
 * Clear all progress for a user on a specific map
 * This is used when joining a new seed room to start fresh
 */
export async function clearUserProgressForMap(userId: string, mapId: string) {
    const supabase = await createClient();

    try {
        console.log(`🧹 Clearing progress for user ${userId} on map ${mapId}`);

        // Get all node IDs for this map
        const { data: nodes, error: nodesError } = await supabase
            .from('map_nodes')
            .select('id')
            .eq('map_id', mapId);

        if (nodesError) {
            console.error('Error fetching nodes:', nodesError);
            return { success: false, error: nodesError };
        }

        if (!nodes || nodes.length === 0) {
            console.log('No nodes found for map');
            return { success: true };
        }

        const nodeIds = nodes.map(n => n.id);

        // Delete student_node_progress entries for this user and these nodes
        const { error: progressError } = await supabase
            .from('student_node_progress')
            .delete()
            .eq('user_id', userId)
            .in('node_id', nodeIds);

        if (progressError) {
            console.error('Error deleting progress:', progressError);
            return { success: false, error: progressError };
        }

        console.log(`✅ Successfully cleared progress for ${nodeIds.length} nodes`);
        return { success: true };

    } catch (error) {
        console.error('Error in clearUserProgressForMap:', error);
        return { success: false, error };
    }
}

/**
 * Clear user progress for a seed room
 * Called when a user joins a new seed room
 */
export async function clearProgressForSeedRoom(userId: string, roomId: string) {
    const supabase = await createClient();

    try {
        // Get the seed and its map_id
        const { data: room, error: roomError } = await supabase
            .from('seed_rooms')
            .select(`
                id,
                seed:seeds(
                    id,
                    map_id
                )
            `)
            .eq('id', roomId)
            .single();

        if (roomError || !room) {
            console.error('Error fetching room:', roomError);
            return { success: false, error: roomError };
        }

        const seed = room.seed as any;
        const mapId = seed?.map_id;

        if (!mapId) {
            console.error('No map_id found for seed');
            return { success: false, error: 'No map_id found' };
        }

        // Clear progress for this map
        return await clearUserProgressForMap(userId, mapId);

    } catch (error) {
        console.error('Error in clearProgressForSeedRoom:', error);
        return { success: false, error };
    }
}
