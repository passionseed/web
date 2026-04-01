create table if not exists public.hackathon_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  icon text,
  color text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert initial Tracks
insert into public.hackathon_tracks (id, title, subtitle, icon, color, display_order) values
  ('d86f7b19-1bb6-466c-aeaf-d9efeb818274', 'Traditional & Integrative Healthcare', 'แพทย์แผนไทยและการแพทย์เชิงป้องกัน', 'HeartPulse', '#91C4E3', 1),
  ('adfdc917-cfc4-4e78-9eec-4a949615a67c', 'Mental Health', 'สุขภาพจิตและความเป็นอยู่ที่ดี', 'Brain', '#A594BA', 2),
  ('b3db99bd-fa4e-4fbc-91cb-d3fce58bfdfa', 'Community, Public & Environmental Health', 'สุขภาพชุมชนและสิ่งแวดล้อม', 'Globe', '#91C4E3', 3)
on conflict (id) do nothing;

create table if not exists public.hackathon_challenges (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  num text not null,
  title_en text not null,
  title_th text,
  hook_en text,
  hook_th text,
  challenge_en text not null,
  challenge_th text,
  tangible_equivalent_en text,
  tangible_equivalent_th text,
  tags text[] not null default '{}',
  severity integer,
  difficulty integer,
  impact integer,
  urgency integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, num)
);

-- Insert initial Challenges
insert into public.hackathon_challenges (track_id, num, title_en, title_th, hook_en, hook_th, challenge_en, challenge_th, tangible_equivalent_en, tangible_equivalent_th, tags, severity, difficulty, impact, urgency) values
  ('d86f7b19-1bb6-466c-aeaf-d9efeb818274', 'P1', 'The Last-Mile Chronic Disease Gap', 'สู้กับโรคเรื้อรังในพื้นที่ห่างไกล', 'Over 70% of Thai elderly live in rural areas far from chronic disease screening systems, causing diseases to be detected too late.', 'ผู้สูงอายุไทยกว่า 70% อาศัยในชนบทห่างไกลจากระบบการตรวจคัดกรองโรคเรื้อรัง ส่งผลให้โรคถูกตรวจพบในระยะที่สายเกินไป', 'How might we design a low-cost, community-deployable screening tool that enables rural communities to detect chronic disease risk early — without requiring hospital infrastructure?', 'เราจะออกแบบเครื่องมือคัดกรองต้นทุนต่ำที่ชุมชนสามารถนำไปใช้เองได้ เพื่อช่วยให้คนในชนบทตรวจพบความเสี่ยงโรคเรื้อรังได้ตั้งแต่เนิ่น ๆ โดยไม่ต้องพึ่งโรงพยาบาลได้อย่างไร?', 'Like leaving your grandparents'' check engine light on until the car breaks down.', 'เหมือนปล่อยให้ไฟเตือนเครื่องยนต์ของปู่ย่าตายายสว่างค้างไว้ จนกว่ารถจะพัง', '{"Rural Health", "Screening", "Low-cost Tech"}', 8, 8, 9, 8),
  ('d86f7b19-1bb6-466c-aeaf-d9efeb818274', 'P2', 'The Traditional Medicine Data Desert', 'แพทย์แผนไทย ไร้Data', 'Thailand has over 30,000 traditional medicine practitioners, but treatment data is rarely recorded or connected to modern health systems.', 'ประเทศไทยมีผู้ประกอบวิชาชีพแพทย์แผนไทยกว่า 30,000 คน แต่ข้อมูลการรักษาแทบไม่ถูกบันทึกหรือเชื่อมต่อกับระบบสุขภาพสมัยใหม่', 'How might we create a bridge that digitizes traditional medicine treatment outcomes and makes them interoperable with modern health records — enabling integrated, evidence-based care?', 'เราจะสร้างระบบที่แปลงข้อมูลการรักษาแพทย์แผนไทยให้เป็นดิจิทัล และเชื่อมต่อกับบันทึกสุขภาพสมัยใหม่ได้ เพื่อนำไปสู่การดูแลสุขภาพแบบบูรณาการที่มีหลักฐานรองรับได้อย่างไร?', 'Like burning a library of 30,000 medical books every generation.', 'เหมือนการเผาห้องสมุดตำราแพทย์ 30,000 เล่มทิ้งในทุกๆ รุ่น', '{"Digital Health", "Interoperability", "Traditional Medicine"}', 8, 8, 9, 7),
  ('d86f7b19-1bb6-466c-aeaf-d9efeb818274', 'P3', 'Preventive Intervention at Scale', 'ตรวจและรักษา ก่อนจะสายเกินไป', 'Only 1 in 5 Thais at high risk of NCDs receives preventive intervention before the disease develops.', 'มีคนไทยเพียง 1 ใน 5 ที่มีความเสี่ยงสูงต่อโรค NCDs ที่ได้รับการแทรกแซงเชิงป้องกันก่อนที่โรคจะพัฒนาขึ้น', 'How might we build a predictive health risk platform that identifies high-risk individuals early and triggers personalized preventive action — before symptoms appear?', 'เราจะสร้างแพลตฟอร์มประเมินความเสี่ยงด้านสุขภาพเชิงพยากรณ์ที่ระบุตัวบุคคลที่มีความเสี่ยงสูงได้แต่เนิ่น ๆ และกระตุ้นให้เกิดการป้องกันแบบเฉพาะบุคคลก่อนที่อาการจะปรากฏได้อย่างไร?', 'Like ignoring a leaky roof until the house floods. 400,000 lives lost yearly.', 'เหมือนเพิกเฉยต่อหลังคารั่วจนน้ำท่วมบ้าน 400,000 ชีวิตสูญเสียทุกปี', '{"Predictive Analytics", "NCDs", "Behavioral Change"}', 9, 8, 9, 9),
  
  ('adfdc917-cfc4-4e78-9eec-4a949615a67c', 'P4', 'The Stigma Wall', 'กำแพงแห่งอคติ', '37% of Thai students experience burnout, but more than 85% have never sought help out of fear of social judgment.', '37% ของนักศึกษาไทยมีอาการ Burnout แต่มากกว่า 85% ไม่เคยขอความช่วยเหลือ เพราะกลัวการถูกตัดสินจากสังคม', 'How might we design a destigmatized early mental health detection and support system that meets young people where they are — without labeling or exposing them?', 'เราจะออกแบบระบบตรวจจับปัญหาสุขภาพจิตระยะแรกและระบบสนับสนุน ที่คนหนุ่มสาวเข้าถึงได้โดยไม่ต้องกลัวการถูกตัดสินหรือถูกเปิดเผยตัวตนได้อย่างไร?', 'Like having a broken leg, but society tells you it''s ''just in your head''.', 'เหมือนขาหัก แต่สังคมบอกคุณว่า ''คุณแค่คิดไปเอง''', '{"Destigmatization", "Youth", "Early Detection"}', 9, 8, 9, 9),
  ('adfdc917-cfc4-4e78-9eec-4a949615a67c', 'P5', 'Connected But Alone', 'เชื่อมต่อแต่โดดเดี่ยว', 'Teen loneliness in Thailand has reached crisis levels despite increased social media use — because online connections don''t resolve real-life social isolation.', 'ความเหงาในวัยรุ่นไทยถึงระดับวิกฤตแม้จะใช้ Social Media มากขึ้น เพราะการเชื่อมต่อออนไลน์ไม่ได้แก้ปัญหาการแยกตัวจากสังคมในชีวิตจริง', 'How might we design an intervention that addresses root-cause social isolation — not just surface-level connection — for teenagers and young adults?', 'เราจะออกแบบการแทรกแซงที่แก้ไขการโดดเดี่ยวทางสังคมในเชิงต้นเหตุ ไม่ใช่แค่การเชื่อมต่อแบบผิวเผิน สำหรับวัยรุ่นและผู้ใหญ่ตอนต้นได้อย่างไร?', 'The mortality impact is equivalent to smoking 15 cigarettes a day.', 'ผลกระทบต่ออัตราการตายเทียบเท่ากับการสูบบุหรี่ 15 มวนต่อวัน', '{"Social Isolation", "Teenagers", "Intervention"}', 9, 8, 10, 10),
  ('adfdc917-cfc4-4e78-9eec-4a949615a67c', 'P6', 'Mental Healthcare in the Last Mile', 'สุขภาพจิตในพื้นที่ห่างไกล', 'Rural Thailand has only 1 psychiatrist per 200,000 people, leaving those who need help with no way to access care.', 'พื้นที่ชนบทของไทยมีจิตแพทย์เพียง 1 คนต่อประชากร 200,000 คน ทำให้คนที่ต้องการความช่วยเหลือไม่มีทางเข้าถึงการดูแล', 'How might we build a scalable, culturally appropriate mental wellness support system for underserved communities — where professional help is inaccessible?', 'เราจะสร้างระบบสนับสนุนสุขภาพจิตที่ปรับขนาดได้และเหมาะสมกับวัฒนธรรม สำหรับชุมชนที่ขาดแคลนซึ่งเข้าถึงความช่วยเหลือจากผู้เชี่ยวชาญไม่ได้อย่างไร?', 'Imagine 1 doctor trying to treat a packed stadium of 200,000 people.', 'ลองจินตนาการถึงหมอ 1 คนที่พยายามรักษาคน 200,000 คนในสเตเดียมที่อัดแน่น', '{"Access", "Rural Communities", "Scalable Care"}', 9, 8, 9, 9),
  
  ('b3db99bd-fa4e-4fbc-91cb-d3fce58bfdfa', 'P7', 'Data Rich, Action Poor', 'ข้อมูลมากมาย ไหนล่ะการกระทำ?', 'Real-time air quality data is already available, but communities can''t translate that data into protective actions.', 'ข้อมูลคุณภาพอากาศแบบ Real-time มีพร้อมแล้ว แต่ชุมชนไม่สามารถแปลงข้อมูลเหล่านั้นเป็นการกระทำเพื่อป้องกันตัวได้', 'How might we turn real-time environmental health data into actionable community behavior change — at the neighborhood level, not just on a dashboard?', 'เราจะแปลงข้อมูลสุขภาพสิ่งแวดล้อมแบบ Real-time ให้กลายเป็นการเปลี่ยนพฤติกรรมของชุมชนที่ลงมือทำได้จริงในระดับย่าน ไม่ใช่แค่บน Dashboard ได้อย่างไร?', 'Like having a fire alarm that rings, but gives you no water to put out the fire.', 'เหมือนมีสัญญาณเตือนไฟไหม้ดังขึ้น แต่ไม่มีน้ำให้คุณดับไฟ', '{"Environmental Data", "Behavior Change", "Community"}', 9, 7, 9, 8),
  ('b3db99bd-fa4e-4fbc-91cb-d3fce58bfdfa', 'P8', 'The Food Safety Blind Spot', 'อร่อยให้หก สกปรก...หรือเปล่า?', '40% of Thai street food markets lack consistent food safety inspection, resulting in tens of thousands of food-related illnesses per year.', '40% ของตลาดอาหารริมทางในไทยขาดระบบตรวจสอบความปลอดภัยที่สม่ำเสมอ ส่งผลให้มีผู้ป่วยจากอาหารหลายหมื่นคนต่อปี', 'How might we design a community-powered food safety monitoring and early warning system that works without requiring top-down government enforcement?', 'เราจะออกแบบระบบติดตามและเตือนภัยความปลอดภัยอาหารที่ขับเคลื่อนโดยชุมชน โดยไม่ต้องรอการบังคับใช้จากภาครัฐได้อย่างไร?', 'Like playing Russian Roulette with your lunch every day.', 'เหมือนเล่นรัสเซียนรูเล็ตต์กับอาหารกลางวันของคุณทุกวัน', '{"Food Safety", "Community Monitoring", "Public Health"}', 8, 7, 8, 7),
  ('b3db99bd-fa4e-4fbc-91cb-d3fce58bfdfa', 'P9', 'PM2.5 vs. Our Children', 'เมืองหลวงควันและฝุ่นมากมาย', 'PM2.5 dust disproportionately affects school children, but most schools lack timely warning systems or prevention plans.', 'ฝุ่น PM2.5 ส่งผลกระทบต่อเด็กนักเรียนอย่างไม่สมส่วน แต่โรงเรียนส่วนใหญ่ไม่มีระบบแจ้งเตือนหรือแผนป้องกันที่ทันการณ์', 'How might we build a predictive PM2.5 alert and response system that triggers preemptive protective actions for schools and children — before dangerous exposure occurs?', 'เราจะสร้างระบบแจ้งเตือนและตอบสนอง PM2.5 เชิงพยากรณ์ที่กระตุ้นให้เกิดการป้องกันล่วงหน้าสำหรับโรงเรียนและเด็กก่อนที่จะเกิดการสัมผัสอันตรายได้อย่างไร?', 'Like forcing 13.6 million kids to smoke cigarettes before recess.', 'เหมือนบังคับให้เด็ก 13.6 ล้านคนสูบบุหรี่ก่อนพักเบรก', '{"Air Quality", "Children", "Predictive Alerts"}', 9, 7, 9, 10)
on conflict (track_id, num) do nothing;

alter table public.hackathon_team_program_enrollments
  add column if not exists selected_challenge_id uuid references public.hackathon_challenges(id) on delete set null;

create table if not exists public.hackathon_team_reflections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  phase_id uuid not null references public.hackathon_program_phases(id) on delete cascade,
  prev_hypothesis text not null,
  new_reality text not null,
  key_insight text not null,
  member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hackathon_tracks_display_order
  on public.hackathon_tracks(display_order);

create index if not exists idx_hackathon_challenges_track
  on public.hackathon_challenges(track_id, num);

create index if not exists idx_hackathon_enrollments_selected_challenge
  on public.hackathon_team_program_enrollments(selected_challenge_id);

create index if not exists idx_hackathon_team_reflections_phase_team
  on public.hackathon_team_reflections(phase_id, team_id, created_at desc);

-- Basic RLS
alter table public.hackathon_tracks enable row level security;
alter table public.hackathon_challenges enable row level security;
alter table public.hackathon_team_reflections enable row level security;

create policy "Allow public read access on hackathon tracks"
  on public.hackathon_tracks for select using (true);

create policy "Allow public read access on hackathon challenges"
  on public.hackathon_challenges for select using (true);

create policy "Allow public read access on team reflections"
  on public.hackathon_team_reflections for select using (true);

create policy "Allow all operations for team reflections"
  on public.hackathon_team_reflections for all using (true) with check (true);
