#!/usr/bin/env node

/**
 * Diagnostic script to test database access and RLS policies
 * Run with: node scripts/test-db-access.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseAccess() {
  console.log('🔍 Testing database access...\n');

  // Test 1: Check if we can query profiles table
  console.log('Test 1: Querying profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, email')
    .limit(5);

  if (profilesError) {
    console.error('❌ Profiles query failed:');
    console.error('  Message:', profilesError.message);
    console.error('  Details:', profilesError.details);
    console.error('  Hint:', profilesError.hint);
    console.error('  Code:', profilesError.code);
    console.error('  Full error:', JSON.stringify(profilesError, null, 2));
  } else {
    console.log('✅ Profiles query succeeded');
    console.log('  Found', profiles?.length || 0, 'profiles');
  }
  console.log('');

  // Test 2: Check if we can query user_roles table
  console.log('Test 2: Querying user_roles table...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .limit(5);

  if (rolesError) {
    console.error('❌ User roles query failed:');
    console.error('  Message:', rolesError.message);
    console.error('  Details:', rolesError.details);
    console.error('  Hint:', rolesError.hint);
    console.error('  Code:', rolesError.code);
    console.error('  Full error:', JSON.stringify(rolesError, null, 2));
  } else {
    console.log('✅ User roles query succeeded');
    console.log('  Found', roles?.length || 0, 'roles');
  }
  console.log('');

  // Test 3: Check authentication status
  console.log('Test 3: Checking authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('❌ Auth check failed:');
    console.error('  Message:', authError.message);
  } else if (!user) {
    console.log('⚠️  No authenticated user (this is expected without login)');
  } else {
    console.log('✅ Authenticated as:', user.email);
  }
  console.log('');

  console.log('📝 Summary:');
  console.log('  Supabase URL:', supabaseUrl);
  console.log('  Anon key configured:', supabaseKey ? 'Yes' : 'No');
  console.log('  Profiles accessible:', !profilesError);
  console.log('  User roles accessible:', !rolesError);
  console.log('  User authenticated:', !!user);
}

testDatabaseAccess().catch(console.error);
