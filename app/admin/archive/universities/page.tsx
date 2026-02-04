import { createClient } from '@/utils/supabase/server'
import { UniversityManagement } from '@/components/admin/UniversityManagement'
import { checkAdminAccess } from "@/utils/admin";

export default async function UniversitiesArchivePage() {
  const supabase = await createClient()
  const user = await checkAdminAccess(supabase);
  
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
