#!/usr/bin/env node

/**
 * Quick script to check if a node is set as an end node
 * Usage: node scripts/check-end-node.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

const nodeId = 'b05f30c8-cc6c-4267-ad33-b72a36ea8d6c'; // From your logs

async function checkNode() {
  console.log('🔍 Checking node:', nodeId);

  const { data, error } = await supabase
    .from('map_nodes')
    .select('id, title, node_type, map_id')
    .eq('id', nodeId)
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('\n📋 Node Details:');
  console.log('  ID:', data.id);
  console.log('  Title:', data.title);
  console.log('  Node Type:', data.node_type || '(not set)');
  console.log('  Map ID:', data.map_id);

  console.log('\n🎯 Status:');
  if (data.node_type === 'end') {
    console.log('  ✅ This IS an end node!');
  } else {
    console.log('  ❌ This is NOT an end node');
    console.log('  💡 Current type:', data.node_type || 'learning (default)');
    console.log('\n  To fix: Set node_type to "end" in the map editor');
  }

  // Check if this is in a seed map
  const { data: mapData } = await supabase
    .from('learning_maps')
    .select('id, title, map_type, parent_seed_id')
    .eq('id', data.map_id)
    .single();

  console.log('\n🗺️  Map Details:');
  console.log('  Title:', mapData?.title);
  console.log('  Type:', mapData?.map_type);
  console.log('  Is Seed Map?', mapData?.map_type === 'seed' ? '✅ Yes' : '❌ No');
}

checkNode().catch(console.error);
