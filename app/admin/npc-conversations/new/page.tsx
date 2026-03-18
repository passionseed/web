import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { NPCConversationBuilder } from '@/components/admin/NPCConversationBuilder';

export default async function NewNPCConversationPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'teacher']);

  if (!roles || roles.length === 0) {
    redirect('/');
  }

  // Get all seeds for the dropdown
  const { data: seeds } = await supabase
    .from('seeds')
    .select('id, title')
    .order('created_at', { ascending: false });

  // Get NPC avatars
  const { data: avatars } = await supabase
    .from('seed_npc_avatars')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create NPC Conversation</h1>
        <p className="text-muted-foreground">
          Build a branching dialogue tree for your PathLab activities
        </p>
      </div>

      <NPCConversationBuilder seeds={seeds || []} avatars={avatars || []} />
    </div>
  );
}
