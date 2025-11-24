import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { University, SimpleRoadmap, SimpleMilestone, UniversityExampleMap, AIAgent } from '@/types/education'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      vision_statement, 
      top_university, 
      primary_interest, 
      secondary_interests = [] 
    }: {
      vision_statement: string
      top_university: University
      primary_interest: string
      secondary_interests: string[]
    } = body

    if (!vision_statement || !top_university || !primary_interest) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // Fetch university example maps and AI agent for context
    const [exampleMaps, roadmapAgent] = await Promise.all([
      getUniversityExampleMaps(supabase, top_university.id),
      getAIAgent(supabase, 'roadmap_generation')
    ])

    // Generate AI roadmap with enhanced context
    const roadmap = await generateAIRoadmap({
      vision_statement,
      top_university,
      primary_interest,
      secondary_interests,
      exampleMaps,
      roadmapAgent
    })

    return NextResponse.json({ 
      roadmap,
      success: true 
    })
  } catch (error) {
    console.error('Error generating roadmap:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate roadmap',
        success: false 
      }, 
      { status: 500 }
    )
  }
}

async function getUniversityExampleMaps(
  supabase: any,
  universityId: string
): Promise<UniversityExampleMap[]> {
  const { data, error } = await supabase
    .from('university_example_maps')
    .select('*')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false })
  
  if (error) {
    // If table doesn't exist, just return empty array
    if (error.code === '42P01') {
      console.warn('University example maps table missing, skipping.')
      return []
    }
    console.error('Error fetching university example maps:', error)
    return []
  }
  
  return data || []
}

async function getAIAgent(
  supabase: any,
  useCase: string
): Promise<AIAgent | null> {
  const { data, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('use_case', useCase)
    .eq('is_active', true)
    .single()
  
  if (error) {
    // If table doesn't exist, just return null
    if (error.code === '42P01') {
      console.warn('AI agents table missing, using default logic.')
      return null
    }
    console.error('Error fetching AI agent:', error)
    return null
  }
  
  return data
}

async function generateAIRoadmap({
  vision_statement,
  top_university,
  primary_interest,
  secondary_interests,
  exampleMaps = [],
  roadmapAgent
}: {
  vision_statement: string
  top_university: University
  primary_interest: string
  secondary_interests: string[]
  exampleMaps?: UniversityExampleMap[]
  roadmapAgent?: AIAgent | null
}): Promise<SimpleRoadmap> {
  // Enhanced roadmap generation with university examples as reference
  // If we have example maps, use them to inform our milestone generation
  let contextualMilestones: SimpleMilestone[] = []
  
  if (exampleMaps.length > 0) {
    // Find the most relevant example map based on primary interest
    const relevantExample = exampleMaps.find(map => 
      map.target_audience?.toLowerCase().includes(primary_interest.toLowerCase()) ||
      map.title.toLowerCase().includes(primary_interest.toLowerCase())
    ) || exampleMaps[0] // Fallback to first example
    
    // Extract milestones from example data if available
    if (relevantExample && relevantExample.example_data) {
      try {
        const exampleData = relevantExample.example_data as any
        if (exampleData.milestones && Array.isArray(exampleData.milestones)) {
          contextualMilestones = exampleData.milestones.map((milestone: any) => ({
            title: milestone.title || '',
            description: milestone.description || '',
            target_timeframe: milestone.target_timeframe || milestone.timeframe || '',
            category: milestone.category || 'skill',
            importance: milestone.importance || 'important'
          })).filter((m: SimpleMilestone) => m.title) // Only include valid milestones
        }
      } catch (error) {
        console.error('Error parsing example map data:', error)
      }
    }
  }
  
  // For now, we'll create a structured roadmap based on common patterns
  // Enhanced with university-specific examples when available
  // TODO: Replace with actual AI API call using roadmapAgent configuration
  
  const roadmapTitle = `Path to ${top_university.name} with ${primary_interest} Focus`
  
  // Generate milestones based on the interest, university, and example maps
  const milestones: SimpleMilestone[] = [...contextualMilestones]
  
  // Academic milestones (always include if not already covered by examples)
  if (!milestones.some(m => m.title.toLowerCase().includes('academic') || m.category === 'academic')) {
    milestones.push({
      title: "Strengthen Academic Foundation",
      description: `Maintain high GPA and excel in core subjects. ${top_university.admission_requirements ? `Focus on: ${top_university.admission_requirements}` : 'Focus on math, science, and English.'}`,
      target_timeframe: "Throughout high school",
      category: "academic",
      importance: "critical"
    })
  }

  if (!milestones.some(m => m.title.toLowerCase().includes('test') || m.title.toLowerCase().includes('sat') || m.title.toLowerCase().includes('act'))) {
    milestones.push({
      title: "Standardized Test Preparation",
      description: "Prepare for and take SAT/ACT tests. Aim for scores that meet or exceed university requirements.",
      target_timeframe: "Junior year",
      category: "academic", 
      importance: "critical"
    })
  }

  // Interest-specific milestones (only add if not covered by examples)
  if (primary_interest.toLowerCase().includes('game') && !milestones.some(m => m.title.toLowerCase().includes('game'))) {
    milestones.push({
      title: "Build Game Development Portfolio",
      description: "Create 2-3 complete games using Unity or Unreal Engine. Include different genres and document your process.",
      target_timeframe: "Sophomore to Senior year",
      category: "skill",
      importance: "critical"
    })
    
    milestones.push({
      title: "Learn Programming Fundamentals", 
      description: "Master C# or C++ programming. Complete online courses and build projects beyond games.",
      target_timeframe: "Freshman to Sophomore year",
      category: "skill",
      importance: "important"
    })
  } else if ((primary_interest.toLowerCase().includes('ai') || primary_interest.toLowerCase().includes('artificial intelligence')) && !milestones.some(m => m.title.toLowerCase().includes('ai') || m.title.toLowerCase().includes('machine learning'))) {
    milestones.push({
      title: "Master Programming and Math",
      description: "Strong foundation in Python, statistics, and calculus. Complete advanced math courses.",
      target_timeframe: "Throughout high school",
      category: "skill",
      importance: "critical"
    })
    
    milestones.push({
      title: "Build AI/ML Projects",
      description: "Create machine learning projects, participate in Kaggle competitions, build neural networks.",
      target_timeframe: "Junior to Senior year", 
      category: "skill",
      importance: "important"
    })
  } else if (primary_interest.toLowerCase().includes('web') && !milestones.some(m => m.title.toLowerCase().includes('web'))) {
    milestones.push({
      title: "Master Web Development Stack",
      description: "Learn HTML, CSS, JavaScript, React, and backend technologies. Build full-stack applications.",
      target_timeframe: "Sophomore to Senior year",
      category: "skill",
      importance: "critical"
    })
    
    milestones.push({
      title: "Create Professional Portfolio",
      description: "Build and deploy 3-5 web applications showcasing different skills and technologies.",
      target_timeframe: "Junior to Senior year",
      category: "skill", 
      importance: "important"
    })
  } else if (!milestones.some(m => m.title.toLowerCase().includes(primary_interest.toLowerCase()))) {
    // Generic tech/STEM milestones
    milestones.push({
      title: `Develop ${primary_interest} Skills`,
      description: `Take courses, complete projects, and gain practical experience in ${primary_interest}. Build a portfolio of work.`,
      target_timeframe: "Sophomore to Senior year",
      category: "skill",
      importance: "critical"
    })
  }

  // Experience and application milestones (only add if not covered by examples)
  if (!milestones.some(m => m.title.toLowerCase().includes('leadership') || (m.category === 'experience' && m.title.toLowerCase().includes('leadership')))) {
    milestones.push({
      title: "Gain Leadership Experience",
      description: "Join relevant clubs, start a project team, or lead a community initiative related to your interests.",
      target_timeframe: "Throughout high school",
      category: "experience", 
      importance: "important"
    })
  }

  if (!milestones.some(m => m.title.toLowerCase().includes('internship') || m.title.toLowerCase().includes('research'))) {
    milestones.push({
      title: "Seek Internships or Research Opportunities",
      description: "Apply for summer programs, internships, or research opportunities at universities or tech companies.",
      target_timeframe: "Summer of Junior year",
      category: "experience",
      importance: "beneficial"
    })
  }

  if (!milestones.some(m => m.title.toLowerCase().includes('application') || m.category === 'application')) {
    milestones.push({
      title: "Complete University Applications",
      description: `Prepare compelling essays, gather recommendations, and submit applications to ${top_university.name} and backup schools.`,
      target_timeframe: "Senior year (Fall)",
      category: "application",
      importance: "critical"
    })
  }

  // Sort milestones by importance and logical progression, limit to 8
  const sortedMilestones = milestones.slice(0, 8).sort((a, b) => {
    const importanceOrder = { critical: 0, important: 1, beneficial: 2 }
    return importanceOrder[a.importance] - importanceOrder[b.importance]
  })

  const roadmap: SimpleRoadmap = {
    overview: {
      title: roadmapTitle,
      timeframe: "3 years",
      vision: vision_statement,
      primary_university: top_university.name,
      primary_interest: primary_interest
    },
    milestones: sortedMilestones
  }

  return roadmap
}

// TODO: Implement actual AI integration with roadmapAgent configuration
// Future enhancement: Use the retrieved AI agent's system_prompt and user_prompt_template
// to create more sophisticated, customizable roadmap generation