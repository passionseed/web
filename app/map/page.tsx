"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMaps } from "@/lib/supabase/maps";
import { LearningMap } from "@/types/map";
import { useToast } from "@/components/ui/use-toast";
import Loading from "./loading";

export default function MapsPage() {
  const [maps, setMaps] = useState<LearningMap[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMaps = async () => {
      try {
        const fetchedMaps = await getMaps();
        setMaps(fetchedMaps);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Failed to load learning maps.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, [toast]);

  if (loading) {
    return <Loading />;
  }

  if (!maps || maps.length === 0) {
    return <div className="text-center p-8">No maps found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Learning Maps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {maps.map((map) => (
          <Link href={`/map/${map.id}`} key={map.id}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle>{map.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{map.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

