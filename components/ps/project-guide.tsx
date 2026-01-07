import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export function ProjectGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" suppressHydrationWarning>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Project Space Guide</DialogTitle>
          <DialogDescription>
            Understanding your digital tracking cassette.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">The Cassette</h4>
            <p className="text-sm text-muted-foreground">
              Your project is represented as a cassette. The{" "}
              <strong>Side A</strong> label shows your project name and theme
              song. Customize it by updating the project settings.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">The Insert Paper</h4>
            <p className="text-sm text-muted-foreground">
              Found tucked behind your cassette, this note tracks your vitals:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <strong>Feedback:</strong> Total responses from your public
                feedback forms.
              </li>
              <li>
                <strong>Focus:</strong> Total minutes spent in focus sessions
                for this project.
              </li>
              <li>
                <strong>Progress:</strong> Percentage of tasks completed.
              </li>
            </ul>
            <p className="text-sm italic mt-2 text-indigo-500">
              Hover over the paper to peek at your upcoming tasks!
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Task Management</h4>
            <p className="text-sm text-muted-foreground">
              Use the task list below to create cards, set difficulty, and drag
              onto the Focus Zone to start working.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
