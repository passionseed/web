import { renderTemplate, type EmailTemplateVars } from "./email";

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

export const HACKATHON_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "🎉 Welcome / Onboarding",
    description: "Sent when participants first register",
    subject: "Welcome to PassionSeed Hackathon 2025, {{name}}! 🚀",
    body: `<p>Hi {{name}},</p>

<p>Welcome to the <strong>PassionSeed Hackathon 2025</strong>! We're thrilled to have you join us on this exciting journey.</p>

<h3>Your Registration Details</h3>
<ul>
  <li><strong>Name:</strong> {{name}}</li>
  <li><strong>Track:</strong> {{track}}</li>
  <li><strong>University:</strong> {{university}}</li>
  <li><strong>Grade Level:</strong> {{grade_level}}</li>
  <li><strong>Role:</strong> {{role}}</li>
</ul>

<h3>What's Next?</h3>
<p>Here's what you can expect:</p>
<ol>
  <li><strong>Team Formation</strong> — Find your teammates or create your dream team</li>
  <li><strong>Program Access</strong> — Get access to learning materials and challenges</li>
  <li><strong>Mentor Support</strong> — Book sessions with industry experts</li>
  <li><strong>Build & Submit</strong> — Turn your ideas into reality</li>
</ol>

<p><strong>Need help?</strong> Reply to this email or reach out to us at <a href="mailto:hi@passionseed.org">hi@passionseed.org</a></p>

<p>Let's build something amazing together!</p>

<p>Best regards,<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "team_formed",
    name: "👥 Team Formation Complete",
    description: "Sent when participant joins or creates a team",
    subject: "You're now part of {{team_name}}! Let's build together 🎯",
    body: `<p>Hi {{name}},</p>

<p>Great news! You're now officially part of <strong>{{team_name}}</strong>.</p>

<h3>Your Team Details</h3>
<ul>
  <li><strong>Team Name:</strong> {{team_name}}</li>
  <li><strong>Your Track:</strong> {{track}}</li>
  <li><strong>University:</strong> {{university}}</li>
</ul>

<h3>Team Success Tips</h3>
<p>Make the most of your hackathon experience:</p>
<ul>
  <li>✅ <strong>Set up communication channels</strong> — Discord, LINE, or your preferred platform</li>
  <li>✅ <strong>Schedule regular sync-ups</strong> — Daily standups keep everyone aligned</li>
  <li>✅ <strong>Divide and conquer</strong> — Assign roles based on strengths: {{role}}</li>
  <li>✅ <strong>Book mentor sessions</strong> — Get expert guidance early and often</li>
</ul>

<p>Your team lobby is ready! Access it through your hackathon dashboard.</p>

<p>Ready to make an impact?<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "phase_started",
    name: "📚 New Phase Started",
    description: "Sent when a new program phase begins",
    subject: "Phase {{phase_number}} is now live: {{phase_title}} 🚀",
    body: `<p>Hi {{name}},</p>

<p>A new phase of your hackathon journey has begun! <strong>Phase {{phase_number}}: {{phase_title}}</strong> is now live and ready for you to explore.</p>

<h3>Phase Overview</h3>
<ul>
  <li><strong>Phase:</strong> {{phase_number}} — {{phase_title}}</li>
  <li><strong>Team:</strong> {{team_name}}</li>
  <li><strong>Duration:</strong> {{phase_duration}}</li>
  <li><strong>Due Date:</strong> {{due_date}}</li>
</ul>

<h3>This Phase Includes</h3>
<p>In this phase, you'll work through:</p>
<ul>
  <li>📖 Learning materials and resources</li>
  <li>📝 Activities and assessments</li>
  <li>💡 Applied challenges</li>
  <li>🎯 Milestone submissions</li>
</ul>

<h3>Get Started</h3>
<p>Access Phase {{phase_number}} content through your team dashboard. Complete activities at your own pace, but keep an eye on the deadline!</p>

<p>Questions about this phase? Book a mentor session or ask in the community.</p>

<p>Keep building!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "submission_reminder",
    name: "⏰ Submission Reminder",
    description: "Sent 24-48 hours before activity deadline",
    subject: "⏰ {{activity_name}} due in {{hours_remaining}} hours — {{team_name}}",
    body: `<p>Hi {{name}},</p>

<p>This is a friendly reminder that <strong>{{activity_name}}</strong> is due soon for team <strong>{{team_name}}</strong>.</p>

<h3>Submission Details</h3>
<ul>
  <li><strong>Activity:</strong> {{activity_name}}</li>
  <li><strong>Phase:</strong> Phase {{phase_number}} — {{phase_title}}</li>
  <li><strong>Due:</strong> {{due_date}} ({{hours_remaining}} hours remaining)</li>
  <li><strong>Points:</strong> {{points_possible}} points</li>
</ul>

<h3>Submission Checklist</h3>
<p>Before you submit, make sure:</p>
<ul>
  <li>✅ All required fields are completed</li>
  <li>✅ File uploads are successful (if applicable)</li>
  <li>✅ Team members have reviewed the work</li>
  <li>✅ You've answered all parts of the prompt</li>
</ul>

<p><strong>Submit here:</strong> <a href="{{submission_link}}">Open Activity →</a></p>

<p><em>Missing the deadline may affect your team's progress. If you're stuck, book an urgent mentor session now!</em></p>

<p>You've got this!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "mentor_available",
    name: "👨‍🏫 Mentor Sessions Available",
    description: "Sent when new mentor slots open or to encourage booking",
    subject: "Expert mentors are ready to help {{team_name}} 🎯",
    body: `<p>Hi {{name}},</p>

<p>New mentor sessions have just opened up, and we'd love to see <strong>{{team_name}}</strong> take advantage of this opportunity!</p>

<h3>Why Book a Mentor Session?</h3>
<ul>
  <li>🎯 <strong>Get unstuck</strong> — Clarify your idea and approach</li>
  <li>💡 <strong>Expert feedback</strong> — Validate your solution with industry pros</li>
  <li>🚀 <strong>Level up</strong> — Learn best practices and shortcuts</li>
  <li>🏆 <strong>Winning edge</strong> — Polish your submission for judging</li>
</ul>

<h3>Popular Topics</h3>
<p>Mentors can help with:</p>
<ul>
  <li>Technical architecture and implementation</li>
  <li>Product design and user experience</li>
  <li>Presentation and pitch refinement</li>
  <li>Business model and validation</li>
</ul>

<p><strong>Book your session:</strong> <a href="{{mentor_booking_link}}">View Available Slots →</a></p>

<p><em>Sessions fill up fast — secure your spot now!</em></p>

<p>Learn from the best!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "submission_received",
    name: "✅ Submission Received",
    description: "Confirmation when activity is submitted",
    subject: "Submission received: {{activity_name}} ✅",
    body: `<p>Hi {{name}},</p>

<p>We've received your submission for <strong>{{activity_name}}</strong>. Great work!</p>

<h3>Submission Summary</h3>
<ul>
  <li><strong>Activity:</strong> {{activity_name}}</li>
  <li><strong>Phase:</strong> Phase {{phase_number}} — {{phase_title}}</li>
  <li><strong>Submitted by:</strong> {{name}} on behalf of {{team_name}}</li>
  <li><strong>Submitted at:</strong> {{submitted_at}}</li>
  <li><strong>Status:</strong> Under review</li>
</ul>

<h3>What Happens Next?</h3>
<p>Your submission will be reviewed according to the activity's evaluation criteria:</p>
<ul>
  <li>📝 <strong>Text answers</strong> — Reviewed for completeness and insight</li>
  <li>📎 <strong>File uploads</strong> — Checked for requirements</li>
  <li>🎨 <strong>Creative work</strong> — Assessed against rubric</li>
</ul>

<p>You'll receive feedback within <strong>{{review_timeframe}}</strong>. In the meantime, continue with other activities!</p>

<p>Questions? Contact your mentor or email us.</p>

<p>Keep up the momentum!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "feedback_received",
    name: "📊 Feedback & Results",
    description: "Sent when submission is reviewed",
    subject: "Your {{activity_name}} results are in — {{team_name}} 📊",
    body: `<p>Hi {{name}},</p>

<p>Your submission for <strong>{{activity_name}}</strong> has been reviewed. Here's your feedback:</p>

<h3>Results Summary</h3>
<ul>
  <li><strong>Activity:</strong> {{activity_name}}</li>
  <li><strong>Status:</strong> {{review_status}}</li>
  <li><strong>Score:</strong> {{score}}/{{points_possible}} points</li>
  <li><strong>Reviewer:</strong> {{reviewer_name}}</li>
</ul>

<h3>Feedback</h3>
<blockquote style="background: #f8f9fa; padding: 16px; border-left: 4px solid #667eea;">
{{feedback_text}}
</blockquote>

<h3>Next Steps</h3>
<p>Based on your results:</p>
<ul>
  <li>✅ <strong>Passed?</strong> Great job! Move on to the next activity.</li>
  <li>🔄 <strong>Needs work?</strong> You may be able to resubmit. Check your dashboard.</li>
  <li>💡 <strong>Questions?</strong> Book a mentor session to discuss the feedback.</li>
</ul>

<p>Every submission is a learning opportunity. Keep iterating and improving!</p>

<p>Onward and upward!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "phase_complete",
    name: "🏆 Phase Complete",
    description: "Sent when team finishes all phase requirements",
    subject: "Congratulations! Phase {{phase_number}} complete — {{team_name}} 🏆",
    body: `<p>Hi {{name}},</p>

<p>Fantastic news! <strong>{{team_name}}</strong> has successfully completed <strong>Phase {{phase_number}}: {{phase_title}}</strong>.</p>

<h3>Phase Summary</h3>
<ul>
  <li><strong>Phase Completed:</strong> Phase {{phase_number}} — {{phase_title}}</li>
  <li><strong>Team:</strong> {{team_name}}</li>
  <li><strong>Activities Completed:</strong> {{activities_completed}}/{{activities_total}}</li>
  <li><strong>Total Points:</strong> {{total_points}} points</li>
</ul>

<h3>Your Achievement</h3>
<p>Your team has demonstrated:</p>
<ul>
  <li>✅ Commitment to learning and growth</li>
  <li>✅ Collaboration and teamwork</li>
  <li>✅ Quality work and attention to detail</li>
</ul>

<h3>What's Next?</h3>
<p>You've unlocked access to the next phase! Here's what's ahead:</p>
<ul>
  <li>🚀 <strong>Phase {{next_phase_number}}:</strong> {{next_phase_title}}</li>
  <li>📅 <strong>Starts:</strong> {{next_phase_start}}</li>
  <li>🎯 <strong>New challenges</strong> and learning opportunities await</li>
</ul>

<p>Take a moment to celebrate this milestone with your team. Then get ready for the next challenge!</p>

<p>Congratulations again!<br><strong>The PassionSeed Team</strong></p>`,
  },
  {
    id: "final_reminder",
    name: "🔥 Final Push / Event Announcement",
    description: "Urgent announcements and final event reminders",
    subject: "🔥 Important: {{announcement_title}} — Action Required",
    body: `<p>Hi {{name}},</p>

<p><strong>{{announcement_title}}</strong></p>

<p>{{announcement_body}}</p>

<h3>Key Details</h3>
<ul>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Time:</strong> {{event_time}}</li>
  <li><strong>Location/Link:</strong> <a href="{{event_link}}">{{event_link}}</a></li>
  <li><strong>Team:</strong> {{team_name}}</li>
</ul>

<h3>Action Items</h3>
<p>Please ensure:</p>
<ol>
  <li>{{action_item_1}}</li>
  <li>{{action_item_2}}</li>
  <li>{{action_item_3}}</li>
</ol>

<p><strong>This is required for all participants.</strong> If you cannot attend or have conflicts, contact us immediately at <a href="mailto:hi@passionseed.org">hi@passionseed.org</a>.</p>

<p>See you there!<br><strong>The PassionSeed Team</strong></p>`,
  },
];

export function wrapEmailContent(contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>PassionSeed Hackathon</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #e9ecef;">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 32px 40px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">PassionSeed</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">HACKATHON 2025</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #1f2937; font-size: 16px; line-height: 1.7;">
                    ${contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 32px 40px; border-top: 1px solid #e5e7eb;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="text-align: center; color: #6b7280; font-size: 13px; line-height: 1.6;">
                    <p style="margin: 0 0 12px 0;">
                      <strong style="color: #374151; font-weight: 600;">PassionSeed</strong> — Empowering the next generation of innovators
                    </p>
                    <p style="margin: 0 0 16px 0;">
                      Questions? Reply to this email or 
                      <a href="mailto:hi@passionseed.org" style="color: #6366f1; text-decoration: none; font-weight: 500;">contact us</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      © 2025 PassionSeed. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatBodyHtml(bodyHtml: string): string {
  bodyHtml = bodyHtml.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #111827; font-weight: 600;">$1</strong>');
  bodyHtml = bodyHtml.replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>');
  bodyHtml = bodyHtml.replace(/\n\n/g, '</p><p style="margin: 16px 0; color: #374151; line-height: 1.7;">');
  
  if (!bodyHtml.startsWith('<')) {
    bodyHtml = `<p style="margin: 0 0 16px 0; color: #374151; line-height: 1.7;">${bodyHtml}</p>`;
  }
  
  bodyHtml = bodyHtml.replace(/\n/g, '<br>');
  
  bodyHtml = bodyHtml.replace(
    /<a\s+href="([^"]+)"[^>]*>([^<]*)<\/a>/g,
    '<a href="$1" style="color: #6366f1; text-decoration: none; font-weight: 500; border-bottom: 1px solid #c7d2fe;">$2</a>'
  );
  
  bodyHtml = bodyHtml.replace(
    /<h3>/g,
    '<h3 style="margin: 28px 0 14px 0; color: #111827; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">'
  );
  bodyHtml = bodyHtml.replace(/<\/h3>/g, '</h3>');
  
  bodyHtml = bodyHtml.replace(
    /<ul>/g,
    '<ul style="margin: 16px 0; padding-left: 24px; color: #374151;">'
  );
  bodyHtml = bodyHtml.replace(
    /<ol>/g,
    '<ol style="margin: 16px 0; padding-left: 24px; color: #374151;">'
  );
  bodyHtml = bodyHtml.replace(
    /<li>/g,
    '<li style="margin: 10px 0; line-height: 1.6;">'
  );
  
  bodyHtml = bodyHtml.replace(
    /<blockquote>/g,
    '<blockquote style="background: #f9fafb; padding: 16px 20px; border-left: 4px solid #6366f1; margin: 20px 0; border-radius: 0 8px 8px 0;">'
  );
  bodyHtml = bodyHtml.replace(/<\/blockquote>/g, '</blockquote>');
  
  return bodyHtml;
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/p><p[^>]*>/g, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .trim();
}

export function renderEmailWithTemplate(
  template: EmailTemplate,
  vars: EmailTemplateVars & Record<string, string>
): { subject: string; html: string; text: string } {
  const subject = renderTemplate(template.subject, vars as EmailTemplateVars);
  const bodyHtml = formatBodyHtml(renderTemplate(template.body, vars as EmailTemplateVars));
  
  return {
    subject,
    html: wrapEmailContent(bodyHtml),
    text: htmlToText(bodyHtml),
  };
}

export function renderCustomEmail(
  subjectTemplate: string,
  bodyTemplate: string,
  vars: EmailTemplateVars & Record<string, string>
): { subject: string; html: string; text: string } {
  const subject = renderTemplate(subjectTemplate, vars as EmailTemplateVars);
  const bodyHtml = formatBodyHtml(renderTemplate(bodyTemplate, vars as EmailTemplateVars));
  
  return {
    subject,
    html: wrapEmailContent(bodyHtml),
    text: htmlToText(bodyHtml),
  };
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  return HACKATHON_TEMPLATES.find((t) => t.id === id);
}
