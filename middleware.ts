import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function middleware(request: NextRequest) {
  // Handle Supabase session updates
  const response = await updateSession(request);

  // Check for admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // This basic check will be handled by the page component
    // More sophisticated middleware checks could be added here
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
