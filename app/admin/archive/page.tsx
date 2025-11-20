import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { University, Database, Archive } from 'lucide-react'

export default async function ArchivePage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile to check admin status (simplified check for now)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // For now, allow all authenticated users (in real app, check admin role)
  // TODO: Add proper admin role checking when admin system is implemented

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Archive
        </h1>
        <p className="text-slate-400">
          Manage archived data and system resources
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/archive/universities">
          <Card className="cursor-pointer hover:bg-slate-800/50 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <University className="w-8 h-8 text-blue-500" />
                <div>
                  <CardTitle>Universities</CardTitle>
                  <CardDescription>
                    Manage university archive for educational pathways
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Add, edit, and organize universities that students can select as their target institutions.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder for future archive sections */}
        <Card className="opacity-50 cursor-not-allowed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-slate-500" />
              <div>
                <CardTitle className="text-slate-500">Learning Resources</CardTitle>
                <CardDescription>
                  Coming soon - Manage learning resources archive
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Future archive for learning materials, courses, and educational content.
            </p>
          </CardContent>
        </Card>

        <Card className="opacity-50 cursor-not-allowed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8 text-slate-500" />
              <div>
                <CardTitle className="text-slate-500">System Data</CardTitle>
                <CardDescription>
                  Coming soon - System configuration archive
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Archive for system settings, templates, and configuration data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}