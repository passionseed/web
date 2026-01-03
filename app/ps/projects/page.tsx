import { getProjects, createProject } from "@/actions/ps";
import { ProjectCard } from "@/components/ps/project-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserRolesClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify role server-side (simple check before action check)
  // Ideally middleware handles this, but we'll do a quick check or let the action fail
  // We can fetch projects - if it fails, it throws authorized error which we can catch or let bubble
  let projects = [];
  try {
    projects = await getProjects();
  } catch (e) {
    // If unauthorized, redirect or show error
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your passion projects and track progress.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={createProject}>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Define the vision for your new project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="My Awesome Project"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Input
                    id="goal"
                    name="goal"
                    placeholder="What do you want to achieve?"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="why">Why</Label>
                  <Textarea
                    id="why"
                    name="why"
                    placeholder="Why is this important to you?"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Project details and scope..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Project</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
