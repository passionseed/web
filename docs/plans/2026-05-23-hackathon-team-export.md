# Hackathon Team Submissions Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide a client-side "Export to Markdown" button to download a comprehensive GFM-formatted markdown archive of everything a hackathon team has done.

**Architecture:** Client-side generation using loaded React component state, followed by Blob-based browser download.

**Tech Stack:** React, Next.js, Tailwind CSS, Lucide icons.

---

### Task 1: Add Markdown Export Helper and Button UI

**Files:**
- Modify: `components/admin/AdminHackathonTeamSubmissions.tsx`

**Step 1: Write helper function `exportTeamToMarkdown`**
Implement the client-side Markdown compile and download helper.

```typescript
function exportTeamToMarkdown(team: TeamData) {
  let md = `# Hackathon Submissions: ${team.name}\n\n`;
  md += `- **Lobby Code:** \`${team.lobby_code}\`\n`;
  md += `- **Total Score:** ${team.total_score} pts\n`;
  md += `- **Members:** ${team.member_count} members\n\n`;

  md += `## Team Members\n`;
  if (team.members && team.members.length > 0) {
    team.members.forEach(m => {
      const role = m.is_owner ? "Owner" : "Member";
      md += `- **${m.name}** (${m.email}) - ${m.university || "Unknown"} (${role})\n`;
    });
  } else {
    md += `*No members recorded.*\n`;
  }
  md += `\n---\n\n`;

  const phases = buildPhaseGroups(team);
  if (phases.length === 0) {
    md += `*No submissions recorded for this team.*\n`;
  } else {
    phases.forEach(phase => {
      md += `## Phase ${phase.phase_number ?? "?"}: ${phase.phase_title ?? "Untitled phase"}\n\n`;

      phase.activities.forEach(activity => {
        md += `### Activity: ${activity.activity_title ?? activity.activity_id}\n`;
        md += `- **Status:** ${activity.status.toUpperCase().replace(/_/g, " ")}\n`;
        if (activity.submitted_at) {
          md += `- **Last Submitted:** ${new Date(activity.submitted_at).toLocaleString()}\n`;
        }
        md += `- **Prompt:** *${activity.prompt ?? "No prompt available"}*\n\n`;

        // Team submission
        if (activity.team_submission) {
          const ts = activity.team_submission;
          md += `#### Team Submission by ${ts.submitted_by_name ?? "Unknown"}\n`;
          if (ts.text_answer) {
            md += `\n\`\`\`markdown\n${ts.text_answer}\n\`\`\`\n\n`;
          }
          if (ts.image_url) {
            md += `**Attached Image:**\n![Team Submission Image](${ts.image_url})\n\n`;
          }
          if (ts.file_urls && ts.file_urls.length > 0) {
            md += `**Attached Files:**\n`;
            ts.file_urls.forEach((url, idx) => {
              md += `- [File ${idx + 1}](${url})\n`;
            });
            md += `\n`;
          }
        }

        // Individual submissions
        if (activity.participant_submissions && activity.participant_submissions.length > 0) {
          md += `#### Individual Submissions\n\n`;
          activity.participant_submissions.forEach(ps => {
            md += `##### Submitted by ${ps.participant_name ?? "Unknown"}\n`;
            md += `- **Status:** ${ps.status.toUpperCase().replace(/_/g, " ")}\n`;
            if (ps.submitted_at) {
              md += `- **Submitted At:** ${new Date(ps.submitted_at).toLocaleString()}\n`;
            }
            if (ps.text_answer) {
              md += `\n\`\`\`markdown\n${ps.text_answer}\n\`\`\`\n\n`;
            }
            if (ps.image_url) {
              md += `**Attached Image:**\n![Submission Image](${ps.image_url})\n\n`;
            }
            if (ps.file_urls && ps.file_urls.length > 0) {
              md += `**Attached Files:**\n`;
              ps.file_urls.forEach((url, idx) => {
                md += `- [File ${idx + 1}](${url})\n`;
              });
              md += `\n`;
            }
          });
        }



        md += `\n---\n\n`;
      });
    });
  }

  // Trigger file download
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${team.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_submissions.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Step 2: Add export button UI in the team detail header**
In the JSX under `{/* Team name + members summary */}` (around line 942-950), import `Download` from `"lucide-react"` and add the button next to the members count:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => exportTeamToMarkdown(selectedTeam)}
  className="ml-auto text-xs bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80 text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
>
  <Download className="h-3.5 w-3.5" />
  Export Submissions (.md)
</Button>
```

**Step 3: Verification**
- In browser devtools or local test environment, select a team and click "Export Submissions (.md)".
- Verify a download starts, the markdown is formatted perfectly, and it matches the specification.
