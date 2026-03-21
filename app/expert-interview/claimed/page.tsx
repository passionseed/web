import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ExpertClaimedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-white"
      style={{
        background:
          "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
      }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Profile linked!</h1>
          <p className="text-gray-400">
            Your profile is now linked to your account. We&apos;ll notify you when it goes live.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
