import { Resend } from "resend";

// Lazy initialization - only create Resend client when needed (server-side)
let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "hi@noreply.passionseed.org";

/** Variables available in email templates */
export interface EmailTemplateVars {
  name: string;
  email: string;
  track: string;
  university: string;
  grade_level: string;
  experience_level: number;
  team_name: string;
  role: string;
}

/** Substitute {{variable}} placeholders in a template string */
export function renderTemplate(
  template: string,
  vars: EmailTemplateVars
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key as keyof EmailTemplateVars];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

/** Available variable names for UI hints */
export const TEMPLATE_VARIABLES: { key: keyof EmailTemplateVars; label: string }[] = [
  { key: "name", label: "Participant Name" },
  { key: "email", label: "Email" },
  { key: "track", label: "Track" },
  { key: "university", label: "University" },
  { key: "grade_level", label: "Grade Level" },
  { key: "experience_level", label: "Experience Level" },
  { key: "team_name", label: "Team Name" },
  { key: "role", label: "Role" },
];

export interface SendBatchEmailsParams {
  recipients: Array<{
    email: string;
    vars: EmailTemplateVars;
  }>;
  subjectTemplate: string;
  bodyTemplate: string;
}

/** Send personalized emails to multiple recipients via Resend batch API.
 *  Batch limit: 100 emails per request. We chunk automatically. */
export async function sendBatchEmails({
  recipients,
  subjectTemplate,
  bodyTemplate,
}: SendBatchEmailsParams): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);

    const emailBatch = chunk.map((r) => {
      const subject = renderTemplate(subjectTemplate, r.vars);
      const htmlBody = renderTemplate(bodyTemplate, r.vars);
      // Convert newlines to <br> for HTML, keep plain text too
      const textBody = htmlBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");

      return {
        from: `PassionSeed <${FROM_EMAIL}>`,
        to: [r.email],
        subject,
        html: htmlBody,
        text: textBody,
      };
    });

    try {
      const { error } = await getResend().batch.send(emailBatch);
      if (error) {
        failed += chunk.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      failed += chunk.length;
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`);
    }
  }

  return { sent, failed, errors };
}
