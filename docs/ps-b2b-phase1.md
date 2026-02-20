# PassionSeed B2B Phase 1 API

## Endpoint

- `POST /api/ps/b2b/phase1`
- Frontend workbench: `/ps/b2b`

## Access

- Requires authenticated user with `passion-seed-team` role.

## What it does

Runs the Phase 1 pipeline:
1. Discovery (filter + dedupe seed leads)
2. Enrichment (signals + access intelligence)
3. Qualification scoring (0-100 with explanation)
4. Top-N outreach draft generation
5. Optional CRM feedback learning update

## Request Example

```json
{
  "filters": {
    "geographies": ["bangkok", "thailand"],
    "minStudentCount": 500,
    "minAnnualTuitionUsd": 10000,
    "keywords": ["college counseling", "career readiness"]
  },
  "seedLeads": [
    {
      "name": "Northbridge International School",
      "website": "https://northbridge.example.edu",
      "geography": "Bangkok, Thailand",
      "studentCount": 1800,
      "annualTuitionUsd": 32000,
      "notes": "Strong college counseling and internships.",
      "tags": ["college counseling", "career readiness", "ai program"],
      "decisionMakers": [
        {
          "fullName": "Jane Carter",
          "role": "Director of College Counseling",
          "email": "jane.carter@northbridge.example.edu",
          "linkedinUrl": "https://linkedin.com/in/jane-carter"
        }
      ]
    }
  ],
  "topN": 5,
  "includeOutreach": true,
  "useAIOutreach": false,
  "feedbackEvents": [
    {
      "leadId": "lead-northbridge-example-edu",
      "segmentKey": "bangkok-private-international",
      "outcome": "meeting_booked",
      "scoreSnapshot": {
        "budgetStrength": 78,
        "problemUrgency": 67,
        "innovationOpenness": 82,
        "alignment": 90,
        "easeOfAccess": 88
      }
    }
  ]
}
```

## Response Highlights

- `pipelineStats`: counts + average score
- `leads`: all scored leads sorted by score
- `topLeads`: top scored leads with outreach drafts
- `feedbackLearning`: updated ICP weights, objection frequency, and segment conversion

## Notes

- Discovery in Phase 1 is seed-list driven (manual list input).
- `useAIOutreach=true` attempts AI-generated copy and falls back to templates on failure.
- Feedback events are optional and support manual CRM loop updates.
