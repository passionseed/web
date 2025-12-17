import { createClient } from "@/utils/supabase/server";
import { LearningMap } from "@/types/map";

interface CloneMapOptions {
    title?: string;
    description?: string;
}

/**
 * Clones a learning map including all its nodes and edges.
 * 
 * @param sourceMapId The ID of the map to clone
 * @param newMapType The type of the new map ('seed' | 'classroom_exclusive' | 'personal')
 * @param ownerId The user ID who will own the new map
 * @param parentId The ID of the parent entity (seed_id or classroom_id)
 * @param options Optional title and description overrides
 * @returns The newly created map
 */
export async function cloneMap(
    sourceMapId: string,
    newMapType: 'seed' | 'classroom_exclusive' | 'personal' | 'private',
    ownerId: string,
    parentId: string | null,
    options: CloneMapOptions = {}
): Promise<LearningMap> {
    const supabase = await createClient();

    // 1. Fetch source map
    const { data: sourceMap, error: mapError } = await supabase
        .from("learning_maps")
        .select("*")
        .eq("id", sourceMapId)
        .single();

    if (mapError || !sourceMap) {
        throw new Error(`Source map not found: ${mapError?.message}`);
    }

    // 2. Create new map
    const newMapData = {
        title: options.title || `${sourceMap.title} (Copy)`,
        description: options.description || sourceMap.description,
        creator_id: ownerId,
        map_type: newMapType,
        visibility: newMapType === 'seed' ? 'public' : 'private', // Seed maps are public
        parent_seed_id: newMapType === 'seed' ? parentId : null,
        parent_classroom_id: newMapType === 'classroom_exclusive' ? parentId : null,
        category: sourceMap.category,
        difficulty: sourceMap.difficulty,
        metadata: sourceMap.metadata,
        cover_image_url: sourceMap.cover_image_url,
        cover_image_blurhash: sourceMap.cover_image_blurhash,
        cover_image_key: sourceMap.cover_image_key, // Note: This might be an issue if we delete the original image, but for now it's a reference
    };

    const { data: newMap, error: createError } = await supabase
        .from("learning_maps")
        .insert(newMapData)
        .select()
        .single();

    if (createError || !newMap) {
        throw new Error(`Failed to create new map: ${createError?.message}`);
    }

    // 3. Fetch source nodes
    const { data: sourceNodes, error: nodesError } = await supabase
        .from("map_nodes")
        .select("*")
        .eq("map_id", sourceMapId);

    if (nodesError) {
        throw new Error(`Failed to fetch source nodes: ${nodesError.message}`);
    }

    if (!sourceNodes || sourceNodes.length === 0) {
        return newMap as LearningMap;
    }

    // 4. Create new nodes and build mapping
    const nodeMapping = new Map<string, string>(); // oldId -> newId
    const newNodesData = sourceNodes.map(node => {
        // We can't know the new ID until insertion if we let DB generate it.
        // So we'll insert one by one or use a different strategy.
        // Bulk insert is better, but we need the returned IDs mapped to old IDs.
        // Since we can't guarantee order in bulk insert return, we might need to insert one by one 
        // OR use a temporary client-side ID generation if UUIDs are allowed to be set.
        // Supabase/Postgres usually allows setting ID if it's a UUID.
        return {
            map_id: newMap.id,
            title: node.title,
            description: node.description,
            node_type: node.node_type,
            coordinates: node.coordinates,
            content: node.content,
            metadata: node.metadata,
            // We'll let DB generate ID for now and try to match them back or insert one by one
        };
    });

    // Inserting one by one to ensure we can map old IDs to new IDs
    // This is slower but safer for maintaining relationships
    for (const sourceNode of sourceNodes) {
        const { data: newNode, error: nodeInsertError } = await supabase
            .from("map_nodes")
            .insert({
                map_id: newMap.id,
                title: sourceNode.title,
                description: sourceNode.description,
                node_type: sourceNode.node_type,
                coordinates: sourceNode.coordinates,
                content: sourceNode.content,
                metadata: sourceNode.metadata,
            })
            .select("id")
            .single();

        if (nodeInsertError || !newNode) {
            console.error(`Failed to clone node ${sourceNode.id}`, nodeInsertError);
            continue;
        }

        nodeMapping.set(sourceNode.id, newNode.id);
    }

    // 5. Fetch and clone edges
    const { data: sourceEdges, error: edgesError } = await supabase
        .from("map_edges")
        .select("*")
        .eq("map_id", sourceMapId);

    if (edgesError) {
        console.error("Failed to fetch edges", edgesError);
    } else if (sourceEdges && sourceEdges.length > 0) {
        const newEdgesData = sourceEdges
            .filter(edge => nodeMapping.has(edge.source_node_id) && nodeMapping.has(edge.target_node_id))
            .map(edge => ({
                map_id: newMap.id,
                source_node_id: nodeMapping.get(edge.source_node_id)!,
                target_node_id: nodeMapping.get(edge.target_node_id)!,
                label: edge.label,
                metadata: edge.metadata,
            }));

        if (newEdgesData.length > 0) {
            const { error: edgesInsertError } = await supabase
                .from("map_edges")
                .insert(newEdgesData);

            if (edgesInsertError) {
                console.error("Failed to clone edges", edgesInsertError);
            }
        }
    }

    return newMap as LearningMap;
}
