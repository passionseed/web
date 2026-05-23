# Design Doc: Hackathon Team Submissions Export to Markdown

**Author**: Antigravity
**Date**: 2026-05-23
**Status**: Approved

## Overview
Introduce an "Export to Markdown" button in the hackathon admin team submissions panel. When an administrator is viewing a specific team's details, they should be able to click this button to instantly download a beautifully structured, comprehensive Markdown file containing all metadata, member details, submissions (both team-level and individual), assessment prompts, and associated comments/replies for that team.

## Proposed Solution (Approach A)
We will implement a client-side Markdown assembly and download helper. Since the client-side React component `AdminHackathonTeamSubmissions` receives and maintains the full `TeamData` object (which aggregates team members, phase-activity groups, individual and team submissions, scores, prompts, and comments), we can assemble the Markdown string on the fly in the browser.

### Key Benefits
- **Zero latency**: Generation and download happen instantaneously without any additional API requests.
- **Zero server load**: Offloads file assembly from the Nest/Next server and database.
- **High resilience**: Works offline or on slow network connections as long as the dashboard is loaded.

## Markdown Format Specification
The downloaded Markdown file will use the following standard GFM (GitHub Flavored Markdown) layout:

```markdown
# Hackathon Submissions: <Team Name>

- **Lobby Code:** `<lobby_code>`
- **Total Score:** <total_score> pts
- **Members Count:** <member_count>

## Team Members
- **<Member Name>** (<email>) - <University> (<Owner / Member>)

---

## Phase <Number>: <Phase Title>

### Activity: <Activity Title>
- **Status:** <status>
- **Submitted:** <submitted_at>
- **Prompt:** *<prompt>*

#### Submissions

##### [Team] Submission by <submitted_by_name>
<text_answer>

*Attachments:*
- ![Image](image_url)
- [Download File](file_url)

##### [Individual] Submission by <participant_name>
<text_answer>

*Attachments:*
- ![Image](image_url)

```

## UI and Styling Design
The button will be added to the team detail header in `AdminHackathonTeamSubmissions.tsx` (next to the team name and member count).

### Styling Specs (Dusk Theme Compatibility):
- **Icon**: `Download` (from `lucide-react`)
- **Variant**: Outline / Indigo / Dusk accent colors
- **Classes**: Responsive classes, appropriate hover effects, and modern styling matching the PassionSeed UI Design System.
