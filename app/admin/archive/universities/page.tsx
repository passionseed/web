import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UniversityManagement } from '@/components/admin/UniversityManagement'

export default async function UniversitiesArchivePage() {
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
  
  // Fetch universities for the admin interface
  const { data: universities, error: universitiesError } = await supabase
    .from('universities')
    .select('*')
    .order('name')

  if (universitiesError) {
    console.error('Error fetching universities:', universitiesError)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Archive - Universities
        </h1>
        <p className="text-slate-400">
          Manage universities archive for the educational pathway system
        </p>
      </div>

      <UniversityManagement 
        initialUniversities={universities || []} 
        user={user}
      />
    </div>
  )
}