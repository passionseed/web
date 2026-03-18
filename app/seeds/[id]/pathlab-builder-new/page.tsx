/**
 * New PathLab Builder Page
 * Uses the three-panel PageBuilder component
 *
 * Access via: /seeds/[id]/pathlab-builder-new
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { PageBuilder } from '@/components/pathlab/PageBuilder';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PathLabBuilderNewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PathLabBuilderNewPage({
  params,
}: PathLabBuilderNewPageProps) {
  const { id: seedId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/seeds/${seedId}/pathlab-builder-new`);
  }

  // Fetch seed
  const { data: seed } = await supabase
    .from('seeds')
    .select('*')
    .eq('id', seedId)
    .single();

  if (!seed) {
    notFound();
  }

  if (seed.seed_type !== 'pathlab') {
    notFound();
  }

  // Check permissions
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'instructor']);

  const isAdminOrInstructor = !!roles?.length;
  const isCreator = seed.created_by === user.id;

  if (!isAdminOrInstructor && !isCreator) {
    notFound();
  }

  // Fetch or create path
  let { data: path } = await supabase
    .from('paths')
    .select('*')
    .eq('seed_id', seed.id)
    .maybeSingle();

  if (!path) {
    const { data: createdPath, error: createPathError } = await supabase
      .from('paths')
      .insert({
        seed_id: seed.id,
        total_days: 1, // Start with 1 page
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createPathError || !createdPath) {
      throw new Error(createPathError?.message || 'Failed to initialize path');
    }
    path = createdPath;
  }

  // Fetch first page (or create it)
  let { data: firstPage } = await supabase
    .from('path_days')
    .select('*')
    .eq('path_id', path.id)
    .eq('day_number', 1)
    .maybeSingle();

  if (!firstPage) {
    const { data: createdPage, error: createPageError } = await supabase
      .from('path_days')
      .insert({
        path_id: path.id,
        day_number: 1,
        title: null,
        context_text: '',
        reflection_prompts: [],
        node_ids: [], // Legacy field
        migrated_from_nodes: true, // Mark as using new system
      })
      .select('*')
      .single();

    if (createPageError || !createdPage) {
      throw new Error(createPageError?.message || 'Failed to create page');
    }
    firstPage = createdPage;
  }

  // Fetch activities for the page
  const { data: activities } = await supabase
    .from('path_activities')
    .select(
      `
      *,
      path_content (*),
      path_assessment:path_assessments (
        *,
        quiz_questions:path_quiz_questions (*)
      )
    `
    )
    .eq('path_day_id', firstPage.id)
    .order('display_order', { ascending: true });

  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Top Navigation */}
      <div className="border-b border-neutral-800 px-6 py-3 bg-neutral-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/seeds/${seedId}`}
              className="flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to seed
            </Link>
            <span className="text-neutral-700">|</span>
            <h2 className="text-sm font-medium text-white">{seed.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              <Link href={`/seeds/${seedId}/pathlab-builder`}>
                Switch to Legacy Builder
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Page Builder */}
      <div className="flex-1 overflow-hidden">
        <PageBuilder
          pageId={firstPage.id}
          pathId={path.id}
          initialTitle={firstPage.title}
          initialContextText={firstPage.context_text}
          initialReflectionPrompts={firstPage.reflection_prompts || []}
          initialActivities={activities || []}
        />
      </div>
    </div>
  );
}
