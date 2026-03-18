"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MigrationPage() {
  const router = useRouter();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const handleMigrate = async () => {
    const pathId = window.location.pathname.split("/")[2];

    if (!confirm("This will migrate your PathLab from nodes to activities. Continue?")) {
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch("/api/pathlab/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId }),
      });

      if (!response.ok) throw new Error("Migration failed");

      const result = await response.json();
      setMigrationResult(result);

      toast.success("Migration completed successfully!");
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Migration failed. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRollback = async () => {
    const pathId = window.location.pathname.split("/")[2];

    if (!confirm("This will undo the migration. All activities will be deleted. Continue?")) {
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch("/api/pathlab/migrate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId }),
      });

      if (!response.ok) throw new Error("Rollback failed");

      const result = await response.json();
      setMigrationResult(null);

      toast.success("Rollback completed successfully!");
    } catch (error) {
      console.error("Rollback error:", error);
      toast.error("Rollback failed. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Builder
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white">PathLab Migration</h1>
        <p className="text-neutral-400 mt-2">
          Migrate your PathLab from the legacy node system to the new activities system
        </p>
      </div>

      {/* Migration Info */}
      <Card className="border-blue-800/50 bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-200">What This Migration Does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-blue-300">
          <ul className="list-disc list-inside space-y-2">
            <li>Converts each node in your path days to a dedicated activity</li>
            <li>Copies all content (videos, slides, text, PDFs, etc.) to the new system</li>
            <li>Migrates all assessments (quizzes, text answers, file uploads, etc.)</li>
            <li>Enables inline activity editing in PathDayBuilder</li>
            <li>Preserves all your original node data (can be rolled back)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-800/50 bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200 space-y-2">
            <p className="font-semibold">Before You Migrate:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-300/90">
              <li>Make sure all your days have the nodes you want assigned</li>
              <li>Save any pending changes in PathDayBuilder first</li>
              <li>This migration can be rolled back if needed</li>
              <li>After migration, you'll use the new activities UI</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Migration Actions */}
      {!migrationResult ? (
        <Card className="border-neutral-800 bg-neutral-900/80">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Ready to Migrate?</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  This will convert your PathLab to use the new activities system
                </p>
              </div>
              <Button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="bg-white text-black hover:bg-neutral-200"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  "Start Migration"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Migration Results */
        <Card className="border-green-800/50 bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-200 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Migration Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-400">Days Processed:</span>
                <span className="ml-2 font-semibold text-white">
                  {migrationResult.summary.total_days_processed}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Successful:</span>
                <span className="ml-2 font-semibold text-green-400">
                  {migrationResult.summary.successful}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Activities Created:</span>
                <span className="ml-2 font-semibold text-white">
                  {migrationResult.summary.total_activities_created}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Content Migrated:</span>
                <span className="ml-2 font-semibold text-white">
                  {migrationResult.summary.total_content_migrated}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Assessments Migrated:</span>
                <span className="ml-2 font-semibold text-white">
                  {migrationResult.summary.total_assessments_migrated}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-700">
              <Button
                variant="outline"
                onClick={handleRollback}
                disabled={isMigrating}
                className="border-red-700 text-red-400 hover:bg-red-950/50"
              >
                Rollback Migration
              </Button>
              <Button
                onClick={() => router.push(`/seeds/${window.location.pathname.split("/")[2]}/pathlab-builder`)}
                className="bg-white text-black hover:bg-neutral-200"
              >
                Go to Builder
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card className="border-neutral-800 bg-neutral-900/80">
        <CardHeader>
          <CardTitle className="text-base">Migration Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-300">
          <div>
            <h4 className="font-semibold text-white mb-2">What Happens During Migration:</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
              <li>System reads all path_days with node_ids</li>
              <li>For each node, creates a path_activity</li>
              <li>Copies node_content to path_content</li>
              <li>Copies node_assessments to path_assessments</li>
              <li>Marks day as migrated (migrated_from_nodes = true)</li>
              <li>Original node_ids are preserved (not deleted)</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">After Migration:</h4>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400">
              <li>PathDayBuilder shows new activities UI with inline editing</li>
              <li>Day headers display green "New" badge with activity counts</li>
              <li>You can add/edit/delete activities directly in the builder</li>
              <li>Content and assessments are managed per activity</li>
              <li>Original node system remains unchanged for other maps</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
