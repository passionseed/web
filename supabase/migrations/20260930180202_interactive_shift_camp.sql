-- SHIFT reuses classrooms, teams, community projects and posts. The only
-- privileged API lives in a non-exposed schema and checks the authenticated
-- actor on every operation; legacy web writes cannot bypass its invariants.
create schema if not exists shift_private;
revoke all on schema shift_private from public, anon;
grant usage on schema shift_private to authenticated;

create table if not exists public.shift_camp_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  starts_on date not null,
  classroom_id uuid not null unique references public.classrooms(id),
  community_id uuid not null unique references public.communities(id),
  map_id uuid not null references public.learning_maps(id),
  created_at timestamptz not null default now()
);
create table if not exists public.shift_camp_enrollments (
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  user_id uuid not null references auth.users(id),
  role text not null default 'participant' check (role in ('participant','mentor')),
  introduction jsonb not null default '{}',
  introduced_at timestamptz,
  primary key (cohort_id,user_id)
);
create table if not exists public.shift_camp_invitations (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  kind text not null check (kind in ('group','project')),
  target_id uuid not null,
  invited_by uuid not null references auth.users(id),
  invitee uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (cohort_id,kind,target_id,invitee)
);
create table if not exists public.shift_camp_updates (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  project_id uuid not null references public.community_projects(id),
  day integer not null check (day between 1 and 7),
  post_id uuid unique references public.community_posts(id),
  body jsonb not null default '{}',
  contributor_ids uuid[] not null default '{}',
  author_id uuid not null references auth.users(id),
  revision integer not null default 1,
  hidden boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id,day)
);
create table if not exists public.shift_camp_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  group_id uuid not null references public.classroom_teams(id),
  author_id uuid not null references auth.users(id),
  body text not null check (length(body) between 1 and 4000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.shift_camp_requests (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  user_id uuid not null references auth.users(id),
  project_id uuid references public.community_projects(id),
  update_id uuid references public.shift_camp_updates(id),
  kind text not null check (kind in ('help','report')),
  body text not null check (length(body) between 1 and 4000),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.shift_camp_checkpoints (
  project_id uuid not null references public.community_projects(id),
  day integer not null check (day in (1,4,7)),
  mentor_id uuid not null references auth.users(id),
  feedback text not null check (length(feedback) between 1 and 4000),
  reviewed_at timestamptz not null default now(),
  primary key (project_id,day)
);
create table if not exists public.shift_camp_checkins (
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  user_id uuid not null references auth.users(id),
  day integer not null check (day in (1,4,7)),
  choice integer check (choice between 1 and 5),
  capability integer check (capability between 1 and 5),
  support integer check (support between 1 and 5),
  primary key (cohort_id,user_id,day)
);
alter table public.community_projects add column if not exists shift_cohort_id uuid references public.shift_camp_cohorts(id);
alter table public.community_projects add column if not exists shift_scope text not null default '';
alter table public.community_projects add column if not exists shift_skills text[] not null default '{}';
alter table public.post_comments add column if not exists shift_hidden boolean not null default false;
create index if not exists shift_project_cohort on public.community_projects(shift_cohort_id);
create index if not exists shift_enrollment_user on public.shift_camp_enrollments(user_id);
create index if not exists shift_updates_cohort_published on public.shift_camp_updates(cohort_id,published_at);
create index if not exists shift_requests_queue on public.shift_camp_requests(cohort_id,resolved_at);
create index if not exists shift_messages_group on public.shift_camp_messages(group_id,created_at);
alter table public.map_nodes add column if not exists shift_camp_day integer check (shift_camp_day between 1 and 7);
create unique index if not exists shift_curriculum_day on public.map_nodes(map_id,shift_camp_day) where shift_camp_day is not null;

create or replace function shift_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
$$;
create or replace function shift_private.is_staff(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select shift_private.is_admin() or exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=auth.uid() and role='mentor')
$$;
create or replace function shift_private.can_read(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (shift_private.is_staff(cid) or exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=auth.uid()))
$$;
create or replace function shift_private.community_cohort(comm uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select id from public.shift_camp_cohorts where community_id=comm
$$;
create or replace function shift_private.team_cohort(tid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select c.id from public.shift_camp_cohorts c join public.classroom_teams t on t.classroom_id=c.classroom_id where t.id=tid
$$;
create or replace function shift_private.classroom_cohort(classroom uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select id from public.shift_camp_cohorts where classroom_id=classroom
$$;
create or replace function shift_private.project_cohort(pid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select shift_cohort_id from public.community_projects where id=pid
$$;
create or replace function shift_private.post_cohort(pid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select shift_private.community_cohort(community_id) from public.community_posts where id=pid
$$;
create or replace function shift_private.my_group(cid uuid, uid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select t.id from public.classroom_teams t join public.shift_camp_cohorts c on c.classroom_id=t.classroom_id
 join public.team_memberships m on m.team_id=t.id where c.id=cid and m.user_id=uid and m.left_at is null and t.is_active limit 1
$$;
create or replace function shift_private.my_project(cid uuid, uid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select p.id from public.community_projects p join public.project_members m on m.project_id=p.id where p.shift_cohort_id=cid and m.user_id=uid limit 1
$$;

-- Deny direct writes: all camp mutations go through the transactional API.
do $$ declare tbl text; begin
 foreach tbl in array array['shift_camp_cohorts','shift_camp_enrollments','shift_camp_invitations','shift_camp_updates','shift_camp_messages','shift_camp_requests','shift_camp_checkpoints','shift_camp_checkins'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from anon, authenticated',tbl);
  execute format('grant select on public.%I to authenticated',tbl);
 end loop;
end $$;
drop policy if exists camp_read on public.shift_camp_cohorts;
create policy camp_read on public.shift_camp_cohorts for select to authenticated using(shift_private.can_read(id));
drop policy if exists camp_read on public.shift_camp_enrollments;
create policy camp_read on public.shift_camp_enrollments for select to authenticated using(user_id=auth.uid() or shift_private.is_staff(cohort_id));
drop policy if exists camp_read on public.shift_camp_invitations;
create policy camp_read on public.shift_camp_invitations for select to authenticated using(invitee=auth.uid() or invited_by=auth.uid() or shift_private.is_staff(cohort_id));
drop policy if exists camp_read on public.shift_camp_updates;
create policy camp_read on public.shift_camp_updates for select to authenticated using(shift_private.can_read(cohort_id) and (shift_private.is_staff(cohort_id) or (not hidden and (published_at is not null or shift_private.my_project(cohort_id,auth.uid())=project_id))));
drop policy if exists camp_read on public.shift_camp_messages;
create policy camp_read on public.shift_camp_messages for select to authenticated using(shift_private.is_staff(cohort_id) or (not hidden and shift_private.my_group(cohort_id,auth.uid())=group_id));
drop policy if exists camp_read on public.shift_camp_requests;
create policy camp_read on public.shift_camp_requests for select to authenticated using(user_id=auth.uid() or shift_private.is_staff(cohort_id));
drop policy if exists camp_read on public.shift_camp_checkpoints;
create policy camp_read on public.shift_camp_checkpoints for select to authenticated using(shift_private.can_read(shift_private.project_cohort(project_id)));
drop policy if exists camp_read on public.shift_camp_checkins;
create policy camp_read on public.shift_camp_checkins for select to authenticated using(user_id=auth.uid() or shift_private.is_staff(cohort_id));

-- Restrictive policies AND with legacy permissive policies, preserving all
-- non-camp behavior while making camp content private on web and mobile alike.
do $$ declare tbl text; expr text; begin
 for tbl,expr in select * from (values
 ('communities','shift_private.community_cohort(id)'),
 ('user_communities','shift_private.community_cohort(community_id)'),
 ('community_posts','shift_private.community_cohort(community_id)'),
 ('community_projects','coalesce(shift_cohort_id,shift_private.community_cohort(community_id))'),
 ('project_members','shift_private.project_cohort(project_id)'),
 ('post_comments','shift_private.post_cohort(post_id)'),
 ('classrooms','shift_private.classroom_cohort(id)'),
 ('classroom_memberships','shift_private.classroom_cohort(classroom_id)'),
 ('classroom_teams','shift_private.classroom_cohort(classroom_id)'),
 ('team_memberships','shift_private.team_cohort(team_id)')
 ) x(t,e) loop
  execute format('drop policy if exists shift_read_guard on public.%I',tbl);
  execute format('drop policy if exists shift_insert_guard on public.%I',tbl);
  execute format('drop policy if exists shift_update_guard on public.%I',tbl);
  execute format('drop policy if exists shift_delete_guard on public.%I',tbl);
  execute format('create policy shift_read_guard on public.%I as restrictive for select using (%s is null or shift_private.can_read(%s))',tbl,expr,expr);
  execute format('create policy shift_insert_guard on public.%I as restrictive for insert with check (%s is null)',tbl,expr);
  execute format('create policy shift_update_guard on public.%I as restrictive for update using (%s is null) with check (%s is null)',tbl,expr,expr);
  execute format('create policy shift_delete_guard on public.%I as restrictive for delete using (%s is null)',tbl,expr);
 end loop;
end $$;

create or replace function shift_private.snapshot(cid uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; uid uuid:=auth.uid(); staff boolean:=shift_private.is_staff(cid); begin
 if not shift_private.can_read(cid) then raise exception 'Not enrolled in this cohort' using errcode='42501'; end if;
 select jsonb_build_object(
 'cohort',to_jsonb(c),'is_staff',staff,'user_id',uid,
 'introduction',(select introduction from public.shift_camp_enrollments where cohort_id=cid and user_id=uid),
 'introduced_at',(select introduced_at from public.shift_camp_enrollments where cohort_id=cid and user_id=uid),
 'participants',coalesce((select jsonb_agg(jsonb_build_object('id',e.user_id,'name',coalesce(nullif(p.full_name,''),'Participant'),'role',e.role,'group_id',shift_private.my_group(cid,e.user_id),'project_id',shift_private.my_project(cid,e.user_id),'introduction',case when staff or e.user_id=uid then e.introduction else null end)) from public.shift_camp_enrollments e left join public.profiles p on p.id=e.user_id where e.cohort_id=cid),'[]'),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'members',coalesce((select jsonb_agg(m.user_id) from public.team_memberships m where m.team_id=t.id and m.left_at is null),'[]'))) from public.classroom_teams t where t.classroom_id=c.classroom_id and t.is_active),'[]'),
 'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'owner_id',p.created_by,'scope',p.shift_scope,'skills',p.shift_skills,'members',coalesce((select jsonb_agg(m.user_id) from public.project_members m where m.project_id=p.id),'[]'))) from public.community_projects p where p.shift_cohort_id=cid),'[]'),
 'updates',coalesce((select jsonb_agg(to_jsonb(u) order by u.updated_at desc) from public.shift_camp_updates u where u.cohort_id=cid and (staff or (not u.hidden and (u.published_at is not null or u.project_id=shift_private.my_project(cid,uid))))),'[]'),
 'comments',coalesce((select jsonb_agg(jsonb_build_object('id',pc.id,'post_id',pc.post_id,'author_id',pc.author_id,'body',pc.content,'hidden',pc.shift_hidden,'created_at',pc.created_at) order by pc.created_at) from public.post_comments pc join public.shift_camp_updates u on u.post_id=pc.post_id where u.cohort_id=cid and (staff or (not pc.shift_hidden and not u.hidden and u.published_at is not null))),'[]'),
 'invitations',coalesce((select jsonb_agg(to_jsonb(i)) from public.shift_camp_invitations i where i.cohort_id=cid and (staff or i.invitee=uid or i.invited_by=uid)),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.shift_camp_messages m where m.cohort_id=cid and (staff or (not m.hidden and m.group_id=shift_private.my_group(cid,uid)))),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.shift_camp_requests r where r.cohort_id=cid and (staff or r.user_id=uid)),'[]'),
 'checkpoints',coalesce((select jsonb_agg(to_jsonb(cp)) from public.shift_camp_checkpoints cp join public.community_projects p on p.id=cp.project_id where p.shift_cohort_id=cid),'[]'),
 'checkins',coalesce((select jsonb_agg(to_jsonb(ch)) from public.shift_camp_checkins ch where ch.cohort_id=cid and (staff or ch.user_id=uid)),'[]'),
 'nodes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'day',n.shift_camp_day) order by n.shift_camp_day) from public.map_nodes n where n.map_id=c.map_id),'[]'),
 'progress',coalesce((select jsonb_agg(jsonb_build_object('node_id',sp.node_id,'status',sp.status)) from public.student_node_progress sp join public.map_nodes n on n.id=sp.node_id where n.map_id=c.map_id and sp.user_id=uid),'[]')
 ) into result from public.shift_camp_cohorts c where c.id=cid;
 return result;
end $$;

create or replace function shift_private.camp_action(p_action text,p_cohort_id uuid,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
 uid uuid:=auth.uid(); cid uuid:=p_cohort_id; c public.shift_camp_cohorts;
 staff boolean; pid uuid; gid uuid; target uuid; member uuid;
 rec_id uuid; comm uuid; classroom uuid; mid uuid; post uuid;
 inv public.shift_camp_invitations; upd public.shift_camp_updates;
 day_num integer; camp_day integer; txt text; body jsonb; credits uuid[];
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>40000 then raise exception 'Invalid request'; end if;
 if p_action='list' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'starts_on',s.starts_on,'introduced_at',e.introduced_at,'is_staff',shift_private.is_staff(s.id)) order by s.starts_on desc) from public.shift_camp_cohorts s left join public.shift_camp_enrollments e on e.cohort_id=s.id and e.user_id=uid where shift_private.is_admin() or e.user_id=uid),'[]');
 end if;
 if p_action='create_cohort' then
  if not shift_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  txt:=btrim(p_payload->>'name'); mid:=nullif(p_payload->>'map_id','')::uuid;
  if txt is null or length(txt) not between 1 and 120 then raise exception 'Name required'; end if;
  if mid is null then
   insert into public.learning_maps(title,description,creator_id,map_type) values(txt||' curriculum','Choose, build, test, improve, and share.',uid,'private') returning id into mid;
   insert into public.map_nodes(map_id,title,instructions,shift_camp_day,metadata)
    select mid,x.title,x.instructions,x.day,jsonb_build_object('position',jsonb_build_object('x',100+(x.day-1)*250,'y',100)) from (values
    (1,'Scope Lock','Choose one problem, intended users, and a small testable scope.'),
    (2,'Reality Check','Talk to people experiencing the problem. Record what they said and revise if needed.'),
    (3,'Build Fast','Build a usable first version. Choose skills according to what your project needs.'),
    (4,'Ship to Strangers','Let people outside the project try it. Record where they get stuck.'),
    (5,'Fix Check','Record what broke, what changed, and why.'),
    (6,'Measure','Choose one meaningful outcome and measure it.'),
    (7,'Demo Day','Show the real result, testing evidence, changes, and what you learned.')
    ) x(day,title,instructions);
  elsif (select count(*) from public.map_nodes where map_id=mid and shift_camp_day is not null)<>7 then raise exception 'Existing curriculum needs seven SHIFT day nodes'; end if;
  cid:=gen_random_uuid();
  insert into public.classrooms(name,instructor_id) values(txt,uid) returning id into classroom;
  insert into public.communities(name,is_public) values(txt||' '||left(cid::text,8),false) returning id into comm;
  insert into public.shift_camp_cohorts(id,name,starts_on,classroom_id,community_id,map_id) values(cid,txt,(p_payload->>'starts_on')::date,classroom,comm,mid);
  insert into public.classroom_memberships(classroom_id,user_id,role) values(classroom,uid,'instructor');
  insert into public.user_communities(community_id,user_id,role) values(comm,uid,'owner');
  return shift_private.snapshot(cid);
 end if;
 if not shift_private.can_read(cid) then raise exception 'Not enrolled in this cohort' using errcode='42501'; end if;
 -- Serialize membership and publication changes within a cohort. An invitation
 -- accepted on two devices cannot overfill a group or produce two projects.
 select * into c from public.shift_camp_cohorts where id=cid for update;
 staff:=shift_private.is_staff(cid);
 camp_day:=((now() at time zone 'Asia/Bangkok')::date-c.starts_on)+1;
 if p_action='snapshot' then return shift_private.snapshot(cid); end if;
 pid:=shift_private.my_project(cid,uid); gid:=shift_private.my_group(cid,uid);
 if p_action='enroll' then
  if not shift_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  member:=(p_payload->>'user_id')::uuid;
  if not exists(select 1 from public.profiles where id=member) then raise exception 'Use an existing authenticated account ID'; end if;
  if coalesce(p_payload->>'role','participant') not in ('participant','mentor') then raise exception 'Invalid role'; end if;
  insert into public.shift_camp_enrollments(cohort_id,user_id,role) values(cid,member,coalesce(p_payload->>'role','participant')) on conflict(cohort_id,user_id) do update set role=excluded.role;
  insert into public.classroom_memberships(classroom_id,user_id,role) values(c.classroom_id,member,case when p_payload->>'role'='mentor' then 'ta' else 'student' end) on conflict(classroom_id,user_id) do update set role=excluded.role;
  insert into public.user_communities(community_id,user_id,role) values(c.community_id,member,'member') on conflict(user_id,community_id) do nothing;
  insert into public.user_map_enrollments(user_id,map_id) values(member,c.map_id) on conflict do nothing;
 elsif p_action='introduction' then
  if coalesce(p_payload->>'language','') not in ('en','th') or length(coalesce(p_payload->>'availability',''))>500 or length(coalesce(p_payload->>'interests',''))>1000 or length(coalesce(p_payload->>'idea',''))>2000 then raise exception 'Invalid introduction'; end if;
  update public.shift_camp_enrollments set introduction=jsonb_build_object('version',1,'step',least(4,greatest(0,coalesce((p_payload->>'step')::integer,0))),'language',p_payload->>'language','availability',coalesce(p_payload->>'availability',''),'interests',coalesce(p_payload->>'interests',''),'idea',coalesce(p_payload->>'idea','')),introduced_at=case when p_payload->>'finished'='true' then now() else introduced_at end where cohort_id=cid and user_id=uid;
  if p_payload->>'finished'='true' then
   update public.profiles set preferred_language=p_payload->>'language',is_onboarded=true,onboarded_at=coalesce(onboarded_at,now()),mobile_settings=coalesce(mobile_settings,'{"push_enabled":false,"reminder_time":"09:00","theme":"light"}'::jsonb) where id=uid;
  end if;
 elsif p_action='create_group' then
  if camp_day>0 and not staff then raise exception 'Ask staff to change groups after the camp starts'; end if;
  member:=case when staff and p_payload ? 'user_id' then (p_payload->>'user_id')::uuid else uid end;
  if not exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=member and role='participant') or shift_private.my_group(cid,member) is not null then raise exception 'Participant already grouped or not enrolled'; end if;
  txt:=btrim(p_payload->>'name'); if txt is null or length(txt) not between 1 and 100 then raise exception 'Group name required'; end if;
  insert into public.classroom_teams(classroom_id,name,created_by,max_members) values(c.classroom_id,txt,uid,3) returning id into gid;
  insert into public.team_memberships(team_id,user_id) values(gid,member);
 elsif p_action='assign_group' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  gid:=(p_payload->>'group_id')::uuid; member:=(p_payload->>'user_id')::uuid;
  if shift_private.team_cohort(gid) is distinct from cid or not exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=member and role='participant') then raise exception 'Invalid group or participant'; end if;
  if shift_private.my_group(cid,member) is distinct from gid and (select count(*) from public.team_memberships where team_id=gid and left_at is null)>=3 then raise exception 'Group is full'; end if;
  update public.team_memberships set left_at=now() where user_id=member and left_at is null and team_id in(select id from public.classroom_teams where classroom_id=c.classroom_id);
  insert into public.team_memberships(team_id,user_id) values(gid,member);
 elsif p_action='invite' then
  target:=(p_payload->>'target_id')::uuid; member:=(p_payload->>'invitee')::uuid;
  if member=uid or not exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=member and role='participant') then raise exception 'Invite an enrolled peer'; end if;
  if p_payload->>'kind'='group' then
   if target is distinct from gid or camp_day>0 then raise exception 'Group invitations are available before camp'; end if;
  elsif p_payload->>'kind'='project' then
   if target is distinct from pid or gid is null or shift_private.my_group(cid,member) is distinct from gid then raise exception 'Invite a member of your peer group to your project'; end if;
  else raise exception 'Invalid invitation kind'; end if;
  insert into public.shift_camp_invitations(cohort_id,kind,target_id,invited_by,invitee) values(cid,p_payload->>'kind',target,uid,member) on conflict(cohort_id,kind,target_id,invitee) do update set status='pending',invited_by=uid;
 elsif p_action='answer_invite' then
  select * into inv from public.shift_camp_invitations where id=(p_payload->>'id')::uuid and cohort_id=cid and invitee=uid and status='pending' for update;
  if not found then raise exception 'Invitation is no longer pending'; end if;
  if p_payload->>'accept'='true' then
   if inv.kind='group' then
    if camp_day>0 or gid is not null or shift_private.team_cohort(inv.target_id) is distinct from cid then raise exception 'Ask staff to change your group'; end if;
    if (select count(*) from public.team_memberships where team_id=inv.target_id and left_at is null)>=3 then raise exception 'Group is full'; end if;
    insert into public.team_memberships(team_id,user_id) values(inv.target_id,uid);
   else
    if pid is not null or gid is null or shift_private.my_group(cid,inv.invited_by) is distinct from gid or shift_private.project_cohort(inv.target_id) is distinct from cid or shift_private.my_project(cid,inv.invited_by) is distinct from inv.target_id then raise exception 'Already on a project, or invitation no longer valid'; end if;
    if (select count(*) from public.project_members where project_id=inv.target_id)>=3 then raise exception 'Project already has three members'; end if;
    insert into public.project_members(project_id,user_id,role) values(inv.target_id,uid,'member');
   end if;
  end if;
  update public.shift_camp_invitations set status=case when p_payload->>'accept'='true' then 'accepted' else 'declined' end where id=inv.id;
 elsif p_action='create_project' then
  if pid is not null or gid is null then raise exception 'Join a peer group first; each participant has one active project'; end if;
  txt:=btrim(p_payload->>'title'); if txt is null or length(txt) not between 1 and 120 then raise exception 'Project title required'; end if;
  insert into public.community_projects(community_id,created_by,title,description,shift_cohort_id) values(c.community_id,uid,txt,left(coalesce(p_payload->>'description',''),2000),cid) returning id into pid;
  insert into public.project_members(project_id,user_id,role) values(pid,uid,'owner');
 elsif p_action='edit_project' then
  if pid is null then raise exception 'Project required'; end if;
  if length(coalesce(p_payload->>'scope',''))>4000 or jsonb_typeof(coalesce(p_payload->'skills','[]'))<>'array' or jsonb_array_length(coalesce(p_payload->'skills','[]'))>6 then raise exception 'Invalid scope or skills'; end if;
  update public.community_projects set shift_scope=coalesce(p_payload->>'scope',''),shift_skills=array(select jsonb_array_elements_text(coalesce(p_payload->'skills','[]'))),updated_at=now() where id=pid;
 elsif p_action='save_update' then
  if pid is null then raise exception 'Project required'; end if;
  day_num:=(p_payload->>'day')::integer;
  if day_num not between 1 and 7 or day_num>camp_day then raise exception 'Choose a camp day that has started'; end if;
  body:=p_payload->'body';
  if body is null or jsonb_typeof(body)<>'object' then raise exception 'Update required'; end if;
  credits:=array(select jsonb_array_elements_text(coalesce(p_payload->'contributors',jsonb_build_array(uid)))::uuid);
  if cardinality(credits)=0 or cardinality(credits)>3 or exists(select 1 from unnest(credits) credit where not exists(select 1 from public.project_members m where m.project_id=pid and m.user_id=credit)) then raise exception 'Choose contributors from this project'; end if;
  foreach txt in array array['shipped','broke','learned','help','problem','evidence','changes','link'] loop
   if length(coalesce(body->>txt,''))>4000 then raise exception 'Update field too long'; end if;
  end loop;
  if coalesce(body->>'link','')<>'' and body->>'link' !~ '^https?://[^[:space:]]+$' then raise exception 'Use an http or https project link'; end if;
  if body ? 'screenshots' then
   if jsonb_typeof(body->'screenshots')<>'array' or jsonb_array_length(body->'screenshots')>4 then raise exception 'Maximum four screenshots'; end if;
   for txt in select jsonb_array_elements_text(body->'screenshots') loop
    if txt not like cid::text||'/'||pid::text||'/%' or not exists(select 1 from storage.objects where bucket_id='shift-camp' and name=txt) then raise exception 'Upload screenshots to this project first'; end if;
   end loop;
  end if;
  select * into upd from public.shift_camp_updates where project_id=pid and day=day_num for update;
  if found and upd.revision<>coalesce((p_payload->>'revision')::integer,0) then raise exception 'This update changed. Reload before editing.' using errcode='40001'; end if;
  if upd.hidden then raise exception 'Staff hid this presentation. Ask staff for help.'; end if;
  if p_payload->>'publish'='true' and length(btrim(coalesce(body->>'shipped','')))=0 then raise exception 'Tell the group what you tried or made'; end if;
  if p_payload->>'publish'='true' and day_num=7 and (length(btrim(coalesce(body->>'problem','')))=0 or length(btrim(coalesce(body->>'learned','')))=0) then raise exception 'Final demo needs a problem and what you learned'; end if;
  rec_id:=coalesce(upd.id,gen_random_uuid()); post:=upd.post_id;
  if p_payload->>'publish'='true' or upd.published_at is not null then
   if post is null then
    insert into public.community_posts(community_id,author_id,title,content,metadata) values(c.community_id,uid,'Day '||day_num,body->>'shipped',jsonb_build_object('shift_update_id',rec_id)) returning id into post;
   else
    update public.community_posts set content=body->>'shipped',is_edited=true,updated_at=now() where id=post;
   end if;
  end if;
  insert into public.shift_camp_updates(id,cohort_id,project_id,day,post_id,body,contributor_ids,author_id,published_at)
   values(rec_id,cid,pid,day_num,post,body,credits,uid,case when p_payload->>'publish'='true' then now() else null end)
   on conflict(project_id,day) do update set body=excluded.body,post_id=excluded.post_id,author_id=uid,contributor_ids=excluded.contributor_ids,revision=public.shift_camp_updates.revision+1,published_at=coalesce(public.shift_camp_updates.published_at,excluded.published_at),updated_at=now();
 elsif p_action='comment' then
  select * into upd from public.shift_camp_updates where id=(p_payload->>'update_id')::uuid and cohort_id=cid and published_at is not null and not hidden;
  txt:=btrim(p_payload->>'body');
  if not found or txt is null or length(txt) not between 1 and 4000 then raise exception 'Published presentation and response required'; end if;
  insert into public.post_comments(post_id,author_id,content) values(upd.post_id,uid,txt);
 elsif p_action='message' then
  txt:=btrim(p_payload->>'body');
  if staff and p_payload ? 'group_id' then gid:=(p_payload->>'group_id')::uuid; end if;
  if gid is null or shift_private.team_cohort(gid) is distinct from cid or txt is null or length(txt) not between 1 and 4000 then raise exception 'Group and message required'; end if;
  insert into public.shift_camp_messages(cohort_id,group_id,author_id,body) values(cid,gid,uid,txt);
 elsif p_action='request' then
  txt:=btrim(p_payload->>'body'); rec_id:=nullif(p_payload->>'update_id','')::uuid;
  if coalesce(p_payload->>'kind','') not in ('help','report') or txt is null or length(txt) not between 1 and 4000 or (rec_id is not null and not exists(select 1 from public.shift_camp_updates u where u.id=rec_id and u.cohort_id=cid and u.published_at is not null)) then raise exception 'Invalid request'; end if;
  insert into public.shift_camp_requests(cohort_id,user_id,project_id,update_id,kind,body) values(cid,uid,pid,rec_id,p_payload->>'kind',txt);
 elsif p_action='complete_milestone' then
  rec_id:=(p_payload->>'node_id')::uuid;
  if not exists(select 1 from public.map_nodes where map_id=c.map_id and map_nodes.id=rec_id and shift_camp_day<=camp_day) then raise exception 'Milestone has not started'; end if;
  insert into public.student_node_progress(user_id,node_id,status) values(uid,rec_id,'submitted') on conflict(user_id,node_id) do update set status=case when public.student_node_progress.status='passed' then 'passed' else 'submitted' end;
 elsif p_action='checkin' then
  day_num:=(p_payload->>'day')::integer;
  if day_num not in (1,4,7) or day_num>camp_day then raise exception 'Check-in day has not started'; end if;
  insert into public.shift_camp_checkins(cohort_id,user_id,day,choice,capability,support) values(cid,uid,day_num,(p_payload->>'choice')::integer,(p_payload->>'capability')::integer,(p_payload->>'support')::integer)
   on conflict(cohort_id,user_id,day) do update set choice=excluded.choice,capability=excluded.capability,support=excluded.support;
 elsif p_action='checkpoint' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  pid:=(p_payload->>'project_id')::uuid; day_num:=(p_payload->>'day')::integer; txt:=btrim(p_payload->>'feedback');
  if shift_private.project_cohort(pid) is distinct from cid or txt is null or length(txt) not between 1 and 4000 then raise exception 'Project and feedback required'; end if;
  insert into public.shift_camp_checkpoints(project_id,day,mentor_id,feedback) values(pid,day_num,uid,txt) on conflict(project_id,day) do update set mentor_id=uid,feedback=excluded.feedback,reviewed_at=now();
 elsif p_action='resolve_request' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  txt:=btrim(p_payload->>'resolution'); if txt is null or length(txt) not between 1 and 4000 then raise exception 'Resolution required'; end if;
  update public.shift_camp_requests set resolution=txt,resolved_at=now() where id=(p_payload->>'id')::uuid and cohort_id=cid;
 elsif p_action='moderate' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  update public.shift_camp_updates set hidden=(p_payload->>'hidden')::boolean where id=(p_payload->>'id')::uuid and cohort_id=cid;
 elsif p_action='moderate_comment' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  update public.post_comments set shift_hidden=(p_payload->>'hidden')::boolean where id=(p_payload->>'id')::uuid and post_id in(select post_id from public.shift_camp_updates where cohort_id=cid);
 elsif p_action='moderate_message' then
  if not staff then raise exception 'Staff required' using errcode='42501'; end if;
  update public.shift_camp_messages set hidden=(p_payload->>'hidden')::boolean where id=(p_payload->>'id')::uuid and cohort_id=cid;
 else raise exception 'Unknown camp action'; end if;
 return shift_private.snapshot(cid);
end $$;

-- No definer endpoints in the exposed schema. This wrapper is an invoker;
-- the non-exposed implementation also requires and checks auth.uid().
create or replace function public.shift_camp_action(p_action text,p_cohort_id uuid default null,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
 select shift_private.camp_action(p_action,p_cohort_id,p_payload)
$$;
revoke all on all functions in schema shift_private from public, anon;
grant execute on all functions in schema shift_private to authenticated;
-- These boolean/identifier helpers are also needed by restrictive policies on
-- legacy public tables. Granting them preserves anonymous non-camp reads.
grant usage on schema shift_private to anon;
grant execute on function shift_private.is_admin(),shift_private.is_staff(uuid),shift_private.can_read(uuid),shift_private.community_cohort(uuid),shift_private.classroom_cohort(uuid),shift_private.team_cohort(uuid),shift_private.project_cohort(uuid),shift_private.post_cohort(uuid) to anon;
revoke all on function public.shift_camp_action(text,uuid,jsonb) from public, anon;
grant execute on function public.shift_camp_action(text,uuid,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('shift-camp','shift-camp',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function shift_private.can_access_image(path text, writing boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid; pid uuid; begin
 cid:=split_part(path,'/',1)::uuid; pid:=split_part(path,'/',2)::uuid;
 return shift_private.project_cohort(pid)=cid and shift_private.can_read(cid) and
  (case when writing then shift_private.my_project(cid,auth.uid())=pid
   else shift_private.is_staff(cid) or shift_private.my_project(cid,auth.uid())=pid or exists(select 1 from public.shift_camp_updates where project_id=pid and published_at is not null and not hidden and (body->'screenshots') ? path) end);
exception when invalid_text_representation then return false; end $$;
revoke all on function shift_private.can_access_image(text,boolean) from public,anon;
grant execute on function shift_private.can_access_image(text,boolean) to authenticated;
drop policy if exists shift_image_read on storage.objects;
create policy shift_image_read on storage.objects for select to authenticated using(bucket_id='shift-camp' and shift_private.can_access_image(name,false));
drop policy if exists shift_image_upload on storage.objects;
create policy shift_image_upload on storage.objects for insert to authenticated with check(bucket_id='shift-camp' and shift_private.can_access_image(name,true));
drop policy if exists shift_image_remove on storage.objects;
create policy shift_image_remove on storage.objects for delete to authenticated using(bucket_id='shift-camp' and shift_private.can_access_image(name,true));

-- Legacy broad storage policies are permissive and OR together. Restrictive
-- bucket guards prevent those policies from exposing private camp screenshots.
grant execute on function shift_private.can_access_image(text,boolean) to anon;
drop policy if exists shift_image_read_guard on storage.objects;
create policy shift_image_read_guard on storage.objects as restrictive for select using(bucket_id<>'shift-camp' or shift_private.can_access_image(name,false));
drop policy if exists shift_image_insert_guard on storage.objects;
create policy shift_image_insert_guard on storage.objects as restrictive for insert with check(bucket_id<>'shift-camp' or shift_private.can_access_image(name,true));
drop policy if exists shift_image_update_guard on storage.objects;
create policy shift_image_update_guard on storage.objects as restrictive for update using(bucket_id<>'shift-camp') with check(bucket_id<>'shift-camp');
drop policy if exists shift_image_delete_guard on storage.objects;
create policy shift_image_delete_guard on storage.objects as restrictive for delete using(bucket_id<>'shift-camp' or shift_private.can_access_image(name,true));

create or replace function shift_private.can_read_post(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select shift_private.post_cohort(pid) is null or
 (shift_private.can_read(shift_private.post_cohort(pid)) and
 (shift_private.is_staff(shift_private.post_cohort(pid)) or exists(select 1 from public.shift_camp_updates where post_id=pid and not hidden and published_at is not null)))
$$;
revoke all on function shift_private.can_read_post(uuid) from public;
grant execute on function shift_private.can_read_post(uuid) to anon,authenticated;
drop policy if exists shift_presentation_read_guard on public.community_posts;
create policy shift_presentation_read_guard on public.community_posts as restrictive for select using(shift_private.can_read_post(id));
drop policy if exists shift_comment_read_guard on public.post_comments;
create policy shift_comment_read_guard on public.post_comments as restrictive for select using(shift_private.can_read_post(post_id) and (not shift_hidden or shift_private.is_staff(shift_private.post_cohort(post_id))));

-- Enrolled users can read the canonical curriculum through existing map views.
drop policy if exists shift_curriculum_read on public.learning_maps;
create policy shift_curriculum_read on public.learning_maps for select to authenticated using(exists(select 1 from public.shift_camp_cohorts c where c.map_id=learning_maps.id and shift_private.can_read(c.id)));
drop policy if exists shift_curriculum_node_read on public.map_nodes;
create policy shift_curriculum_node_read on public.map_nodes for select to authenticated using(exists(select 1 from public.shift_camp_cohorts c where c.map_id=map_nodes.map_id and shift_private.can_read(c.id)));
