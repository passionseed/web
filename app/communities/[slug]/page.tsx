"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client"; // Import Supabase client
import type { User } from "@supabase/supabase-js"; // Import Supabase User type
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/community/PostCard";
import {
  getCommunityBySlug,
  listCommunityPosts,
  joinCommunity,
  leaveCommunity,
  createPost,
} from "@/lib/api/community";
import { Community, CommunityPost } from "@/types/community";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Icons from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { PostEditor } from "@/components/community/PostEditor";

type TabType = "posts" | "members" | "about";

export default function CommunityPage() {
  const supabase = createClient();
  const { slug } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  // State for user and auth loading, replacing useAuth
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch the user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };

    fetchUser();
  }, []);

  const loadCommunity = async () => {
    try {
      setIsLoading(true);
      const data = await getCommunityBySlug(slug as string);

      if (!data) {
        router.push("/404");
        return;
      }

      setCommunity(data);

      // Load initial posts
      await loadPosts(data.id, true);
    } catch (error) {
      console.error("Error loading community:", error);
      toast({
        title: "Error",
        description: "Failed to load community. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async (communityId: string, reset = false) => {
    const currentPage = reset ? 1 : page;

    try {
      const { data, count } = await listCommunityPosts(
        communityId,
        currentPage
      );

      setPosts((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === 10);
      if (reset) setPage(1);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "Error",
        description: "Failed to load posts. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Wait for both slug and user auth check to complete before loading community data
  useEffect(() => {
    if (slug && !authLoading) {
      loadCommunity();
    }
  }, [slug, authLoading]);

  const handleJoinCommunity = async () => {
    if (!user) {
      router.push(`/login?redirect=/communities/${slug}`);
      return;
    }

    try {
      setIsJoining(true);
      await joinCommunity({ community_id: community!.id });

      // Update community data
      setCommunity((prev) => ({
        ...prev!,
        is_member: true,
        member_count: (prev?.member_count || 0) + 1,
      }));

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
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      setIsJoining(true);
      await leaveCommunity(community!.id);

      // Update community data
      setCommunity((prev) => ({
        ...prev!,
        is_member: false,
        member_count: Math.max(0, (prev?.member_count || 1) - 1),
      }));

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
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreatePost = async (content: string, mediaIds?: string[]) => {
    if (!community) return;

    try {
      setIsPosting(true);
      const newPost = await createPost({
        community_id: community.id,
        content,
        media_ids: mediaIds,
      });

      // Refresh posts
      await loadPosts(community.id, true);

      toast({
        title: "Success",
        description: "Your post has been published!",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    // In a real app, you would call the toggleLike API here
    // For now, we'll just update the UI optimistically
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              is_liked: !post.is_liked,
              like_count: post.is_liked
                ? post.like_count - 1
                : post.like_count + 1,
            }
          : post
      )
    );
  };

  // Show a loading state while fetching auth status OR community data
  if (authLoading || isLoading || !community) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  const isMember = community.is_member;
  const isAdmin =
    community.member_role === "admin" || community.member_role === "owner";

  return (
    <div className="container py-8">
      {/* Community Header */}
      <div className="relative rounded-lg overflow-hidden mb-8">
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          {community.cover_image_url && (
            <Image
              src={community.cover_image_url}
              alt={`${community.name} cover`}
              fill
              className="object-cover"
              sizes="100vw"
              priority={true}
            />
          )}
        </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        </div>

        <div className="relative px-6 pb-6 -mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-full border-4 border-background bg-background overflow-hidden">
                {community.profile_image_url ? (
                  <img
                    src={community.profile_image_url}
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Icons.users className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold">{community.name}</h1>
                <p className="text-muted-foreground">
                  {community.member_count} member
                  {community.member_count !== 1 ? "s" : ""}
                  {!community.is_public && " • Private community"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" size="sm">
                  <Icons.settings className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              )}

              {isMember ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveCommunity}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.userMinus className="mr-2 h-4 w-4" />
                  )}
                  Leave Community
                </Button>
              ) : (
                <Button onClick={handleJoinCommunity} disabled={isJoining}>
                  {isJoining ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.userPlus className="mr-2 h-4 w-4" />
                  )}
                  Join Community
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabType)}
            className="space-y-6"
          >
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="posts"
                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Members
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                About
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-6">
              {isMember ? (
                <div className="bg-card rounded-lg border p-4">
                  <PostEditor
                    onSubmit={handleCreatePost}
                    isSubmitting={isPosting}
                    placeholder={`What's on your mind, ${user?.user_metadata?.name || "friend"}?`}
                  />
                </div>
              ) : (
                <div className="bg-card rounded-lg border p-6 text-center">
                  <Icons.lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="font-medium mb-2">Join the community</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Become a member to post and interact with the community.
                  </p>
                  <Button onClick={handleJoinCommunity} disabled={isJoining}>
                    {isJoining ? (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.userPlus className="mr-2 h-4 w-4" />
                    )}
                    Join Community
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLikePost}
                      onComment={() => {
                        console.log("Comment on post:", post.id);
                      }}
                      onShare={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/posts/${post.id}`
                        );
                        toast({
                          title: "Link copied to clipboard",
                          description: "Share this post with others!",
                        });
                      }}
                      onDelete={async () => {
                        console.log("Delete post:", post.id);
                        setPosts((prev) =>
                          prev.filter((p) => p.id !== post.id)
                        );
                        toast({
                          title: "Post deleted",
                          description: "Your post has been deleted.",
                        });
                      }}
                      isOwner={post.author.id === user?.id}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Icons.newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No posts yet</h3>
                    <p className="text-muted-foreground mt-2">
                      {isMember
                        ? "Be the first to post in this community!"
                        : "Join the community to see posts."}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="members">
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Community Members
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">User {i}</p>
                        <p className="text-sm text-muted-foreground">
                          Member since 2023
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="about">
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">
                  About {community.name}
                </h2>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-line">
                    {community.description || "No description provided."}
                  </p>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-3">Community Details</h3>
                    <div className="grid gap-3">
                      <div className="flex items-center">
                        <Icons.users className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>
                          {community.member_count} member
                          {community.member_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Icons.calendar className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>
                          Created{" "}
                          {formatDistanceToNow(new Date(community.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Icons.globe className="h-4 w-4 text-muted-foreground mr-2" />
                        <span>
                          {community.is_public ? "Public" : "Private"} community
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-medium mb-3">Admin Tools</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm">
                          <Icons.settings className="mr-2 h-4 w-4" />
                          Community Settings
                        </Button>
                        <Button variant="outline" size="sm">
                          <Icons.users className="mr-2 h-4 w-4" />
                          Manage Members
                        </Button>
                        <Button variant="outline" size="sm">
                          <Icons.image className="mr-2 h-4 w-4" />
                          Update Images
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-3">Related Communities</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Icons.users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Related Community {i}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(Math.random() * 1000)} members
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2">
                View all
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <h3 className="font-medium mb-3">Community Guidelines</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Icons.checkCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Be kind and respectful to others</span>
              </li>
              <li className="flex items-start gap-2">
                <Icons.checkCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>No spam or self-promotion</span>
              </li>
              <li className="flex items-start gap-2">
                <Icons.checkCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Keep discussions relevant to the community</span>
              </li>
              <li className="flex items-start gap-2">
                <Icons.checkCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Respect everyone's privacy</span>
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-lg border p-4 text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} {community.name}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
