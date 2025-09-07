import { createClient } from '@/utils/supabase/client'

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  angle: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMindMapNodeData {
  text: string;
  x: number;
  y: number;
  angle: number;
}

export interface UpdateMindMapNodeData {
  text?: string;
  x?: number;
  y?: number;
  angle?: number;
}

export interface MindMapDailyEntry {
  id: string;
  user_id: string;
  mindmap_node_id: string;
  content: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMindMapDailyEntryData {
  mindmap_node_id: string;
  content: string;
  date?: string;
}

export interface UpdateMindMapDailyEntryData {
  content: string;
}

// Client-side functions
export async function getMindMapNodes(): Promise<MindMapNode[]> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return [];
  }
  
  const { data, error } = await supabase
    .from('mindmap_nodes')
    .select('*')
    .order('created_at');
  
  if (error) {
    console.error('Error fetching mindmap nodes:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return [];
  }
  
  return data || [];
}

export async function createMindMapNode(nodeData: CreateMindMapNodeData): Promise<MindMapNode | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }
  
  // Include user_id in the insert data
  const insertData = {
    ...nodeData,
    user_id: user.id
  };
  
  const { data, error } = await supabase
    .from('mindmap_nodes')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating mindmap node:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  return data;
}

export async function updateMindMapNode(id: string, nodeData: UpdateMindMapNodeData): Promise<MindMapNode | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }
  
  const { data, error } = await supabase
    .from('mindmap_nodes')
    .update(nodeData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating mindmap node:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  return data;
}

export async function deleteMindMapNode(id: string): Promise<boolean> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return false;
  }
  
  const { error } = await supabase
    .from('mindmap_nodes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting mindmap node:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
  
  return true;
}

// Daily entries functions
export async function getDailyEntry(nodeId: string, date?: string): Promise<MindMapDailyEntry | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('mindmap_daily_entries')
    .select('*')
    .eq('mindmap_node_id', nodeId)
    .eq('date', targetDate)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching daily entry:', error);
    return null;
  }
  
  return data;
}

export async function createOrUpdateDailyEntry(nodeId: string, content: string, date?: string): Promise<MindMapDailyEntry | null> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Try to upsert (insert or update)
  const { data, error } = await supabase
    .from('mindmap_daily_entries')
    .upsert({
      user_id: user.id,
      mindmap_node_id: nodeId,
      content: content.trim(),
      date: targetDate
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating/updating daily entry:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
  
  return data;
}

export async function deleteDailyEntry(nodeId: string, date?: string): Promise<boolean> {
  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return false;
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('mindmap_daily_entries')
    .delete()
    .eq('mindmap_node_id', nodeId)
    .eq('date', targetDate);
  
  if (error) {
    console.error('Error deleting daily entry:', error);
    return false;
  }
  
  return true;
}

