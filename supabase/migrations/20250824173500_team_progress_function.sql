CREATE OR REPLACE FUNCTION get_team_map_progress(map_id_param uuid)
RETURNS SETOF team_node_progress AS $$
DECLARE
    user_team_id uuid;
    is_instructor boolean := false;
BEGIN
    -- Check if user is instructor or TA in any classroom that has teams with this map
    SELECT EXISTS (
        SELECT 1 
        FROM classroom_team_maps ctm
        JOIN classroom_teams ct ON ctm.team_id = ct.id
        JOIN classroom_memberships cm ON ct.classroom_id = cm.classroom_id
        WHERE ctm.map_id = map_id_param 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
    ) INTO is_instructor;

    -- Instructors and TAs can see progress for all teams with this map
    IF is_instructor THEN
        RETURN QUERY
        SELECT tnp.*
        FROM team_node_progress tnp
        JOIN classroom_team_maps ctm ON tnp.team_id = ctm.team_id
        WHERE ctm.map_id = map_id_param;

    -- Students can see their own team's progress for this map
    ELSE
        -- Find the team_id for the current user that has this map
        SELECT ctm.team_id INTO user_team_id 
        FROM classroom_team_maps ctm
        JOIN team_memberships tm ON ctm.team_id = tm.team_id
        WHERE ctm.map_id = map_id_param 
        AND tm.user_id = auth.uid() 
        AND tm.left_at IS NULL
        LIMIT 1;

        IF user_team_id IS NOT NULL THEN
            RETURN QUERY
            SELECT tnp.*
            FROM team_node_progress tnp
            WHERE tnp.team_id = user_team_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;