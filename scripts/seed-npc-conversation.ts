/**
 * Seed Script: Create Sample NPC Conversation
 *
 * This script creates a sample branching NPC conversation for PathLab
 * Based on the QTE (Question Tree Event) flowchart example
 *
 * Run with: npx tsx scripts/seed-npc-conversation.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🌱 Seeding NPC conversation...\n');

  // Step 1: Get or create a seed
  const { data: seeds } = await supabase
    .from('seeds')
    .select('id')
    .limit(1)
    .single();

  if (!seeds) {
    console.error('❌ No seed found. Please create a seed first.');
    return;
  }

  const seedId = seeds.id;
  console.log(`✅ Using seed: ${seedId}\n`);

  // Step 2: Create NPC avatars
  console.log('Creating NPC avatars...');

  const advisorAvatar = await supabase
    .from('seed_npc_avatars')
    .insert({
      seed_id: seedId,
      name: 'Academic Advisor',
      description: 'Friendly academic advisor who helps with university planning',
      svg_data: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="#6366f1"/>
        <circle cx="35" cy="40" r="5" fill="white"/>
        <circle cx="65" cy="40" r="5" fill="white"/>
        <path d="M 30 60 Q 50 70 70 60" stroke="white" stroke-width="3" fill="none"/>
      </svg>`,
    })
    .select()
    .single();

  console.log(`✅ Created advisor avatar: ${advisorAvatar.data?.id}\n`);

  // Step 3: Create conversation
  console.log('Creating conversation...');

  const conversation = await supabase
    .from('path_npc_conversations')
    .insert({
      seed_id: seedId,
      title: 'Career Path Discovery',
      description: 'Explore different career paths based on your interests and goals',
      estimated_minutes: 10,
    })
    .select()
    .single();

  const conversationId = conversation.data!.id;
  console.log(`✅ Created conversation: ${conversationId}\n`);

  // Step 4: Create conversation nodes
  console.log('Creating conversation nodes...');

  // Root node - Initial question
  const rootNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'question',
      title: 'Welcome!',
      text_content:
        'สวัสดีครับ! ยินดีต้อนรับสู่การสำรวจเส้นทางอาชีพ ผม/ดิฉันอยากทราบว่าคุณมีความสนใจในด้านใดบ้างครับ?',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  // Academic path nodes
  const academicNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'question',
      text_content:
        'เยี่ยมเลย! คุณสนใจด้านวิชาการ ผมขอถามเพิ่มเติมนิดนึงนะครับ คุณสนใจเรียนในระดับใด?',
      metadata: { emotion: 'thoughtful' },
    })
    .select()
    .single();

  const undergraduateNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'statement',
      text_content:
        'สำหรับระดับปริญญาตรี คุณควรเตรียมตัวสำหรับ TCAS รอบ 3 ถึง 72 อันเลือก และอย่าลืมดู Netflix อยู่ด้วยนะครับ สมดุลชีวิตสำคัญ! 😊',
      metadata: { emotion: 'happy', auto_advance_delay_ms: 3000 },
    })
    .select()
    .single();

  const undergraduateQuestionNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'question',
      text_content: 'แล้วคุณมีเงินทุนสำหรับการศึกษาอยู่หรือไม่ครับ?',
      metadata: { emotion: 'neutral' },
    })
    .select()
    .single();

  const scholarshipPathNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'question',
      text_content:
        'เข้าใจแล้วครับ ผมแนะนำให้คุณพิจารณาทุนการศึกษา มีสองทางเลือกหลักๆ:',
      metadata: { emotion: 'thoughtful' },
    })
    .select()
    .single();

  const governmentScholarshipNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'end',
      title: 'ทุนรัฐบาล',
      text_content:
        'ทุนรัฐบาล กยศ.เป็นตัวเลือกที่ดี! คุณสามารถยื่นกู้ได้ถึง 120,000 บาทต่อปี และมีเงื่อนไขการชำระที่ยืดหยุ่น ผมแนะนำให้ศึกษาข้อมูลเพิ่มเติมและยื่นขอก่อนเปิดเทอม',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  const privateScholarshipNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'end',
      title: 'ทุนเอกชน',
      text_content:
        'ทุนเอกชนเป็นโอกาสที่ดี! หลายองค์กรมอบทุนตามความสามารถและความต้องการ ลองค้นหาทุนที่เหมาะกับคุณและเตรียมเอกสารให้พร้อม โชคดีนะครับ!',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  // Creative path nodes
  const creativeNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'question',
      text_content:
        'สุดยอด! คุณสนใจด้านสร้างสรรค์ คุณมีความสนใจในด้านใดเป็นพิเศษ?',
      metadata: { emotion: 'surprised' },
    })
    .select()
    .single();

  const artDesignNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'end',
      title: 'ศิลปะและการออกแบบ',
      text_content:
        'ศิลปะและการออกแบบเป็นสาขาที่น่าสนใจมาก! คุณสามารถเรียนได้หลากหลาย เช่น Graphic Design, Product Design, หรือ Fine Arts ลองสร้างพอร์ตโฟลิโอและฝึกฝนทักษะให้มากๆ นะครับ',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  const musicPerformingNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'end',
      title: 'ดนตรีและการแสดง',
      text_content:
        'ดนตรีและการแสดงเป็นเส้นทางที่เต็มไปด้วยความหลงใหล! คุณควรฝึกฝนทักษะอย่างสม่ำเสมอ หาโอกาสแสดง และเรียนรู้ทั้งด้านทฤษฎีและปฏิบัติ ขอให้ประสบความสำเร็จนะครับ!',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  // Technology path nodes
  const techNode = await supabase
    .from('path_npc_conversation_nodes')
    .insert({
      conversation_id: conversationId,
      npc_avatar_id: advisorAvatar.data!.id,
      node_type: 'end',
      title: 'เทคโนโลยีและนวัตกรรม',
      text_content:
        'เทคโนโลยีเป็นอนาคต! คุณสามารถเลือกได้หลายเส้นทาง เช่น Computer Science, Data Science, AI, หรือ Cybersecurity เริ่มเรียนรู้ programming และสร้างโปรเจ็กต์ของตัวเองตั้งแต่เร็วๆ ดีที่สุดครับ',
      metadata: { emotion: 'happy' },
    })
    .select()
    .single();

  console.log(`✅ Created ${8} conversation nodes\n`);

  // Step 5: Create choices (edges between nodes)
  console.log('Creating conversation choices...');

  const choices = [
    // Root node choices
    {
      from_node_id: rootNode.data!.id,
      to_node_id: academicNode.data!.id,
      choice_text: 'ผมสนใจด้านวิชาการ อยากเรียนต่อมหาวิทยาลัย',
      choice_label: 'Q1',
      display_order: 0,
    },
    {
      from_node_id: rootNode.data!.id,
      to_node_id: creativeNode.data!.id,
      choice_text: 'ผมสนใจด้านสร้างสรรค์ ศิลปะ ดนตรี การออกแบบ',
      choice_label: 'Q2',
      display_order: 1,
    },
    {
      from_node_id: rootNode.data!.id,
      to_node_id: techNode.data!.id,
      choice_text: 'ผมสนใจเทคโนโลยีและนวัตกรรม',
      choice_label: 'Q3',
      display_order: 2,
    },

    // Academic path choices
    {
      from_node_id: academicNode.data!.id,
      to_node_id: undergraduateNode.data!.id,
      choice_text: 'ระดับปริญญาตรี',
      choice_label: 'A',
      display_order: 0,
    },
    {
      from_node_id: academicNode.data!.id,
      to_node_id: undergraduateNode.data!.id,
      choice_text: 'ระดับปริญญาโท/เอก',
      choice_label: 'B',
      display_order: 1,
    },

    // Undergraduate node auto-continues to question
    {
      from_node_id: undergraduateNode.data!.id,
      to_node_id: undergraduateQuestionNode.data!.id,
      choice_text: 'ต่อไป',
      display_order: 0,
    },

    // Undergraduate question choices
    {
      from_node_id: undergraduateQuestionNode.data!.id,
      to_node_id: scholarshipPathNode.data!.id,
      choice_text: 'ไม่มีเงินทุน ต้องการทุนการศึกษา',
      choice_label: 'A',
      display_order: 0,
    },
    {
      from_node_id: undergraduateQuestionNode.data!.id,
      to_node_id: null, // End conversation
      choice_text: 'มีเงินทุนเพียงพอแล้ว',
      choice_label: 'B',
      display_order: 1,
    },

    // Scholarship path choices
    {
      from_node_id: scholarshipPathNode.data!.id,
      to_node_id: governmentScholarshipNode.data!.id,
      choice_text: 'ทุนรัฐบาล (กยศ./กรอ.)',
      choice_label: 'Q1',
      display_order: 0,
    },
    {
      from_node_id: scholarshipPathNode.data!.id,
      to_node_id: privateScholarshipNode.data!.id,
      choice_text: 'ทุนเอกชน/มูลนิธิ',
      choice_label: 'Q2',
      display_order: 1,
    },

    // Creative path choices
    {
      from_node_id: creativeNode.data!.id,
      to_node_id: artDesignNode.data!.id,
      choice_text: 'ศิลปะและการออกแบบ',
      choice_label: 'A',
      display_order: 0,
    },
    {
      from_node_id: creativeNode.data!.id,
      to_node_id: musicPerformingNode.data!.id,
      choice_text: 'ดนตรีและการแสดง',
      choice_label: 'B',
      display_order: 1,
    },
  ];

  const { error: choicesError } = await supabase
    .from('path_npc_conversation_choices')
    .insert(choices);

  if (choicesError) {
    console.error('❌ Error creating choices:', choicesError);
    return;
  }

  console.log(`✅ Created ${choices.length} conversation choices\n`);

  // Step 6: Update conversation with root node
  await supabase
    .from('path_npc_conversations')
    .update({ root_node_id: rootNode.data!.id })
    .eq('id', conversationId);

  console.log('✅ Updated conversation with root node\n');

  console.log('🎉 NPC conversation seeded successfully!');
  console.log(`\nConversation ID: ${conversationId}`);
  console.log(`Root Node ID: ${rootNode.data!.id}`);
  console.log('\nYou can now use this conversation in your PathLab activities!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding conversation:', error);
    process.exit(1);
  });
