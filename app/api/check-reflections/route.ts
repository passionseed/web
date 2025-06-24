import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if the table exists by trying to fetch a single row
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') { // Table does not exist
        return NextResponse.json(
          { error: 'Reflections table does not exist' },
          { status: 404 }
        );
      }
      
      // For other errors, return the error details
      console.error('Error checking reflections table:', error);
      return NextResponse.json(
        { 
          error: 'Error checking reflections table',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      hasData: data && data.length > 0,
      rowCount: data?.length || 0
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
