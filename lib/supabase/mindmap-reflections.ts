import { createClient } from "@/utils/supabase/client";

export interface MindmapTopic {
  id: string;
  text: string;
  x: number;
  y: number;
  notes?: string;
}

export interface MindmapReflectionData {
  topics: MindmapTopic[];
  satisfaction: number;
  progress: number;
  challenge: number;
  overallReflection: string;
}

export async function saveMindmapReflection(data: MindmapReflectionData) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Authentication error:', userError);
    throw new Error('User not authenticated');
  }

  console.log('Saving reflection for user:', user.id);
  console.log('Reflection data:', JSON.stringify(data, null, 2));

  try {
    // Start transaction by creating the reflection first
    const reflectionPayload = {
      user_id: user.id,
      satisfaction_rating: data.satisfaction,
      progress_rating: data.progress,
      challenge_rating: data.challenge,
      overall_reflection: data.overallReflection
    };

    console.log('Reflection payload:', reflectionPayload);

    const { data: reflection, error: reflectionError } = await supabase
      .from('mindmap_reflections')
      .insert(reflectionPayload)
      .select()
      .single();

    if (reflectionError) {
      console.error('Reflection insert error:', reflectionError);
      throw reflectionError;
    }

    console.log('Reflection saved:', reflection);

    // Save topics linked to this reflection
    if (data.topics.length > 0) {
      const topicsToInsert = data.topics.map(topic => ({
        user_id: user.id,
        reflection_id: reflection.id,
        text: topic.text,
        position_x: topic.x,
        position_y: topic.y,
        notes: topic.notes || null
      }));

      console.log('Topics to insert:', topicsToInsert);

      const { error: topicsError } = await supabase
        .from('mindmap_topics')
        .insert(topicsToInsert);

      if (topicsError) {
        console.error('Topics insert error:', topicsError);
        // If topics fail, clean up the reflection
        await supabase
          .from('mindmap_reflections')
          .delete()
          .eq('id', reflection.id);
        throw topicsError;
      }

      console.log('Topics saved successfully');
    }

    return reflection;
  } catch (error) {
    console.error('Error saving mindmap reflection:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export async function getMindmapReflections(limit = 20) {
  const supabase = createClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('User not authenticated for reflections');
      return [];
    }

    const { data, error } = await supabase
      .from('mindmap_reflections')
      .select(`
        *,
        mindmap_topics (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Database error fetching reflections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getMindmapReflections:', error);
    return [];
  }
}