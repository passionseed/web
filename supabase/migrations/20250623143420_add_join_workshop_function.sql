-- Drop the function if it exists with the exact parameter signature
do $$
begin
  if exists (
    select 1 
    from pg_proc 
    where proname = 'join_workshop_with_answers' 
    and pronamespace = (select oid from pg_namespace where nspname = 'public')
  ) then
    drop function if exists public.join_workshop_with_answers(
      p_workshop_id uuid,
      p_user_id uuid,
      p_status text,
      p_registration_data jsonb,
      p_answer_1 text,
      p_answer_2 text,
      p_answer_3 text,
      p_answer_4 text,
      p_answer_5 text
    );
  end if;
end $$;

-- Create the function
create or replace function public.join_workshop_with_answers(
  p_workshop_id uuid,
  p_user_id uuid,
  p_status text,
  p_registration_data jsonb,
  p_answer_1 text default null,
  p_answer_2 text default null,
  p_answer_3 text default null,
  p_answer_4 text default null,
  p_answer_5 text default null
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_participant_id uuid;
  v_result jsonb;
  v_existing_status text;
begin
  -- Check if user is already registered and get their status
  select status into v_existing_status
  from public.user_workshops 
  where workshop_id = p_workshop_id 
  and user_id = p_user_id
  limit 1;

  if v_existing_status is not null then
    if v_existing_status = 'pending' then
      raise exception 'Your registration is pending approval';
    elsif v_existing_status = 'approved' then
      raise exception 'You are already registered for this workshop';
    end if;
  end if;

  -- Start transaction
  begin
    -- Insert into user_workshops with answers
    insert into public.user_workshops (
      user_id,
      workshop_id,
      status,
      answer_1,
      answer_2,
      answer_3,
      answer_4,
      answer_5
    ) values (
      p_user_id,
      p_workshop_id,
      p_status,
      nullif(trim(p_answer_1), ''),
      nullif(trim(p_answer_2), ''),
      nullif(trim(p_answer_3), ''),
      nullif(trim(p_answer_4), ''),
      nullif(trim(p_answer_5), '')
    )
    returning id into v_participant_id;

    -- Insert into workshop_participants with registration data
    insert into public.workshop_participants (
      workshop_id,
      user_id,
      status,
      registration_data
    ) values (
      p_workshop_id,
      p_user_id,
      p_status,
      p_registration_data
    );

    -- Return success with participant ID
    select jsonb_build_object(
      'success', true,
      'participant_id', v_participant_id
    ) into v_result;

    return v_result;
  exception
    when others then
      raise exception 'Error joining workshop: %', sqlerrm;
  end;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.join_workshop_with_answers(
  uuid, uuid, text, jsonb, text, text, text, text, text
) to authenticated;

-- Add a comment to document the function
comment on function public.join_workshop_with_answers is 'Handles workshop registration with answers in a transaction, ensuring data consistency';

-- Add a comment to document the parameters
comment on function public.join_workshop_with_answers(
  p_workshop_id uuid,
  p_user_id uuid,
  p_status text,
  p_registration_data jsonb,
  p_answer_1 text,
  p_answer_2 text,
  p_answer_3 text,
  p_answer_4 text,
  p_answer_5 text
) is 'Parameters:
- p_workshop_id: The ID of the workshop to join
- p_user_id: The ID of the user joining
- p_status: The status of the registration (pending/approved/rejected)
- p_registration_data: Additional registration data in JSON format
- p_answer_1 through p_answer_5: Answers to the workshop questions';

-- Document the return value in the function comment
comment on function public.join_workshop_with_answers is 'Returns a JSON object with success status and participant_id if successful';

-- Add a comment to document error cases
comment on function public.join_workshop_with_answers is 'Throws an exception if:
- User is already registered with status "pending" or "approved"
- There is an error during the transaction
- Any other database error occurs';
