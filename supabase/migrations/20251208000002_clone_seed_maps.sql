-- Migration to clone existing seed maps to be independent

DO $$
DECLARE
    seed_record RECORD;
    new_map_id UUID;
    original_map_id UUID;
BEGIN
    -- Loop through all seeds that have a map_id
    FOR seed_record IN SELECT * FROM public.seeds WHERE map_id IS NOT NULL LOOP
        original_map_id := seed_record.map_id;
        
        -- 1. Clone the map entry
        INSERT INTO public.learning_maps (
            title,
            description,
            creator_id,
            map_type,
            parent_seed_id,
            visibility,
            created_at,
            updated_at
        )
        SELECT 
            title || ' (Seed Copy)', -- Append to distinguish
            description,
            seed_record.created_by, -- Set owner to seed creator
            'seed',
            seed_record.id,
            'public', -- Seed maps are public
            now(),
            now()
        FROM public.learning_maps
        WHERE id = original_map_id
        RETURNING id INTO new_map_id;

        -- 2. Clone map nodes
        INSERT INTO public.map_nodes (
            map_id,
            title,
            description,
            node_type,
            coordinates,
            content,
            created_at,
            updated_at
        )
        SELECT 
            new_map_id,
            title,
            description,
            node_type,
            coordinates,
            content,
            now(),
            now()
        FROM public.map_nodes
        WHERE map_id = original_map_id;

        -- 3. Clone map edges
        -- We need to map old node IDs to new node IDs. This is tricky in pure SQL without a temp table.
        -- A simpler approach for edges is to rely on the fact that we need to reconstruct them.
        -- However, since map_edges usually reference node IDs, we need the mapping.
        
        -- Let's use a temporary table to store the mapping for this iteration
        CREATE TEMP TABLE node_mapping AS
        SELECT 
            old_node.id as old_id,
            new_node.id as new_id
        FROM public.map_nodes old_node
        JOIN public.map_nodes new_node ON 
            new_node.map_id = new_map_id AND
            old_node.map_id = original_map_id AND
            old_node.title = new_node.title AND -- Assuming titles are unique enough within a map or we rely on order
            old_node.coordinates::text = new_node.coordinates::text; -- Use coords as secondary key

        -- Insert edges using the mapping
        INSERT INTO public.map_edges (
            map_id,
            source_node_id,
            target_node_id,
            label,
            created_at,
            updated_at
        )
        SELECT 
            new_map_id,
            m1.new_id,
            m2.new_id,
            e.label,
            now(),
            now()
        FROM public.map_edges e
        JOIN node_mapping m1 ON e.source_node_id = m1.old_id
        JOIN node_mapping m2 ON e.target_node_id = m2.old_id
        WHERE e.map_id = original_map_id;

        -- Drop temp table for next iteration
        DROP TABLE node_mapping;

        -- 4. Update the seed to point to the new map
        UPDATE public.seeds
        SET map_id = new_map_id
        WHERE id = seed_record.id;

    END LOOP;
END $$;
