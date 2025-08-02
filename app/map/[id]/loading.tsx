import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@radix-ui/react-dropdown-menu";

export default function Loading() {
  return (
    <div className="w-full h-[calc(100vh-var(--header-height))] flex">
      <div className="flex-grow p-4">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="w-[30%] p-4 border-l">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Separator className="my-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
