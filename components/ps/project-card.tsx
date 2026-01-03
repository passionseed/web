import { PSProject } from "@/actions/ps";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: PSProject;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-1 text-xl">{project.name}</CardTitle>
          {/* Status badge could go here if we add project status later */}
        </div>
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {project.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {project.goal && (
          <div className="bg-muted/50 p-3 rounded-md mb-2">
            <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-primary">
              <Target className="h-4 w-4" />
              Goal
            </div>
            <p className="text-sm text-foreground/90 line-clamp-2">
              {project.goal}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          asChild
          variant="outline"
          className="w-full justify-between group"
        >
          <Link href={`/ps/projects/${project.id}`}>
            View Details
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
