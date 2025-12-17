#!/usr/bin/env node

/**
 * Check the node type of the end node
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

const nodeId = 'b05f30c8-cc6c-4267-ad33-b72a36ea8d6c';

async function checkNodeType() {
  console.log('🔍 Checking node type for:', nodeId);

  const { data, error } = await supabase
    .from('map_nodes')
    .select('id, title, node_type')
    .eq('id', nodeId)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('\n📋 Node Info:');
  console.log('  Title:', data.title);
  console.log('  Node Type:', data.node_type || '(not set - defaults to "learning")');

  console.log('\n🎯 Result:');
  if (data.node_type === 'end') {
    console.log('  ✅ Node IS set as END node');
  } else {
    console.log('  ❌ Node is NOT set as END node');
    console.log('  💡 Current value:', data.node_type || 'NULL/undefined');
    console.log('\n  🔧 To fix: You need to set node_type to "end" in the map editor');
    console.log('     or run this SQL:');
    console.log(`     UPDATE map_nodes SET node_type = 'end' WHERE id = '${nodeId}';`);
  }
}

checkNodeType().catch(console.error);
