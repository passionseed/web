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
    console.error('Error fetching universities:', error)
    throw error
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