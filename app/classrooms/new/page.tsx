"use client";

import { useRouter } from "next/navigation";
import { CreateClassroomModal } from "@/components/classroom/CreateClassroomModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Users, Clock } from "lucide-react";
import Link from "next/link";

export default function NewClassroomPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create New Classroom</h1>
        <p className="text-muted-foreground">
          Set up a new classroom to start teaching and managing student progress
        </p>
      </div>

      {/* Quick Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Quick Setup Guide</span>
          </CardTitle>
          <CardDescription>
            Follow these steps to get your classroom ready for students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h3 className="font-semibold">Create Classroom</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Give your classroom a name and description. A unique join code
                will be generated automatically.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h3 className="font-semibold">Share Join Code</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Share the 6-character join code with your students so they can
                join your classroom.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h3 className="font-semibold">Create Assignments</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Select specific nodes from learning maps to create custom
                assignments with due dates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Classroom Benefits</CardTitle>
          <CardDescription>
            Here's what you can do with PSeed classrooms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Student Management</h4>
                <p className="text-sm text-muted-foreground">
                  Track student progress, manage enrollments, and provide
                  personalized feedback
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Custom Assignments</h4>
                <p className="text-sm text-muted-foreground">
                  Create assignments from any combination of nodes across
                  different learning maps
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Due Date Management</h4>
                <p className="text-sm text-muted-foreground">
                  Set deadlines and track completion rates to keep students on
                  track
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Progress Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor student progress with detailed analytics and
                  completion statistics
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Classroom Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to Start?</CardTitle>
          <CardDescription>
            Create your first classroom and start managing student learning
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              You can always modify classroom settings and add more students
              later.
            </p>
            <CreateClassroomModal
              onClassroomCreated={() => {
                // Redirect to classrooms page after creation
                router.push("/classrooms");
              }}
            />
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>Need help?</p>
            <Link
              href="/help/classroom-guide"
              className="text-blue-500 hover:underline"
            >
              View Classroom Guide
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
