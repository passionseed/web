# PassionSeed B2B Phase 1 Design

## Goal
Ship a runnable Phase 1 lead-gen backend loop for PassionSeed that can:
1) discover/filter candidate institutions,
2) score and explain qualification,
3) generate outreach drafts,
4) learn from manual CRM feedback.

## Scope
In scope:
- Backend TypeScript domain module (`lib/ps-b2b/*`)
- Single API route to run the pipeline (`app/api/ps/b2b/phase1/route.ts`)
- Deterministic scoring engine with configurable weights
- Outreach generation with strict messaging rules and deterministic fallback
- Manual feedback-driven ICP weight update
- Unit tests for scoring, outreach, and feedback behavior

Out of scope for Phase 1:
- Automated web crawling/search API integrations
- Persistent CRM datastore/migrations
- Trigger monitoring automation
- Full UI workflow

## Architecture
- `discovery.ts`: dedupe + threshold + keyword filtering over supplied seed leads.
- `enrichment.ts`: infer domain/access/innovation + urgency signals and red flags.
- `scoring.ts`: compute 5 weighted dimensions and explain every dimension.
- `outreach.ts`: generate email + LinkedIn + subject variants within strict constraints.
- `feedback.ts`: apply manual feedback events and rebalance ICP weights.
- `orchestrator.ts`: run pipeline end to end and return top leads + diagnostics.

## Data Flow
Input payload (filters + seed leads + optional feedback)
→ Discovery
→ Enrichment
→ Qualification/Scoring
→ Top N
→ Outreach Drafting
→ Optional Feedback Update
→ Output report with updated model weights.

## Error Handling
- Zod-validated API input
- Safe defaults for missing lead fields
- Graceful outreach fallback when AI keys are missing
- Feedback update always normalizes weights to total 100

## Testing Strategy
- Score math + explanation integrity
- Outreach constraint compliance (word count, CTA style)
- Weight update correctness and normalization

## Key Assumptions
- Discovery is manual-seed driven in Phase 1 (user-provided leads).
- Manual CRM events are passed back to the API payload.
- Existing repo auth model is not required for this internal Phase 1 endpoint yet.
