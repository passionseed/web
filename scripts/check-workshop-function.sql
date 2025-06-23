-- Check if the function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as function_arguments,
  l.lanname as language,
  p.prosecdef as security_definer,
  p.proowner::regrole as owner,
  p.proacl as access_privileges,
  pg_get_functiondef(p.oid) as function_definition
FROM 
  pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
WHERE 
  n.nspname = 'public' 
  AND p.proname = 'join_workshop_with_answers';

-- Check function permissions
SELECT 
  grantee,
  privilege_type
FROM 
  information_schema.role_routine_grants
WHERE 
  routine_schema = 'public' 
  AND routine_name = 'join_workshop_with_answers';

-- Check if the user_workshops table has the required columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'user_workshops';

-- Check if the workshop_participants table exists and has required columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'workshop_participants';
