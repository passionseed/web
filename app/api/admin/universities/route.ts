import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add admin role check when admin system is implemented
    // For now, allow all authenticated users

    const { data: universities, error } = await supabase
      .from('universities')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching universities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch universities' },
        { status: 500 }
      )
    }

    return NextResponse.json({ universities })
  } catch (error) {
    console.error('Universities API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { data: university, error } = await supabase
      .from('universities')
      .insert({
        name: name.trim(),
        short_name: short_name?.trim() || null,
        website_url: website_url?.trim() || null,
        logo_url: logo_url?.trim() || null,
        description: description?.trim() || null,
        admission_requirements: admission_requirements?.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating university:', error)
      return NextResponse.json(
        { error: 'Failed to create university' },
        { status: 500 }
      )
    }

    return NextResponse.json({ university })
  } catch (error) {
    console.error('Create university API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}