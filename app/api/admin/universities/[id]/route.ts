import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check when admin system is implemented

    const body = await request.json()
    const {
      name,
      short_name,
      website_url,
      logo_url,
      description,
      admission_requirements
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'University name is required' },
        { status: 400 }
      )
    }

    const updateData = {
      name: name.trim(),
      short_name: short_name?.trim() || null,
      website_url: website_url?.trim() || null,
      logo_url: logo_url?.trim() || null,
      description: description?.trim() || null,
      admission_requirements: admission_requirements?.trim() || null,
      updated_at: new Date().toISOString()
    }

    const { data: university, error } = await supabase
      .from('universities')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating university:', error)
      return NextResponse.json(
        { error: 'Failed to update university' },
        { status: 500 }
      )
    }

    return NextResponse.json({ university })
  } catch (error) {
    console.error('Update university API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check when admin system is implemented

    // Check if university is in use (has user targets)
    const { data: targets, error: targetsError } = await supabase
      .from('user_university_targets')
      .select('id')
      .eq('university_id', resolvedParams.id)
      .limit(1)

    if (targetsError) {
      console.error('Error checking university usage:', targetsError)
      return NextResponse.json(
        { error: 'Failed to check university usage' },
        { status: 500 }
      )
    }

    if (targets && targets.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete university that is selected by users' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('universities')
      .delete()
      .eq('id', resolvedParams.id)

    if (error) {
      console.error('Error deleting university:', error)
      return NextResponse.json(
        { error: 'Failed to delete university' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete university API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}