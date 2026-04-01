// Hackathon Journey API Quickstart
// Copy-paste examples for common operations

import {
  getPhaseBySlug,
  getAllPhases,
  getActivityById,
  createPhase,
  createActivity,
  addActivityContent,
  addActivityAssessment,
  updatePhase,
  updateActivity,
  deletePhase,
} from '@/lib/hackathonPhaseActivity'

// ============================================================================
// GET ALL PHASES FOR A PROGRAM
// ============================================================================

const programId = '4ae8f785-64eb-4038-9614-f471f035110f' // Epic Sprint
const phases = await getAllPhases(programId)

phases.forEach(phase => {
  console.log(`Phase ${phase.phase_number}: ${phase.title}`)
  phase.activities.forEach(activity => {
    console.log(`  - ${activity.title} (${activity.estimated_minutes} min)`)
    activity.content?.forEach(content => {
      console.log(`    • ${content.content_type}: ${content.content_title}`)
    })
    if (activity.assessment) {
      console.log(`    📝 Assessment: ${activity.assessment.points_possible} pts`)
    }
  })
})

// ============================================================================
// CREATE NEW PHASE WITH ACTIVITIES
// ============================================================================

async function createFullPhase(programId: string, phaseNumber: number) {
  const phase = await createPhase({
    program_id: programId,
    slug: 'build',
    title: 'Build',
    description: 'Develop your solution with mentor support.',
    phase_number: phaseNumber,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (!phase) throw new Error('Failed to create phase')

  const planActivity = await createActivity({
    phase_id: phase.id,
    title: 'Plan Your Project',
    instructions: 'Break down your solution into manageable tasks.',
    display_order: 1,
    estimated_minutes: 45,
    is_required: true,
  })

  if (planActivity) {
    await addActivityContent({
      activity_id: planActivity.id,
      content_type: 'text',
      content_title: 'Planning Template',
      content_body: 'Use this template: Goals → Tasks → Timeline → Resources',
      display_order: 1,
    })

    await addActivityAssessment({
      activity_id: planActivity.id,
      assessment_type: 'file_upload',
      points_possible: 15,
      is_graded: true,
      metadata: {
        submission_label: 'Project Plan Document',
        rubric: { completeness: 5, clarity: 5, feasibility: 5 },
      },
    })
  }

  return phase
}

// ============================================================================
// TOGGLE ACTIVITY DRAFT STATUS
// ============================================================================

async function publishActivity(activityId: string) {
  await updateActivity(activityId, { is_draft: false })
}

async function unpublishActivity(activityId: string) {
  await updateActivity(activityId, { is_draft: true })
}

// ============================================================================
// GET SINGLE PHASE BY SLUG
// ============================================================================

async function getIdeationPhase(programId: string) {
  const phase = await getPhaseBySlug(programId, 'ideation')
  if (!phase) return null

  console.log(`\n${phase.title}`)
  phase.activities.forEach((activity, idx) => {
    console.log(`${idx + 1}. ${activity.title} (${activity.estimated_minutes} min)`)
    if (activity.assessment) {
      console.log(`   📝 ${activity.assessment.points_possible} pts`)
    }
  })

  return phase
}

// Usage: getIdeationPhase('4ae8f785-64eb-4038-9614-f471f035110f')
