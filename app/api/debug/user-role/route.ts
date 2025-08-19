import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    // Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Check user roles
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    // Test the is_admin function
    const { data: isAdminResult, error: isAdminError } = await supabase
      .rpc('is_admin', { user_uuid: userId });
    
    return NextResponse.json({
      userId,
      profile: {
        data: profile,
        error: profileError?.message
      },
      roles: {
        data: roles,
        error: roleError?.message
      },
      isAdmin: {
        result: isAdminResult,
        error: isAdminError?.message
      }
    });
    
  } catch (error) {
    console.error('Debug user role error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}