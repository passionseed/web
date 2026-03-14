## 2024-05-14 - Replace O(N*M) with O(N+M) Map Lookup for Grading API
**Learning:** In Next.js Server Actions and APIs involving complex relationships (like submissions to students and groups), relying on array methods like `.filter()` inside nested iteration loops often creates O(N*M) performance bottlenecks that quickly degrade with large classroom sizes.
**Action:** Always pre-calculate `Map` lookups upfront for relationships (e.g., mapping `group_id` -> `members`) before executing `.forEach` or `.map` over the main dataset to achieve O(N+M) complexity and ensure rapid API responses.
