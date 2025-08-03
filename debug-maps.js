// Simple debug script to test map fetching locally
// Run with: node debug-maps.js

const { createClient } = require('@supabase/supabase-js');

// Mock the environment variables - replace with your actual values for testing
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testGetMapsWithStats() {
  console.log('🔍 Testing getMapsWithStats function...');
  
  try {
    const { data, error } = await supabase
      .from("learning_maps")
      .select(`
        *,
        map_nodes (
          id,
          difficulty,
          node_assessments (id)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      return;
    }

    console.log(`📊 Raw data length: ${data?.length || 0}`);
    
    // Check for null values
    const nullMaps = (data || []).filter(map => !map || !map.id || !map.title);
    if (nullMaps.length > 0) {
      console.warn(`⚠️ Found ${nullMaps.length} null/invalid maps:`, nullMaps);
    }
    
    // Apply the same filter as in the code
    const validMaps = (data || []).filter(map => map && map.id && map.title);
    console.log(`✅ Valid maps after filtering: ${validMaps.length}`);
    
    // Check map structure
    if (validMaps.length > 0) {
      console.log('📝 Sample map structure:', {
        id: validMaps[0].id,
        title: validMaps[0].title,
        hasNodes: !!validMaps[0].map_nodes,
        nodeCount: validMaps[0].map_nodes?.length || 0
      });
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testGetMapsWithStats();
