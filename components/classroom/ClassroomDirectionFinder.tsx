"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getClassroomDirectionFinderResults,
  DirectionFinderResultRow,
} from "@/app/actions/classroom/direction-finder";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { DirectionResultsView } from "@/components/education/direction-finder/DirectionResultsView";

interface ClassroomDirectionFinderProps {
  classroomId: string;
}

export function ClassroomDirectionFinder({
  classroomId,
}: ClassroomDirectionFinderProps) {
  const [results, setResults] = useState<DirectionFinderResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<DirectionFinderResultRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getClassroomDirectionFinderResults(classroomId);
      setResults(data);
    } catch (error) {
      console.error("Error loading results:", error);
      toast.error("Failed to load direction finder results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classroomId]);

  const filteredResults = results.filter((item) => {
    const searchLower = searchTerm.toLowerCase();

    // Search in user info
    if (
      item.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      item.profiles?.email?.toLowerCase().includes(searchLower) ||
      item.profiles?.username?.toLowerCase().includes(searchLower)
    ) {
      return true;
    }

    // Search in chat context
    if (item.chat_context?.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in chat history
    if (
      item.chat_history?.some((msg) =>
        msg.content.toLowerCase().includes(searchLower)
      )
    ) {
      return true;
    }

    // Search in result vectors
    if (
      item.result?.vectors?.some((v) =>
        v.name.toLowerCase().includes(searchLower)
      )
    ) {
      return true;
    }

    return false;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Direction Results</CardTitle>
              <CardDescription>
                View AI assessment results and chat history for students in this
                classroom.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student, content, or results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.profiles?.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResult(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] p-0 overflow-hidden gap-0">
          <VisuallyHidden.Root>
            <DialogTitle>
              Student Direction Profile for{" "}
              {selectedResult?.profiles?.full_name || selectedResult?.profiles?.email || "Student"}
            </DialogTitle>
          </VisuallyHidden.Root>
          <div className="h-full max-h-[85vh] overflow-auto -mt-8">
            {selectedResult && selectedResult.result && (
              <DirectionResultsView
                result={selectedResult.result}
                answers={selectedResult.answers}
                chatHistory={selectedResult.chat_history}
                mode="journey_view"
                studentName={
                  selectedResult.profiles?.full_name ||
                  selectedResult.profiles?.email?.split("@")[0] ||
                  "Student"
                }
                onBack={() => setIsDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
