import { useState } from "react";
import { Commitment } from "@/types/direction-finder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Scroll, Send, PartyPopper } from "lucide-react";

interface CommitmentContractProps {
  onComplete: (commitment: Commitment) => void;
  onBack: () => void;
}

export function CommitmentContract({
  onComplete,
  onBack,
}: CommitmentContractProps) {
  const [agreed, setAgreed] = useState(false);
  const [duolingoMode, setDuolingoMode] = useState(false);

  const handleFinish = () => {
    onComplete({
      agreedToViewDaily: agreed,
      duolingoMode,
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-8 pt-10">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-orange-500/20 animate-bounce">
          <Scroll className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">The Contract</h2>
        <p className="text-slate-400">
          You've built the plan. Now, commit to the journey.
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
        <CardHeader>
          <CardTitle className="text-white text-center">
            My Commitment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 space-y-6">
            <div className="flex items-start gap-4">
              <Checkbox
                id="daily"
                checked={agreed}
                onCheckedChange={(c) => setAgreed(!!c)}
                className="mt-1 border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <div className="space-y-1">
                <label
                  htmlFor="daily"
                  className="text-sm font-medium text-white leading-none cursor-pointer"
                >
                  I promise to view my Direction Profile everyday.
                </label>
                <p className="text-xs text-slate-400">
                  Consistency is key. Reminder: Check it before you start your
                  day.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white">
                  Duolingo Mode 🦉
                </label>
                <p className="text-xs text-slate-400">
                  Email me morning & night to keep me on track.
                </p>
              </div>
              <Switch
                checked={duolingoMode}
                onCheckedChange={setDuolingoMode}
              />
            </div>
          </div>

          <Button
            onClick={handleFinish}
            disabled={!agreed}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold h-12 text-lg shadow-lg shadow-green-500/20"
          >
            <PartyPopper className="w-5 h-5 mr-2" /> Sign & Start Journey
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={onBack}
              className="text-slate-500 text-xs"
            >
              Wait, let me review my plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
