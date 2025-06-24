import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if the reflections table exists by querying information_schema
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['reflections', 'tags', 'reflection_tags', 'reflection_metrics']);

    if (error) {
      console.error('Error checking tables:', error);
      return NextResponse.json(
        { 
          error: 'Error checking tables',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    // Get current user for RLS testing
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          details: userError?.message || 'No user session found'
        },
        { status: 401 }
      );
    }

    // Try to insert a test reflection to check RLS
    const testReflection = {
      user_id: user.id,
      content: 'Test reflection',
      emotion: 'neutral'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('reflections')
      .insert(testReflection)
      .select()
      .single();

    // Clean up test data if it was inserted
    if (insertData?.id) {
      await supabase
        .from('reflections')
        .delete()
        .eq('id', insertData.id);
    }

    return NextResponse.json({
      tables: tables?.map(t => t.table_name) || [],
      user: {
        id: user.id,
        email: user.email
      },
      canInsertReflection: !insertError,
      insertError: insertError ? {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details
      } : null
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
