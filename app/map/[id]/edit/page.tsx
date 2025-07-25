"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  getMapWithNodes,
  updateMap,
  deleteMap,
  FullLearningMap,
} from "@/lib/supabase/maps";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Loading from "./loading";
import { MapEditor } from "@/components/map/MapEditor";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function EditMapPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const mapId = params.id as string;

  const [map, setMap] = useState<FullLearningMap | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMap = useCallback(async () => {
    // Don't set loading to true here to avoid flicker on re-fetch
    try {
      const fetchedMap = await getMapWithNodes(mapId);
      if (fetchedMap) {
        setMap(fetchedMap);
        setTitle(fetchedMap.title);
        setDescription(fetchedMap.description || "");
      } else {
        toast({ title: "Map not found", variant: "destructive" });
        router.push("/map");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load map data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [mapId, router, toast]);

  useEffect(() => {
    setIsLoading(true);
    fetchMap();
  }, [fetchMap]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateMap(mapId, { title, description });
      toast({
        title: "Map Updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update map.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMap(mapId);
      toast({
        title: "Map Deleted",
        description: `The map "${map?.title}" has been removed.`,
      });
      router.push("/map");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete map.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!map) {
    return null;
  }

  return (
    <div className="container max-w-7xl py-8 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Map Editor</h1>
        <Button asChild variant="outline">
          <Link href={`/map/${mapId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Viewer
          </Link>
        </Button>
      </div>
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Map Settings</CardTitle>
          <CardDescription>
            Modify the general details of your map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Map Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[60px]"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex justify-between items-center pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    type="button"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Map
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the learning map and all of its associated data (nodes,
                      paths, etc.).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Visual Editor</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Map Editor</CardTitle>
              <CardDescription>
                Add, connect, and edit the nodes of your learning map. Select a
                node to edit its details.
              </CardDescription>
            </CardHeader>
            <CardContent style={{ height: "70vh" }}>
              <MapEditor map={map} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="raw" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Map Data</CardTitle>
              <CardDescription>
                This is the full JSON representation of the map, including all
                nodes and paths.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm">
                {JSON.stringify(map, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
