// One-time migration script to save existing assessments from frontend to database
// Run with: node migrate-existing-assessments.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "http://127.0.0.1:54321"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateExistingAssessments() {
  console.log('🚀 Starting migration of existing assessments...')
  
  try {
    // Get all maps with their full node data from the frontend structure
    const { data: maps, error: mapError } = await supabase
      .from('learning_maps')
      .select(`
        id,
        title,
        map_nodes (
          id,
          title,
          metadata
        )
      `)
    
    if (mapError) {
      console.error('❌ Error fetching maps:', mapError)
      return
    }
    
    console.log(`📋 Found ${maps?.length || 0} maps to check`)
    
    let totalAssessmentsFound = 0
    let totalAssessmentsMigrated = 0
    let totalQuestionsFound = 0
    let totalQuestionsMigrated = 0
    
    for (const map of maps || []) {
      console.log(`\n🗺️ Processing map: "${map.title}" (${map.id})`)
      
      for (const node of map.map_nodes || []) {
        console.log(`  📝 Checking node: "${node.title}" (${node.id})`)
        
        // Check if node metadata contains assessments (they might be stored here)
        const metadata = node.metadata || {}
        let nodeAssessments = []
        
        // Look for assessments in metadata or other possible locations
        if (metadata.node_assessments) {
          nodeAssessments = metadata.node_assessments
        } else if (metadata.assessments) {
          nodeAssessments = metadata.assessments
        } else if (metadata.assessment) {
          nodeAssessments = [metadata.assessment]
        }
        
        if (nodeAssessments.length > 0) {
          console.log(`    ✨ Found ${nodeAssessments.length} assessments in node metadata`)
          totalAssessmentsFound += nodeAssessments.length
          
          for (const assessment of nodeAssessments) {
            try {
              // Check if this assessment already exists in database
              const { data: existingAssessment } = await supabase
                .from('node_assessments')
                .select('id')
                .eq('node_id', node.id)
                .eq('assessment_type', assessment.assessment_type)
                .single()
              
              if (existingAssessment) {
                console.log(`    ℹ️ Assessment already exists, skipping...`)
                continue
              }
              
              console.log(`    💾 Migrating assessment: ${assessment.assessment_type}`)
              
              // Create the assessment in database
              const { data: newAssessment, error: assessmentError } = await supabase
                .from('node_assessments')
                .insert({
                  node_id: node.id,
                  assessment_type: assessment.assessment_type,
                  points_possible: assessment.points_possible || null,
                  is_graded: assessment.is_graded || false,
                })
                .select()
                .single()
              
              if (assessmentError) {
                console.error(`    ❌ Failed to create assessment:`, assessmentError)
                continue
              }
              
              totalAssessmentsMigrated++
              console.log(`    ✅ Assessment created with ID: ${newAssessment.id}`)
              
              // Migrate quiz questions if they exist
              if (assessment.quiz_questions && assessment.quiz_questions.length > 0) {
                console.log(`    📊 Migrating ${assessment.quiz_questions.length} quiz questions...`)
                totalQuestionsFound += assessment.quiz_questions.length
                
                for (const question of assessment.quiz_questions) {
                  try {
                    const { data: newQuestion, error: questionError } = await supabase
                      .from('quiz_questions')
                      .insert({
                        assessment_id: newAssessment.id,
                        question_text: question.question_text,
                        options: question.options,
                        correct_option: question.correct_option,
                      })
                      .select()
                      .single()
                    
                    if (questionError) {
                      console.error(`    ❌ Failed to create quiz question:`, questionError)
                      continue
                    }
                    
                    totalQuestionsMigrated++
                    console.log(`    ✅ Quiz question created: ${newQuestion.id}`)
                  } catch (qError) {
                    console.error(`    ❌ Error creating quiz question:`, qError)
                  }
                }
              }
              
            } catch (aError) {
              console.error(`    ❌ Error creating assessment:`, aError)
            }
          }
        } else {
          console.log(`    ⚪ No assessments found in node metadata`)
        }
      }
    }
    
    console.log('\n🎉 Migration complete!')
    console.log(`📊 Statistics:`)
    console.log(`  - Assessments found: ${totalAssessmentsFound}`)
    console.log(`  - Assessments migrated: ${totalAssessmentsMigrated}`)
    console.log(`  - Quiz questions found: ${totalQuestionsFound}`)
    console.log(`  - Quiz questions migrated: ${totalQuestionsMigrated}`)
    
    if (totalAssessmentsMigrated === 0) {
      console.log('\n❓ No assessments were found in node metadata.')
      console.log('This suggests assessments might be stored in a different location.')
      console.log('Let me check the current frontend map structure...')
      
      // Try to get one map with full React Flow node structure
      if (maps && maps[0]) {
        const { data: fullMap, error: fullMapError } = await supabase
          .from('learning_maps')
          .select(`
            *,
            map_nodes (
              *
            )
          `)
          .eq('id', maps[0].id)
          .single()
        
        if (!fullMapError && fullMap) {
          console.log('\n🔍 Sample node structure:')
          const sampleNode = fullMap.map_nodes[0]
          if (sampleNode) {
            console.log('Node keys:', Object.keys(sampleNode))
            console.log('Node metadata:', JSON.stringify(sampleNode.metadata, null, 2))
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

migrateExistingAssessments().catch(console.error)