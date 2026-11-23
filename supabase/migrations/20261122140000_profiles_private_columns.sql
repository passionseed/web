-- Private profile columns: readable only for your own row (via get_my_profile).
-- Other signed-in users can no longer select private profile columns.
-- Your own row stays fully readable through public.get_my_profile().
-- Hidden: date_of_birth, gpax, school_name, expo_push_token, mobile_settings,
--         budget_per_year, preferred_location, subject_interests,
--         interest_embedding, discord_id.
begin;
revoke select on public.profiles from anon, authenticated;
grant select (
  id, username, avatar_url, created_at, updated_at, email, full_name,
  education_level, tos_accepted_at, tos_version, preferred_language, discord_uid,
  is_onboarded, onboarded_at, tcas_profile_completed, shift_round_nudges,
  shift_round_language
) on public.profiles to authenticated;
commit;
