// Test email authentication flow
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailAuth() {
  console.log('Testing email authentication...')
  
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'testpassword123'
  
  try {
    console.log(`Creating account: ${testEmail}`)
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3002/auth/callback'
      }
    })
    
    if (error) {
      console.error('❌ Sign up failed:', error)
    } else {
      console.log('✅ Sign up successful:', data)
      
      if (data.user && !data.session) {
        console.log('📧 Email confirmation required')
      }
      
      // Test sign in
      console.log('Testing sign in...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })
      
      if (signInError) {
        console.error('❌ Sign in failed:', signInError)
      } else {
        console.log('✅ Sign in successful:', signInData.session ? 'Session created' : 'No session')
        
        if (signInData.user) {
          // Try to create profile
          console.log('Testing profile creation...')
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: signInData.user.id,
              email: signInData.user.email,
              full_name: 'Test User',
              username: `testuser_${Date.now()}`,
              avatar_url: null
            })
            .select()
            .single()
            
          if (profileError) {
            console.error('❌ Profile creation failed:', profileError)
          } else {
            console.log('✅ Profile created:', profile)
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Test failed:', err)
  }
}

testEmailAuth()