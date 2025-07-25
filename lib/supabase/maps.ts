import { createClient } from './client';
import { LearningMap, MapNode, NodePath, NodeContent, NodeAssessment, QuizQuestion, StudentNodeProgress, AssessmentSubmission, SubmissionGrade } from '@/types/map';

// A type for a map that includes its nodes and paths
export type FullLearningMap = LearningMap & {
    map_nodes: (MapNode & {
        node_paths_source: NodePath[];
        node_paths_destination: NodePath[];
        node_content: NodeContent[];
        node_assessments: (NodeAssessment & {
            quiz_questions: QuizQuestion[];
        })[];
    })[];
};


export const getMaps = async (): Promise<LearningMap[]> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('learning_maps')
    .select('id, title, description')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching maps:', error);
    throw new Error('Could not fetch learning maps.');
  }

  return data || [];
};

export const getMapWithNodes = async (id: string): Promise<FullLearningMap | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('learning_maps')
        .select(`
            *,
            map_nodes (
                *,
                node_paths_source:node_paths!source_node_id(*),
                node_paths_destination:node_paths!destination_node_id(*),
                node_content (*),
                node_assessments (
                    *,
                    quiz_questions (*)
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching map with nodes:', error);
        if (error.code === 'PGRST116') return null;
        throw new Error('Could not fetch the learning map.');
    }

    return data as FullLearningMap;
}


export const createMap = async (mapData: Pick<LearningMap, 'title' | 'description'>): Promise<LearningMap> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('learning_maps')
        .insert([ { ...mapData } ])
        .select()
        .single();

    if (error) {
        console.error('Error creating map:', error);
        throw new Error('Could not create the new map.');
    }

    return data;
}

export const updateMap = async (id: string, mapData: Partial<LearningMap>): Promise<LearningMap> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('learning_maps')
        .update(mapData)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating map:', error);
        throw new Error('Could not update the map.');
    }

    return data;
}

export const deleteMap = async (id: string): Promise<void> => {
    const supabase = createClient();
    // Must delete nodes first due to foreign key constraints
    const { data: nodes } = await supabase.from('map_nodes').select('id').eq('map_id', id);
    if (nodes) {
        const nodeIds = nodes.map(n => n.id);
        await supabase.from('node_paths').delete().in('source_node_id', nodeIds);
        await supabase.from('node_paths').delete().in('destination_node_id', nodeIds);
        // Add deletion for content, assessments etc. here in the future
        await supabase.from('map_nodes').delete().in('id', nodeIds);
    }

    const { error } = await supabase
        .from('learning_maps')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting map:', error);
        throw new Error('Could not delete the map.');
    }
}

// --- Node Functions ---

export const createNode = async (nodeData: Partial<MapNode>): Promise<MapNode> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('map_nodes')
        .insert([ { ...nodeData } ])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating node:', error);
        throw new Error('Could not create map node.');
    }
    return data;
}

export const updateNode = async (id: string, nodeData: Partial<MapNode>): Promise<MapNode> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('map_nodes')
        .update(nodeData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating node:', error);
        throw new Error('Could not update map node.');
    }
    return data;
}

export const deleteNode = async (id: string): Promise<void> => {
    const supabase = createClient();
    // Delete paths connected to the node first
    await supabase.from('node_paths').delete().eq('source_node_id', id);
    await supabase.from('node_paths').delete().eq('destination_node_id', id);
    
    const { error } = await supabase
        .from('map_nodes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting node:', error);
        throw new Error('Could not delete map node.');
    }
}

// --- Path Functions ---

export const createPath = async (source: string, target: string): Promise<NodePath> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('node_paths')
        .insert([ { source_node_id: source, destination_node_id: target } ])
        .select()
        .single();
    
    if (error) {
        console.error('Error creating path:', error);
        throw new Error('Could not create node path.');
    }
    return data;
}

export const deletePath = async (pathId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('node_paths')
        .delete()
        .eq('id', pathId);

    if (error) {
        console.error('Error deleting path:', error);
        throw new Error('Could not delete node path.');
    }
}

// --- Content Functions ---

export const createNodeContent = async (contentData: Partial<NodeContent>): Promise<NodeContent> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('node_content')
        .insert([ { ...contentData } ])
        .select()
        .single();

    if (error) {
        console.error('Error creating content:', error);
        throw new Error('Could not create node content.');
    }
    return data;
}

export const updateNodeContent = async (id: string, contentData: Partial<NodeContent>): Promise<NodeContent> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('node_content')
        .update(contentData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating content:', error);
        throw new Error('Could not update node content.');
    }
    return data;
}

export const deleteNodeContent = async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('node_content')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting content:', error);
        throw new Error('Could not delete node content.');
    }
}

// --- Assessment Functions ---

export const createNodeAssessment = async (assessmentData: Partial<NodeAssessment>): Promise<NodeAssessment> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('node_assessments')
        .insert([ { ...assessmentData } ])
        .select('*, quiz_questions(*)')
        .single();
    
    if (error) {
        console.error('Error creating assessment:', error);
        throw new Error('Could not create assessment.');
    }
    return data;
}

export const deleteNodeAssessment = async (id: string): Promise<void> => {
    const supabase = createClient();
    // Must delete questions first
    await supabase.from('quiz_questions').delete().eq('assessment_id', id);
    const { error } = await supabase.from('node_assessments').delete().eq('id', id);

    if (error) {
        console.error('Error deleting assessment:', error);
        throw new Error('Could not delete assessment.');
    }
}

export const createQuizQuestion = async (questionData: Partial<QuizQuestion>): Promise<QuizQuestion> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('quiz_questions')
        .insert([ { ...questionData } ])
        .select()
        .single();

    if (error) {
        console.error('Error creating question:', error);
        throw new Error('Could not create question.');
    }
    return data;
}

export const updateQuizQuestion = async (id: string, questionData: Partial<QuizQuestion>): Promise<QuizQuestion> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('quiz_questions')
        .update(questionData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating question:', error);
        throw new Error('Could not update question.');
    }
    return data;
}

export const deleteQuizQuestion = async (id: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting question:', error);
        throw new Error('Could not delete question.');
    }
}

// --- Student Progress Functions ---

export const getStudentProgress = async (userId: string, nodeId: string): Promise<StudentNodeProgress | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('student_node_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('node_id', nodeId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching progress:', error);
        throw new Error('Could not fetch student progress.');
    }

    return data || null;
}

export const startNodeProgress = async (userId: string, nodeId: string): Promise<StudentNodeProgress> => {
    const supabase = createClient();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
        .from('student_node_progress')
        .upsert({
            user_id: userId,
            node_id: nodeId,
            status: 'in_progress',
            arrived_at: now,
            started_at: now
        })
        .select()
        .single();

    if (error) {
        console.error('Error starting progress:', error);
        throw new Error('Could not start node progress.');
    }

    return data;
}

export const submitNodeProgress = async (progressId: string): Promise<StudentNodeProgress> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('student_node_progress')
        .update({
            status: 'submitted',
            submitted_at: new Date().toISOString()
        })
        .eq('id', progressId)
        .select()
        .single();

    if (error) {
        console.error('Error submitting progress:', error);
        throw new Error('Could not submit progress.');
    }

    return data;
}

// --- Assessment Submission Functions ---

export const createAssessmentSubmission = async (submissionData: Partial<AssessmentSubmission>): Promise<AssessmentSubmission> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('assessment_submissions')
        .insert([{ ...submissionData, submitted_at: new Date().toISOString() }])
        .select()
        .single();

    if (error) {
        console.error('Error creating submission:', error);
        throw new Error('Could not create assessment submission.');
    }

    return data;
}

export const getAssessmentSubmission = async (progressId: string, assessmentId: string): Promise<AssessmentSubmission | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('progress_id', progressId)
        .eq('assessment_id', assessmentId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching submission:', error);
        throw new Error('Could not fetch assessment submission.');
    }

    return data || null;
}

// --- Batch Save Functions ---

export interface BatchMapUpdate {
    map: Partial<LearningMap>;
    nodes: {
        create: Partial<MapNode>[];
        update: (Partial<MapNode> & { id: string })[];
        delete: string[];
    };
    paths: {
        create: { source_node_id: string; destination_node_id: string }[];
        delete: string[];
    };
    content: {
        create: Partial<NodeContent>[];
        update: (Partial<NodeContent> & { id: string })[];
        delete: string[];
    };
    assessments: {
        create: Partial<NodeAssessment>[];
        update: (Partial<NodeAssessment> & { id: string })[];
        delete: string[];
    };
    quizQuestions: {
        create: Partial<QuizQuestion>[];
        update: (Partial<QuizQuestion> & { id: string })[];
        delete: string[];
    };
}

export const batchUpdateMap = async (mapId: string, updates: BatchMapUpdate): Promise<void> => {
    const supabase = createClient();
    
    try {
        // Start a transaction-like approach by performing all operations
        // Note: Supabase doesn't support transactions in client libraries, 
        // so we'll do our best to maintain consistency
        
        // 1. Update map metadata
        if (Object.keys(updates.map).length > 0) {
            const { error: mapError } = await supabase
                .from('learning_maps')
                .update(updates.map)
                .eq('id', mapId);
            
            if (mapError) throw mapError;
        }

        // 2. Delete operations first (to avoid constraint issues)
        if (updates.quizQuestions.delete.length > 0) {
            const { error } = await supabase
                .from('quiz_questions')
                .delete()
                .in('id', updates.quizQuestions.delete);
            if (error) throw error;
        }

        if (updates.assessments.delete.length > 0) {
            const { error } = await supabase
                .from('node_assessments')
                .delete()
                .in('id', updates.assessments.delete);
            if (error) throw error;
        }

        if (updates.content.delete.length > 0) {
            const { error } = await supabase
                .from('node_content')
                .delete()
                .in('id', updates.content.delete);
            if (error) throw error;
        }

        if (updates.paths.delete.length > 0) {
            const { error } = await supabase
                .from('node_paths')
                .delete()
                .in('id', updates.paths.delete);
            if (error) throw error;
        }

        if (updates.nodes.delete.length > 0) {
            const { error } = await supabase
                .from('map_nodes')
                .delete()
                .in('id', updates.nodes.delete);
            if (error) throw error;
        }

        // 3. Create operations
        if (updates.nodes.create.length > 0) {
            const { data: createdNodes, error } = await supabase
                .from('map_nodes')
                .insert(updates.nodes.create)
                .select('*');
            if (error) throw error;
            
            // Note: Created node IDs will be different from temp IDs
            // The calling function should refresh data after batch update
        }

        if (updates.paths.create.length > 0) {
            const { error } = await supabase
                .from('node_paths')
                .insert(updates.paths.create);
            if (error) throw error;
        }

        if (updates.content.create.length > 0) {
            const { error } = await supabase
                .from('node_content')
                .insert(updates.content.create);
            if (error) throw error;
        }

        if (updates.assessments.create.length > 0) {
            const { error } = await supabase
                .from('node_assessments')
                .insert(updates.assessments.create);
            if (error) throw error;
        }

        if (updates.quizQuestions.create.length > 0) {
            const { error } = await supabase
                .from('quiz_questions')
                .insert(updates.quizQuestions.create);
            if (error) throw error;
        }

        // 4. Update operations
        for (const node of updates.nodes.update) {
            const { id, ...nodeData } = node;
            const { error } = await supabase
                .from('map_nodes')
                .update(nodeData)
                .eq('id', id);
            if (error) throw error;
        }

        for (const content of updates.content.update) {
            const { id, ...contentData } = content;
            const { error } = await supabase
                .from('node_content')
                .update(contentData)
                .eq('id', id);
            if (error) throw error;
        }

        for (const assessment of updates.assessments.update) {
            const { id, ...assessmentData } = assessment;
            const { error } = await supabase
                .from('node_assessments')
                .update(assessmentData)
                .eq('id', id);
            if (error) throw error;
        }

        for (const question of updates.quizQuestions.update) {
            const { id, ...questionData } = question;
            const { error } = await supabase
                .from('quiz_questions')
                .update(questionData)
                .eq('id', id);
            if (error) throw error;
        }

    } catch (error) {
        console.error('Error in batch update:', error);
        throw new Error('Failed to save map changes. Please try again.');
    }
}
