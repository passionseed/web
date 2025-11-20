import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { University, SimpleRoadmap, SimpleMilestone } from '@/types/education'

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

    // Generate AI roadmap
    const roadmap = await generateAIRoadmap({
      vision_statement,
      top_university,
      primary_interest,
      secondary_interests
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

async function generateAIRoadmap({
  vision_statement,
  top_university,
  primary_interest,
  secondary_interests
}: {
  vision_statement: string
  top_university: University
  primary_interest: string
  secondary_interests: string[]
}): Promise<SimpleRoadmap> {
  // For now, we'll create a structured roadmap based on common patterns
  // TODO: Replace with actual AI API call (OpenAI, Claude, etc.)
  
  const roadmapTitle = `Path to ${top_university.name} with ${primary_interest} Focus`
  
  // Generate milestones based on the interest and university
  const milestones: SimpleMilestone[] = []
  
  // Academic milestones (always include)
  milestones.push({
    title: "Strengthen Academic Foundation",
    description: `Maintain high GPA and excel in core subjects. ${top_university.admission_requirements ? `Focus on: ${top_university.admission_requirements}` : 'Focus on math, science, and English.'}`,
    target_timeframe: "Throughout high school",
    category: "academic",
    importance: "critical"
  })

  milestones.push({
    title: "Standardized Test Preparation",
    description: "Prepare for and take SAT/ACT tests. Aim for scores that meet or exceed university requirements.",
    target_timeframe: "Junior year",
    category: "academic", 
    importance: "critical"
  })

  // Interest-specific milestones
  if (primary_interest.toLowerCase().includes('game')) {
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
  } else if (primary_interest.toLowerCase().includes('ai') || primary_interest.toLowerCase().includes('artificial intelligence')) {
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
  } else if (primary_interest.toLowerCase().includes('web')) {
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
  } else {
    // Generic tech/STEM milestones
    milestones.push({
      title: `Develop ${primary_interest} Skills`,
      description: `Take courses, complete projects, and gain practical experience in ${primary_interest}. Build a portfolio of work.`,
      target_timeframe: "Sophomore to Senior year",
      category: "skill",
      importance: "critical"
    })
  }

  // Experience and application milestones
  milestones.push({
    title: "Gain Leadership Experience",
    description: "Join relevant clubs, start a project team, or lead a community initiative related to your interests.",
    target_timeframe: "Throughout high school",
    category: "experience", 
    importance: "important"
  })

  milestones.push({
    title: "Seek Internships or Research Opportunities",
    description: "Apply for summer programs, internships, or research opportunities at universities or tech companies.",
    target_timeframe: "Summer of Junior year",
    category: "experience",
    importance: "beneficial"
  })

  milestones.push({
    title: "Complete University Applications",
    description: `Prepare compelling essays, gather recommendations, and submit applications to ${top_university.name} and backup schools.`,
    target_timeframe: "Senior year (Fall)",
    category: "application",
    importance: "critical"
  })

  // Sort milestones by importance and logical progression
  const sortedMilestones = milestones.sort((a, b) => {
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

// TODO: Implement actual AI integration
async function callAIAPI(prompt: string): Promise<string> {
  // Placeholder for actual AI API call
  // This would integrate with OpenAI, Claude, or another AI service
  return "AI-generated roadmap content"
}

function buildAIPrompt(data: {
  vision_statement: string
  top_university: University
  primary_interest: string
  secondary_interests: string[]
}): string {
  return `
Create a 3-year high school roadmap for a student with this profile:

Vision: "${data.vision_statement}"
Target University: ${data.top_university.name}
Primary Interest: ${data.primary_interest}
${data.secondary_interests.length > 0 ? `Secondary Interests: ${data.secondary_interests.join(', ')}` : ''}

University Requirements: ${data.top_university.admission_requirements || 'Standard university admission requirements'}

Generate 6-8 major milestones that will help this student:
1. Meet university admission requirements
2. Develop expertise in their interest area
3. Build a compelling application profile
4. Prepare for their chosen career path

Format as JSON with milestones containing:
- title: Brief milestone name
- description: What the student needs to accomplish
- target_timeframe: When to complete (e.g., "End of Sophomore year")
- category: "academic", "skill", "experience", or "application"
- importance: "critical", "important", or "beneficial"

Focus on actionable, specific milestones that a high school student can realistically achieve.
`
}