import { DirectionFinderResult } from '@/types/direction-finder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Download, Share2 } from 'lucide-react';

interface DirectionResultsProps {
  result: DirectionFinderResult;
}

export function DirectionResults({ result }: DirectionResultsProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white">Your Direction Profile</h2>
        <p className="text-slate-400">Based on your interests, strengths, and our conversation.</p>
      </div>

      {/* Ikigai Profile Summary */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Your Core Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider">What Energizes You</h4>
            <div className="flex flex-wrap gap-2">
              {result.profile.energizers.map((item, i) => (
                <Badge key={i} variant="secondary" className="bg-blue-900/30 text-blue-200 hover:bg-blue-900/50">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-400 uppercase tracking-wider">Your Strengths</h4>
            <div className="flex flex-wrap gap-2">
              {result.profile.strengths.map((item, i) => (
                <Badge key={i} variant="secondary" className="bg-green-900/30 text-green-200 hover:bg-green-900/50">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direction Vectors */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Recommended Directions</h3>
        <div className="grid grid-cols-1 gap-4">
          {result.vectors.map((vector, idx) => (
            <Card key={idx} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{vector.name}</h4>
                    <p className="text-sm text-slate-400">
                      Matches your interest in <span className="text-blue-400">{vector.fit_reason.interest_alignment}</span> and skill in <span className="text-green-400">{vector.fit_reason.strength_alignment}</span>.
                    </p>
                  </div>
                  <Badge className="bg-purple-600">Top Match</Badge>
                </div>
                
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                  <h5 className="text-sm font-medium text-slate-300">How to explore this:</h5>
                  <ul className="space-y-2">
                    {vector.exploration_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{step.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-slate-400">
                    <span className="font-medium text-white">First Step:</span> {vector.first_step}
                  </div>
                  <Button size="sm" variant="outline">
                    View Details <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Save Profile
        </Button>
        <Button className="gap-2 bg-white text-slate-900 hover:bg-slate-200">
          <Share2 className="w-4 h-4" /> Share Results
        </Button>
      </div>
    </div>
  );
}
