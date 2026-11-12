import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { discordProfileUrl, type ShiftPerson } from "@/lib/shift/canvas-people";
import { cn } from "@/lib/utils";

/** A student as staff know them: picture, name, nickname, and their Discord account. */
export function PersonLine({ person, compact = false }: { person: ShiftPerson; compact?: boolean }) {
  const profile = person.discord ? discordProfileUrl(person.discord) : null;
  const handle = person.discord?.username ? `@${person.discord.username}` : person.discord ? "Discord profile" : null;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className={cn("shrink-0", compact ? "h-6 w-6" : "h-8 w-8")}>
        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
        <AvatarFallback className="text-xs">{person.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-sm">
          <span className="font-medium">{person.name}</span>
          {person.nickname && person.nickname !== person.name && (
            <span className="text-muted-foreground"> · {person.nickname}</span>
          )}
        </span>
        {handle && (
          <span className="block truncate text-xs text-muted-foreground">
            {profile ? (
              <a href={profile} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                {handle}
              </a>
            ) : (
              handle
            )}
            {person.discord?.displayName && ` · ${person.discord.displayName}`}
          </span>
        )}
      </span>
    </span>
  );
}
