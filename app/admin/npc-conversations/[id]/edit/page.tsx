import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { NPCConversationEditor } from '@/components/admin/NPCConversationEditor';

export default async function EditNPCConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch conversation
  const { data: conversation, error: convError } = await supabase
    .from('path_npc_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (convError || !conversation) {
    redirect('/admin/npc-conversations/new');
  }

  // Fetch nodes
  const { data: nodes } = await supabase
    .from('path_npc_conversation_nodes')
    .select('*, npc_avatar:seed_npc_avatars(*), choices:path_npc_conversation_choices(*)')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  // Fetch available NPCs
  const { data: avatars } = await supabase
    .from('seed_npc_avatars')
    .select('*')
    .eq('seed_id', conversation.seed_id);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <NPCConversationEditor
        conversation={conversation}
        nodes={nodes || []}
        avatars={avatars || []}
      />
    </div>
  );
}
