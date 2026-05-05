#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Cache Rules Configuration Script
# For passionseed.org zone
#
# Prerequisites:
#   - CLOUDFLARE_API_TOKEN environment variable with Zone > Cache Rules > Edit permission
#   - CLOUDFLARE_ZONE_ID environment variable for passionseed.org
#
# Usage:
#   export CLOUDFLARE_API_TOKEN="your-token"
#   export CLOUDFLARE_ZONE_ID="your-zone-id"
#   ./scripts/configure-cloudflare-cache-rules.sh

API_BASE="https://api.cloudflare.com/client/v4"

# Validate prerequisites
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN is not set."
  echo "Create a token with: Zone > Cache Rules > Edit, Account Rulesets > Edit, Account Filter Lists > Edit"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_ZONE_ID is not set."
  echo "Find it in the Cloudflare dashboard under the zone overview page (right sidebar)."
  exit 1
fi

echo "=== Cloudflare Cache Rules Configuration ==="
echo "Zone ID: ${CLOUDFLARE_ZONE_ID}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Find or create the http_request_cache_settings phase ruleset
# -----------------------------------------------------------------------------
echo "Step 1: Finding existing http_request_cache_settings ruleset..."

RULESET_RESPONSE=$(curl -sS -X GET \
  "${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")

RULESET_ID=$(echo "${RULESET_RESPONSE}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for rs in data.get('result', []):
    if rs.get('phase') == 'http_request_cache_settings':
        print(rs.get('id'))
        break
" || true)

if [[ -n "${RULESET_ID:-}" ]]; then
  echo "Found existing ruleset: ${RULESET_ID}"
else
  echo "No existing ruleset found. Creating one..."
  CREATE_RESPONSE=$(curl -sS -X POST \
    "${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/rulesets" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --json '{
      "name": "default",
      "kind": "zone",
      "phase": "http_request_cache_settings",
      "rules": []
    }')

  RULESET_ID=$(echo "${CREATE_RESPONSE}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print(data['result']['id'])
else:
    print('ERROR:', data, file=sys.stderr)
    sys.exit(1)
" || true)
  echo "Created ruleset: ${RULESET_ID}"
fi

# -----------------------------------------------------------------------------
# Step 2: Define the 3 cache rules
# -----------------------------------------------------------------------------
echo ""
echo "Step 2: Updating ruleset with 3 cache rules..."

UPDATE_RESPONSE=$(curl -sS -X PUT \
  "${API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/rulesets/${RULESET_ID}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --json '{
    "rules": [
      {
        "expression": "(starts_with(http.request.uri.path, \"/api/\"))",
        "description": "API responses: cache for 1 hour with stale-while-revalidate",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "edge_ttl": {
            "mode": "override_origin",
            "default": 3600
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 3600
          },
          "serve_stale": {
            "disable_stale_while_updating": false
          }
        }
      },
      {
        "expression": "(starts_with(http.request.uri.path, \"/_next/static/\"))",
        "description": "Static assets: cache for 1 year (immutable hashed filenames)",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "edge_ttl": {
            "mode": "override_origin",
            "default": 31536000
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 31536000
          }
        }
      },
      {
        "expression": "(http.host eq \"cdn.passionseed.org\")",
        "description": "CDN images: cache for 1 year",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "edge_ttl": {
            "mode": "override_origin",
            "default": 31536000
          },
          "browser_ttl": {
            "mode": "override_origin",
            "default": 31536000
          }
        }
      }
    ]
  }')

# -----------------------------------------------------------------------------
# Step 3: Verify response
# -----------------------------------------------------------------------------
echo ""
echo "Step 3: Verifying response..."

SUCCESS=$(echo "${UPDATE_RESPONSE}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('true' if data.get('success') else 'false')
" || echo "false")

if [[ "${SUCCESS}" == "true" ]]; then
  echo "SUCCESS: Cache rules updated successfully."
  echo ""
  echo "Configured rules:"
  echo "  1. API responses (/api/*) → 1-hour TTL + stale-while-revalidate"
  echo "  2. Static assets (/_next/static/*) → 1-year TTL"
  echo "  3. CDN images (cdn.passionseed.org/*) → 1-year TTL"
  echo ""
  echo "Ruleset ID: ${RULESET_ID}"
  echo ""
  echo "Verification commands (run after DNS propagation):"
  echo "  curl -sI https://passionseed.org/api/app-data | grep -i cf-cache-status"
  echo "  curl -sI https://passionseed.org/_next/static/chunks/main-app.js | grep -i cf-cache-status"
  echo "  curl -sI https://cdn.passionseed.org/ | grep -i cf-cache-status"
else
  echo "ERROR: Failed to update cache rules."
  echo "Response:"
  echo "${UPDATE_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${UPDATE_RESPONSE}"
  exit 1
fi
