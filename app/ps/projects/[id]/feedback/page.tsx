import {
  getProjectForms,
  createForm,
  getProjectSubmissions,
} from "@/actions/ps-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Plus,
  Copy,
  ExternalLink,
  MessageSquare,
  Lock,
  Unlock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { SubmissionViewer } from "@/components/ps/feedback/submission-viewer";
import { Badge } from "@/components/ui/badge";
import { ManageFieldsDialog } from "@/components/ps/feedback/manage-fields-dialog";

export const dynamic = "force-dynamic";

interface FeedbackPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const { id: projectId } = await params;

  const forms = await getProjectForms(projectId);
  const submissions = await getProjectSubmissions(projectId);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/ps/projects/${projectId}`}>
              <ArrowLeft className="w-6 h-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feedback Hub</h1>
            <p className="text-muted-foreground mt-2">
              Manage forms and review user feedback.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="inbox" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inbox">
            Inbox ({submissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="forms">Forms ({forms?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {(!submissions || submissions.length === 0) && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No feedback received yet. Share your forms!
            </div>
          )}
          {submissions &&
            submissions.map((sub) => (
              <div key={sub.id} className="border rounded-lg overflow-hidden">
                {/* We can use an accordion or just list active viewers for now. 
                         Let's use the Viewer directly, it has a card container. 
                         Maybe improved UI for list item? */}
                <SubmissionViewer
                  submission={sub as any}
                  projectId={projectId}
                />
              </div>
            ))}
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create New Form
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Feedback Form</DialogTitle>
                  <DialogDescription>
                    Generates a shareable public link
                  </DialogDescription>
                </DialogHeader>
                <form
                  action={async (fd) => {
                    "use server";
                    const title = fd.get("title") as string;
                    const desc = fd.get("description") as string;
                    const notes = fd.get("team_notes") as string;
                    const auth = fd.get("require_auth") === "on";
                    await createForm(projectId, title, desc, notes, auth);
                  }}
                >
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Form Title</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder="Beta Testing Feedback"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Public Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Instructions shown to users..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team_notes">Internal Team Notes</Label>
                      <Textarea
                        id="team_notes"
                        name="team_notes"
                        placeholder="Context for the team..."
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="require_auth" name="require_auth" />
                      <Label htmlFor="require_auth">
                        Require Authentication (Users need to log in)
                      </Label>
                    </div>
                    <Button type="submit" className="w-full">
                      Create Form
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-lg">
                    {form.title}
                    {form.require_auth ? (
                      <Lock className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Unlock className="w-4 h-4 text-green-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {form.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-2 rounded text-xs break-all font-mono mb-2">
                    /feedback/{form.token}
                  </div>
                  {form.team_notes && (
                    <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                      Note: {form.team_notes}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/feedback/${form.token}`} target="_blank">
                      <ExternalLink className="w-4 h-4 mr-2" /> Open
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/ps/projects/${projectId}/feedback/${form.id}`}
                    >
                      Edit Form
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
