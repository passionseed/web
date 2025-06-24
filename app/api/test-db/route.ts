import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test connection by getting the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Not authenticated',
          details: userError?.message || 'No user session found'
        },
        { status: 401 }
      );
    }
    
    // Test if we can query the reflections table
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      reflections: {
        count: data?.length || 0,
        sample: data?.[0] || null
      },
      message: data?.length ? 'Found reflections' : 'No reflections found'
    });
    
  } catch (error) {
    console.error('Test DB error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
