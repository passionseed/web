## 2024-05-22 - Missing Authentication on AI Server Actions
**Vulnerability:** Found `app/actions/advisor-actions.ts` exposing expensive AI operations via Server Actions without any authentication or rate limiting checks.
**Learning:** Next.js Server Actions are public API endpoints by default. Without explicit auth guards, they can be abused for DoS or resource exhaustion, especially when wrapping paid APIs like LLMs.
**Prevention:** Always implement a `checkAuth` guard or similar middleware-like check at the start of every "use server" action that performs sensitive or expensive operations.
