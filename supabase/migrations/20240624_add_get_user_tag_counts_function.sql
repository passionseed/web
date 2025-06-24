-- Create a function to get tag counts for a user
create or replace function public.get_user_tag_counts(
  user_id uuid,
  _limit integer default 3
)
returns table (
  tag_id uuid,
  count bigint
)
language sql
security definer
as $$
  select 
    t.id as tag_id,
    count(rt.reflection_id)::bigint as count
  from 
    public.tags t
    join public.reflection_tags rt on rt.tag_id = t.id
    join public.reflections r on r.id = rt.reflection_id
  where 
    r.user_id = get_user_tag_counts.user_id
  group by 
    t.id
  order by 
    count desc
  limit _limit;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_tag_counts(uuid, integer) to authenticated;
