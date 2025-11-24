"use client";

import { CSIICourse, CATEGORY_COLORS } from "@/types/csii";
import { X, Mail, MapPin, Clock, Calendar, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CourseDetailPanelProps {
  course: CSIICourse;
  onClose: () => void;
}

export function CourseDetailPanel({ course, onClose }: CourseDetailPanelProps) {
  const categoryColor = CATEGORY_COLORS[course.category] || "#6b7280";

  return (
    <div className="w-96 border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-2">
            <Badge
              className="mb-2"
              style={{ backgroundColor: categoryColor, color: "white" }}
            >
              {course.category}
            </Badge>
            <h2 className="font-semibold text-lg leading-tight">
              {course.courseTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {course.courseNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<BookOpen className="h-4 w-4" />}
              label="Credits"
              value={course.credits || "3 Credits"}
            />
            <InfoCard
              icon={<Clock className="h-4 w-4" />}
              label="Hours/Week"
              value={course.hoursPerWeek || "3 Hours"}
            />
            <InfoCard
              icon={<Calendar className="h-4 w-4" />}
              label="Semester"
              value={course.semester || "N/A"}
            />
            <InfoCard
              icon={<Users className="h-4 w-4" />}
              label="Sessions"
              value={course.totalSessions > 0 ? `${course.totalSessions}` : "N/A"}
            />
          </div>

          <Separator />

          {/* Instructor */}
          {course.instructor && (
            <div>
              <h3 className="font-medium text-sm mb-2">Instructor</h3>
              <p className="text-sm">{course.instructor}</p>
              {course.instructorEmail && (
                <a
                  href={`mailto:${course.instructorEmail}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Mail className="h-3 w-3" />
                  {course.instructorEmail}
                </a>
              )}
              {course.instructorRoom && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  Room {course.instructorRoom}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          {(course.status || course.condition) && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-2">Course Status</h3>
                <div className="flex flex-wrap gap-2">
                  {course.status && (
                    <Badge variant="outline">{course.status}</Badge>
                  )}
                  {course.condition && course.condition !== "None" && (
                    <Badge variant="secondary">{course.condition}</Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Academic Year */}
          {course.academicYear && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-2">Academic Year</h3>
                <p className="text-sm">{course.academicYear}</p>
              </div>
            </>
          )}

          {/* Faculty */}
          {course.facultyDepartment && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium text-sm mb-2">Faculty/Department</h3>
                <p className="text-sm text-muted-foreground">
                  {course.facultyDepartment}
                </p>
              </div>
            </>
          )}

          {/* Curriculum */}
          <Separator />
          <div>
            <h3 className="font-medium text-sm mb-2">Program</h3>
            <p className="text-sm text-muted-foreground">{course.curriculum}</p>
            <p className="text-xs text-muted-foreground mt-1">{course.degree}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
