import {
  getFormWithFields,
  getProjectSubmissions,
  getProjectTasks,
} from "@/actions/ps-feedback";
import { EditorLayout } from "@/components/ps/feedback/form-editor/editor-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface FormEditorPageProps {
  params: Promise<{
    id: string;
    formId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function FormEditorPage({ params }: FormEditorPageProps) {
  const { id: projectId, formId } = await params;

  let form;
  try {
    form = await getFormWithFields(formId);
  } catch {
    return notFound();
  }

  const tasks = await getProjectTasks(projectId);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/ps/projects/${projectId}/feedback`}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{form.title}</h1>
              {/* Ideally editable title here */}
            </div>
          </div>
          <div>
            {/* Header Actions like Preview */}
            <Button variant="outline" asChild size="sm">
              <Link href={`/feedback/${form.token}`} target="_blank">
                Preview
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <EditorLayout form={form} projectId={projectId} tasks={tasks} />
        </div>
      </main>
    </div>
  );
}
