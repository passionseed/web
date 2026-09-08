import assert from "node:assert/strict";

import { isPublicRoute } from "../../../utils/supabase/public-routes";

test("My Path stays public while account-only routes remain protected", () => {
  assert.equal(isPublicRoute("/plan"), true);
  assert.equal(isPublicRoute("/plan?entry=tech-beyond-software"), true);
  assert.equal(isPublicRoute("/experimental-graphic"), true);
  assert.equal(isPublicRoute("/experimental-wall"), true);
  assert.equal(isPublicRoute("/classrooms"), false);
});

test("ProjectSeed prompt page is reachable without an account", () => {
  // Students land here from LINE/Discord with no login. A redirect to /login
  // would silently kill the whole funnel.
  assert.equal(isPublicRoute("/projectseed/prompt"), true);
  assert.equal(isPublicRoute("/projectseed"), true);
});

test("Safeguarding policy is readable by parents without an account", () => {
  // Section 5 requires sending parents this policy before mentoring starts.
  // A login wall would make that acknowledgement meaningless.
  assert.equal(isPublicRoute("/projectseed/safeguarding"), true);
});

test("Parent payment surfaces stay public", () => {
  assert.equal(isPublicRoute("/pay/0123456789abcdef0123456789abcdef"), true);
  assert.equal(isPublicRoute("/api/trials/0123456789abcdef0123456789abcdef"), true);
  assert.equal(
    isPublicRoute("/api/trials/0123456789abcdef0123456789abcdef/slip"),
    true
  );
});

test("App Store support and legal pages stay public without login", () => {
  assert.equal(isPublicRoute("/support"), true);
  assert.equal(isPublicRoute("/contact"), true);
  assert.equal(isPublicRoute("/privacy"), true);
  assert.equal(isPublicRoute("/terms"), true);
  assert.equal(isPublicRoute("/tos"), true);
  assert.equal(isPublicRoute("/cookies"), true);
  assert.equal(isPublicRoute("/slide/csii"), true);
  assert.equal(isPublicRoute("/worksheet"), true);
  assert.equal(isPublicRoute("/worksheet/portfolio-weight-test"), true);
});
