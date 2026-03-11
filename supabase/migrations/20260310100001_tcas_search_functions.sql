-- Semantic search via vector cosine similarity
create or replace function public.search_programs(
  query_embedding vector(1024),
  match_threshold float default 0.7,
  match_count     int default 20
)
returns table (
  program_id      text,
  program_name    text,
  program_name_en text,
  faculty_name    text,
  university_name text,
  university_id   text,
  similarity      float
)
language sql stable security definer
as $$
  select
    p.program_id,
    p.program_name,
    p.program_name_en,
    p.faculty_name,
    u.university_name,
    u.university_id,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.tcas_programs p
  join public.tcas_universities u on u.university_id = p.university_id
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Eligibility search: find rounds matching user's GPAX
create or replace function public.find_eligible_rounds(
  user_gpax         numeric,
  user_round        smallint default null,
  user_university_id text default null,
  result_limit      int default 50
)
returns table (
  round_id        uuid,
  program_id      text,
  program_name    text,
  faculty_name    text,
  university_name text,
  university_id   text,
  round_number    smallint,
  project_name    text,
  receive_seats   integer,
  min_gpax        numeric,
  score_weights   jsonb,
  link            text
)
language sql stable security definer
as $$
  select
    ar.id,
    ar.program_id,
    p.program_name,
    p.faculty_name,
    u.university_name,
    u.university_id,
    ar.round_number,
    ar.project_name,
    ar.receive_seats,
    ar.min_gpax,
    ar.score_weights,
    ar.link
  from public.tcas_admission_rounds ar
  join public.tcas_programs p on p.program_id = ar.program_id
  join public.tcas_universities u on u.university_id = ar.university_id
  where (ar.min_gpax is null or ar.min_gpax <= user_gpax)
    and (user_round is null or ar.round_number = user_round)
    and (user_university_id is null or ar.university_id = user_university_id)
  order by ar.receive_seats desc nulls last, ar.min_gpax desc
  limit result_limit;
$$;

-- Full-text fallback for Thai keyword search
create or replace function public.search_programs_text(
  query       text,
  match_count int default 20
)
returns table (
  program_id      text,
  program_name    text,
  faculty_name    text,
  university_name text,
  rank            float
)
language sql stable security definer
as $$
  select
    p.program_id,
    p.program_name,
    p.faculty_name,
    u.university_name,
    ts_rank(to_tsvector('simple', p.search_text), plainto_tsquery('simple', query)) as rank
  from public.tcas_programs p
  join public.tcas_universities u on u.university_id = p.university_id
  where to_tsvector('simple', p.search_text) @@ plainto_tsquery('simple', query)
  order by rank desc
  limit match_count;
$$;
