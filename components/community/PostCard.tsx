import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommunityPost } from '@/types/community';

type PostCardProps = {
  post: CommunityPost;
  onLike?: (postId: string) => Promise<void>;
  onComment?: (post: CommunityPost) => void;
  onShare?: (post: CommunityPost) => void;
  onDelete?: (postId: string) => Promise<void>;
  isOwner?: boolean;
};

export function PostCard({ post, onLike, onComment, onShare, onDelete, isOwner = false }: PostCardProps) {
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await onLike?.(post.id);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onComment?.(post);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(post);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this post?')) {
      await onDelete?.(post.id);
    }
  };

  return (
    <Link href={`/posts/${post.id}`} className="block">
      <div className="bg-card rounded-lg border p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar_url || ''} alt={post.author.username} />
            <AvatarFallback>
              {post.author.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{post.author.full_name || post.author.username}</span>
                <span className="text-muted-foreground text-sm ml-2">
                  @{post.author.username}
                </span>
              </div>
              <div className="flex items-center text-muted-foreground text-sm">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                {(isOwner || post.author.id === post.author_id) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                        Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            
            <p className="mt-1 text-sm whitespace-pre-line">{post.content}</p>
            
            {post.media && post.media.length > 0 && (
              <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {post.media.map((media) => (
                  <div key={media.id} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                    {media.type.startsWith('image/') ? (
                      <img 
                        src={media.url} 
                        alt="Post media" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground">Media</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-3 flex items-center justify-between text-muted-foreground text-sm">
              <div className="flex items-center space-x-4">
                <button 
                  className={`flex items-center space-x-1 hover:text-primary ${post.is_liked ? 'text-red-500' : ''}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                  <span>{post.like_count}</span>
                </button>
                <button 
                  className="flex items-center space-x-1 hover:text-primary"
                  onClick={handleComment}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comment_count}</span>
                </button>
              </div>
              <button 
                className="flex items-center space-x-1 hover:text-primary"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            
            {post.comment_count > 0 && (
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                <Link href={`/posts/${post.id}`} className="hover:underline">
                  View all {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
