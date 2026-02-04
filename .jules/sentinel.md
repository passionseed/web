## 2024-05-22 - Authorization Bypass in Admin Archive
**Vulnerability:** Admin archive pages checked only for authentication (any user), not authorization (admin role), allowing privilege escalation.
**Learning:** Copy-pasting auth checks leads to simplified logic being propagated ("TODO: Add proper admin role checking") and forgotten.
**Prevention:** Use a centralized authorization utility (`checkAdminAccess`) for all protected routes instead of ad-hoc checks.
