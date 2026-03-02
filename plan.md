1. **Analyze `.find()` usage in `app/api/classrooms/[id]/assignments/route.ts`**
   - The file loops over `assignments` and within that loop it uses `.find` twice (for `enrollmentCounts` and `nodeCounts`) resulting in O(N*M) time complexity.
   - We will replace the arrays with maps or objects (key: `assignment_id`, value: `{ total_enrollments, ... }`) to get O(1) lookups.
   - We will apply this optimization to speed up the GET route significantly.

2. **Run TSX verification scripts if necessary.**
3. **Submit the PR.**
