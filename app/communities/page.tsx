"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityCard } from "@/components/community/CommunityCard";
import { CreateCommunityForm } from "@/components/community/CreateCommunityForm";
import { listCommunities } from "@/lib/api/community";
import { Community } from "@/types/community";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";

export default function CommunitiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "joined">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get the current user
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    getUser();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadCommunities = async (reset = false) => {
    if (authLoading) return;

    const currentPage = reset ? 1 : page;

    try {
      setIsLoading(true);
      const { data, count } = await listCommunities({
        search: searchQuery,
        is_member: activeTab === "joined" ? true : undefined,
        page: currentPage,
        sort_by: "popular",
      });

      setCommunities((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === 10);
      if (reset) setPage(1);
    } catch (error) {
      console.error("Error loading communities:", error);
      toast({
        title: "Error",
        description: "Failed to load communities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery !== "") {
      const timer = setTimeout(() => {
        loadCommunities(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      loadCommunities(true);
    }
  }, [searchQuery, activeTab]);

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      router.push("/login?redirect=/communities");
      return;
    }

    try {
      // In a real app, you would call the joinCommunity API here
      // For now, we'll just update the UI optimistically
      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? {
                ...community,
                is_member: true,
                member_count: (community.member_count || 0) + 1,
              }
            : community
        )
      );

      toast({
        title: "Success",
        description: "You have joined the community!",
      });
    } catch (error) {
      console.error("Error joining community:", error);
      toast({
        title: "Error",
        description: "Failed to join community. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    try {
      // In a real app, you would call the leaveCommunity API here
      // For now, we'll just update the UI optimistically
      setCommunities((prev) =>
        prev.map((community) =>
          community.id === communityId
            ? {
                ...community,
                is_member: false,
                member_count: Math.max(0, (community.member_count || 1) - 1),
              }
            : community
        )
      );

      toast({
        title: "Success",
        description: "You have left the community.",
      });
    } catch (error) {
      console.error("Error leaving community:", error);
      toast({
        title: "Error",
        description: "Failed to leave community. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isCreating) {
    return (
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setIsCreating(false)}
          >
            ← Back to Communities
          </Button>
          <h1 className="text-3xl font-bold mb-6">Create a Community</h1>
          <CreateCommunityForm
            onSuccess={() => {
              setIsCreating(false);
              loadCommunities(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Communities</h1>
          <p className="text-muted-foreground">
            Join communities to connect with like-minded people and share your
            journey.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Icons.plus className="mr-2 h-4 w-4" />
          Create Community
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search communities..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs
        defaultValue="all"
        className="space-y-6"
        onValueChange={(value) => setActiveTab(value as "all" | "joined")}
      >
        <TabsList>
          <TabsTrigger value="all">All Communities</TabsTrigger>
          <TabsTrigger value="joined">My Communities</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading && communities.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : communities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isMember={community.is_member}
                  onJoin={() => handleJoinCommunity(community.id)}
                  onLeave={() => handleLeaveCommunity(community.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icons.users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No communities found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? "Try adjusting your search or create a new community."
                  : "Be the first to create a community!"}
              </p>
              <Button className="mt-4" onClick={() => setIsCreating(true)}>
                Create Community
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="joined" className="space-y-4">
          {isLoading && communities.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : communities.filter((c) => c.is_member).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities
                .filter((community) => community.is_member)
                .map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    isMember={true}
                    onLeave={() => handleLeaveCommunity(community.id)}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Icons.users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                You haven't joined any communities yet
              </h3>
              <p className="text-muted-foreground mt-2">
                Join a community to connect with others who share your
                interests.
              </p>
              <Button className="mt-4" onClick={() => setActiveTab("all")}>
                Browse Communities
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {hasMore && !isLoading && communities.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={() => {
              setPage((prev) => prev + 1);
              loadCommunities(false);
            }}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
