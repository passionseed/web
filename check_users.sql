-- Check if test users were created
SELECT 
  'auth.users' as table_name,
  count(*) as user_count
FROM auth.users
WHERE email LIKE '%@test.com'

UNION ALL

SELECT 
  'profiles' as table_name,
  count(*) as user_count  
FROM profiles
WHERE email LIKE '%@test.com'

UNION ALL

SELECT 
  'classroom_memberships' as table_name,
  count(*) as user_count
FROM classroom_memberships cm
JOIN profiles p ON cm.user_id = p.id
WHERE p.email LIKE '%@test.com';

-- Show all classrooms and their student counts
SELECT 
  c.id,
  c.name,
  c.join_code,
  COUNT(cm.user_id) as total_members,
  COUNT(CASE WHEN cm.role = 'student' THEN 1 END) as students,
  COUNT(CASE WHEN cm.role = 'instructor' THEN 1 END) as instructors
FROM classrooms c
LEFT JOIN classroom_memberships cm ON c.id = cm.classroom_id
GROUP BY c.id, c.name, c.join_code
ORDER BY c.created_at DESC;

-- Show test users and their memberships
SELECT 
  p.username,
  p.full_name,
  p.email,
  c.name as classroom_name,
  cm.role
FROM profiles p
LEFT JOIN classroom_memberships cm ON p.id = cm.user_id
LEFT JOIN classrooms c ON cm.classroom_id = c.id
WHERE p.email LIKE '%@test.com'
ORDER BY p.username;