import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Community } from '@/types/community';

type CommunityCardProps = {
  community: Community;
  isMember?: boolean;
  onJoin?: (communityId: string) => Promise<void>;
  onLeave?: (communityId: string) => Promise<void>;
};

export function CommunityCard({ community, isMember = false, onJoin, onLeave }: CommunityCardProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
        {community.cover_image_url ? (
          <Image
            src={community.cover_image_url}
            alt={`${community.name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 300px, 400px"
            loading="lazy"
          />
        ) : null}
        {community.profile_image_url && (
          <div className="absolute -bottom-8 left-4">
            <div className="w-16 h-16 rounded-full border-4 border-background bg-background overflow-hidden">
              <Image
                src={community.profile_image_url}
                alt={community.name}
                width={64}
                height={64}
                className="object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>
      
      <CardHeader className="pt-10 pb-3">
        <CardTitle className="text-xl">
          <Link href={`/communities/${community.slug || community.id}`} className="hover:underline">
            {community.name}
          </Link>
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {community.short_description || community.description}
        </p>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="flex items-center text-sm text-muted-foreground">
          <span className="font-medium">{community.member_count}</span>
          <span className="ml-1">member{community.member_count !== 1 ? 's' : ''}</span>
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4">
        {isMember ? (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onLeave?.(community.id)}
          >
            Leave Community
          </Button>
        ) : (
          <Button 
            className="w-full"
            onClick={() => onJoin?.(community.id)}
          >
            Join Community
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
