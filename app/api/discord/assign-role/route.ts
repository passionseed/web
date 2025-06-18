import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// This is a server-side API route that will be called from the client
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, workshopId } = await request.json();

    // Verify the requesting user matches the userId
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the workshop to find the Discord role ID
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('discord_role_id')
      .eq('id', workshopId)
      .single();

    if (workshopError || !workshop) {
      return NextResponse.json(
        { error: 'Workshop not found' },
        { status: 404 }
      );
    }

    if (!workshop.discord_role_id) {
      return NextResponse.json(
        { error: 'No Discord role configured for this workshop' },
        { status: 400 }
      );
    }

    // Get user's Discord ID from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.discord_id) {
      return NextResponse.json(
        { error: 'User has not linked their Discord account' },
        { status: 400 }
      );
    }

    // Call Discord API to assign role
    const discordResponse = await fetch(
      `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${profile.discord_id}/roles/${workshop.discord_role_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!discordResponse.ok) {
      const error = await discordResponse.text();
      console.error('Discord API error:', error);
      return NextResponse.json(
        { error: 'Failed to assign Discord role' },
        { status: discordResponse.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Discord role assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
