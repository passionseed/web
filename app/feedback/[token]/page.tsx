import { getPublicForm, submitFeedback } from "@/actions/ps-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Star } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

interface PublicFeedbackPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicFeedbackPage({
  params,
}: PublicFeedbackPageProps) {
  const { token } = await params;
  let form;
  try {
    form = await getPublicForm(token);
  } catch (e) {
    return notFound();
  }

  // Auth Check
  if (form.require_auth) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?next=/feedback/${token}`);
    }
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const answers: Record<string, any> = {};

    // Parse answers based on form fields
    // We need to re-fetch form or pass field IDs.
    // Ideally we loop through formData keys but that's messy.
    // Let's rely on field IDs being names of inputs.

    // We can't trust client to send only valid field IDs, but the action will only insert if we map correctly or we just try to insert and rely on DB/Types?
    // Actually the action takes a Record. Let's iterate formData.
    for (const [key, value] of formData.entries()) {
      // Check if key looks like a UUID (field ID)
      if (
        key.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        // Determine type from form definition? Or just pass as is and let action handle storage type?
        // Action logic:
        // if (typeof value === 'boolean') row.answer_boolean = value;
        // else if (typeof value === 'number') ...
        // FormData values are strings (or files). We need to cast.

        // For now, let's treat everything as text unless we find a specific prefix or handle it in action.
        // Or better: the action could look up field type... but that's extra query.
        // Let's try to parse simple types here if possible or just send strings and let action logic expand.
        // BUT action logic: row.answer_text = String(value).
        // If we want answer_number, we need to cast to number.

        // Hack: we can't easily know field type here in the server action closure without fetching form again.
        // Let's assume the action needs improvement to handle types or we map it here.

        // Optimization: We could encode type in input name? e.g. "rating_UUID".
        // Let's Stick to ID and update Action to robustly handle parsing or just store everything as text for MVP?
        // No, we want ratings to be sortable numbers.

        // We will fetch metadata in action again? No, too slow.
        // Let's blindly try to parse number if it looks like number?
        const num = Number(value);
        if (!isNaN(num) && value !== "") {
          answers[key] = num;
        } else if (value === "on") {
          // Checkbox default
          answers[key] = true;
        } else {
          answers[key] = value;
        }
      }
    }

    await submitFeedback(token, answers);
    redirect(`/feedback/${token}/success`);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{form.title}</CardTitle>
          {form.description && (
            <CardDescription>{form.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {form.ps_form_fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}{" "}
                  {field.is_required && <span className="text-red-500">*</span>}
                </Label>

                {field.field_type === "text" && (
                  <Input
                    id={field.id}
                    name={field.id}
                    required={field.is_required}
                  />
                )}

                {field.field_type === "long_text" && (
                  <Textarea
                    id={field.id}
                    name={field.id}
                    required={field.is_required}
                  />
                )}

                {field.field_type === "rating" && (
                  <div className="flex items-center gap-4">
                    {/* Simple Radio Group for Rating 1-5 */}
                    <RadioGroup
                      name={field.id}
                      required={field.is_required}
                      className="flex gap-2"
                    >
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={String(val)}
                            id={`${field.id}-${val}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`${field.id}-${val}`}
                            className="peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground flex flex-col items-center justify-center w-10 h-10 rounded-full border cursor-pointer hover:bg-muted"
                          >
                            {val}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {field.field_type === "boolean" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id={field.id} name={field.id} />
                    <Label htmlFor={field.id} className="font-normal">
                      Yes
                    </Label>
                  </div>
                )}

                {field.field_type === "select" && (
                  <Select name={field.id} required={field.is_required}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options as string[])?.map((opt, i) => (
                        <SelectItem key={i} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            <Button type="submit" className="w-full">
              Submit Feedback
            </Button>
          </form>
        </CardContent>
        {form.require_auth && (
          <CardFooter className="justify-center border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Submitting as{" "}
              {(await (await createClient()).auth.getUser()).data.user?.email}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
