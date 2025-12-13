import { createClient } from '@/utils/supabase/client'
import {
  University,
  UserUniversityTarget,
  UserInterestPriority,
  AIRoadmap,
  SimpleRoadmap
} from '@/types/education'

const supabase = createClient()

// =====================================
// UNIVERSITIES
// =====================================

export async function getAllUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching universities:', JSON.stringify(error, null, 2))
    // Fallback data for testing/dev if DB is missing
    console.warn('Using fallback university data');
    return [
      { id: '1', name: 'Chulalongkorn University', country: 'Thailand', city: 'Bangkok' },
      { id: '2', name: 'Mahidol University', country: 'Thailand', city: 'Nakhon Pathom' },
      { id: '3', name: 'Thammasat University', country: 'Thailand', city: 'Bangkok' },
      { id: '4', name: 'Kasetsart University', country: 'Thailand', city: 'Bangkok' },
      { id: '5', name: 'Chiang Mai University', country: 'Thailand', city: 'Chiang Mai' },
      { id: '6', name: 'King Mongkut\'s Institute of Technology Ladkrabang', country: 'Thailand', city: 'Bangkok' },
      { id: '7', name: 'Khon Kaen University', country: 'Thailand', city: 'Khon Kaen' },
      { id: '8', name: 'Prince of Songkla University', country: 'Thailand', city: 'Songkhla' }
    ] as University[];
  }

  return data || []
}

export async function getUniversityById(id: string): Promise<University | null> {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching university:', error)
    return null
  }

  return data
}

export async function createUniversity(university: Omit<University, 'id' | 'created_at' | 'updated_at'>): Promise<University> {
  const response = await fetch('/api/admin/universities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(university),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create university')
  }

  const { university: createdUniversity } = await response.json()
  return createdUniversity
}

export async function updateUniversity(id: string, updates: Partial<University>): Promise<University> {
  const response = await fetch(`/api/admin/universities/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update university')
  }

  const { university: updatedUniversity } = await response.json()
  return updatedUniversity
}

export async function deleteUniversity(id: string): Promise<void> {
  const response = await fetch(`/api/admin/universities/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete university')
  }
}

// =====================================
// USER UNIVERSITY TARGETS
// =====================================

export async function getUserUniversityTargets(userId: string): Promise<UserUniversityTarget[]> {
  const { data, error } = await supabase
    .from('user_university_targets')
    .select(`
      *,
      university:universities(*)
    `)
    .eq('user_id', userId)
    .order('priority_rank')

  if (error) {
    console.error('Error fetching user university targets:', error)
    throw error
  }

  return data || []
}

export async function saveUserUniversityTargets(
  userId: string,
  universities: { university_id: string; priority_rank: 1 | 2 | 3 }[]
): Promise<UserUniversityTarget[]> {
  // First, delete existing targets for this user
  const { error: deleteError } = await supabase
    .from('user_university_targets')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Error deleting existing targets:', deleteError)
    throw deleteError
  }

  // Insert new targets
  const targetData = universities.map(uni => ({
    user_id: userId,
    university_id: uni.university_id,
    priority_rank: uni.priority_rank
  }))

  const { data, error } = await supabase
    .from('user_university_targets')
    .insert(targetData)
    .select(`
      *,
      university:universities(*)
    `)

  if (error) {
    console.error('Error saving university targets:', error)
    throw error
  }

  return data || []
}

// =====================================
// USER INTEREST PRIORITIES
// =====================================

export async function getUserInterestPriorities(userId: string): Promise<UserInterestPriority[]> {
  const { data, error } = await supabase
    .from('user_interest_priorities')
    .select('*')
    .eq('user_id', userId)
    .order('priority_rank')

  if (error) {
    console.error('Error fetching user interests:', error)
    throw error
  }

  return data || []
}

export async function saveUserInterestPriorities(
  userId: string,
  interests: string[]
): Promise<UserInterestPriority[]> {
  // First, delete existing interests for this user
  const { error: deleteError } = await supabase
    .from('user_interest_priorities')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Error deleting existing interests:', deleteError)
    throw deleteError
  }

  // Insert new interests with priority ranking
  const interestData = interests.map((interest, index) => ({
    user_id: userId,
    interest_name: interest,
    priority_rank: index + 1
  }))

  const { data, error } = await supabase
    .from('user_interest_priorities')
    .insert(interestData)
    .select('*')

  if (error) {
    console.error('Error saving interest priorities:', error)
    throw error
  }

  return data || []
}

export async function addUserInterest(
  userId: string,
  interest: string
): Promise<UserInterestPriority> {
  // Get current max priority rank
  const { data: existingInterests } = await supabase
    .from('user_interest_priorities')
    .select('priority_rank')
    .eq('user_id', userId)
    .order('priority_rank', { ascending: false })
    .limit(1)

  const nextRank = (existingInterests?.[0]?.priority_rank || 0) + 1

  const { data, error } = await supabase
    .from('user_interest_priorities')
    .insert({
      user_id: userId,
      interest_name: interest,
      priority_rank: nextRank
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding interest:', error)
    throw error
  }

  return data
}

export async function removeUserInterest(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_interest_priorities')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error removing interest:', error)
    throw error
  }
}

// =====================================
// AI ROADMAPS
// =====================================

export async function getUserRoadmap(userId: string): Promise<AIRoadmap | null> {
  const { data, error } = await supabase
    .from('ai_roadmaps')
    .select(`
      *,
      top_university:universities(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No roadmap found
    console.error('Error fetching roadmap:', error)
    throw error
  }

  return data
}

export async function saveUserRoadmap(
  userId: string,
  visionStatement: string,
  topUniversityId: string,
  primaryInterest: string,
  roadmapData: SimpleRoadmap
): Promise<AIRoadmap> {
  const { data, error } = await supabase
    .from('ai_roadmaps')
    .insert({
      user_id: userId,
      vision_statement: visionStatement,
      top_university_id: topUniversityId,
      primary_interest: primaryInterest,
      roadmap_data: roadmapData
    })
    .select(`
      *,
      top_university:universities(*)
    `)
    .single()

  if (error) {
    console.error('Error saving roadmap:', error)
    throw error
  }

  return data
}

// =====================================
// UNIVERSITY EXAMPLE MAPS
// =====================================

export async function getUniversityExampleMaps(universityId: string) {
  const { data, error } = await supabase
    .from('university_example_maps')
    .select('*')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') {
      console.warn('University example maps table missing, skipping.')
      return []
    }
    console.error('Error fetching university example maps:', error)
    return []
  }

  return data || []
}

export async function getUniversityExampleMapById(mapId: string) {
  const { data, error } = await supabase
    .from('university_example_maps')
    .select('*')
    .eq('id', mapId)
    .single()

  if (error) {
    console.error('Error fetching university example map:', error)
    return null
  }

  return data
}

// =====================================
// THAILAND ADMISSION PLANS
// =====================================

export async function getThailandUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('thailand_admission_plans')
    .select('university_name_th')

  if (error) {
    console.error('Error fetching Thailand universities:', error)
    return []
  }

  // Get unique universities
  const uniqueNames = Array.from(new Set(data.map(item => item.university_name_th))).sort();

  return uniqueNames.map((name, index) => ({
    id: `th-${index}`, // Temporary ID needed for University interface
    name: name,
    country: 'Thailand',
    city: 'Thailand', // Placeholder
  }));
}

export async function getProgramsForUniversity(universityName: string) {
  const { data, error } = await supabase
    .from('thailand_admission_plans')
    .select('*')
    .eq('university_name_th', universityName)
    .order('curriculum_name_th')

  if (error) {
    console.error(`Error fetching programs for ${universityName}:`, error)
    return []
  }

  return data || []
}

export async function searchThailandUniversities(query: string): Promise<University[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('thailand_admission_plans')
    .select('university_name_th')
    .ilike('university_name_th', `%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching Thailand universities:', error)
    return []
  }

  // Get unique universities
  const uniqueNames = Array.from(new Set(data.map(item => item.university_name_th))).sort();

  return uniqueNames.map((name, index) => ({
    id: `th-search-${index}-${Date.now()}`,
    name: name,
    country: 'Thailand',
    city: 'Thailand',
  }));
}

export async function searchThailandCurriculums(query: string, level?: string) {
  if (!query || query.length < 2) return [];

  let dbQuery = supabase
    .from('thailand_admission_plans')
    .select('*')
    .or(`curriculum_name_th.ilike.%${query}%,curriculum_name_en.ilike.%${query}%,university_name_th.ilike.%${query}%`)
    .limit(50);

  if (level) {
    dbQuery = dbQuery.eq('level_name_th', level);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error searching Thailand curriculums:', error)
    return []
  }

  return data || []
}

export async function browseThailandCurriculums() {
  // Fetch a random set or purely ID based for browsing
  // Since random is hard in Supabase without function, we'll just fetch a range or distinct
  // For now, let's fetch a diverse set by just taking latest or simple limit
  const { data, error } = await supabase
    .from('thailand_admission_plans')
    .select('*')
    .limit(30);

  if (error) {
    console.error('Error browsing Thailand curriculums:', error)
    return []
  }

  return data || []
}