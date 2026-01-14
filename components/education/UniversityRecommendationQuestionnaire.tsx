"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  MapPin,
  Briefcase,
} from "lucide-react";
import { StudentProfile, RecommendedUniversity } from "@/types/education";
import { recommendUniversities } from "@/lib/ai/universityRecommender";
import { toast } from "sonner";

interface UniversityRecommendationQuestionnaireProps {
  onComplete: (recommendations: RecommendedUniversity[]) => void;
  onCancel: () => void;
}

const INTEREST_OPTIONS = [
  "Science & Technology",
  "Arts & Design",
  "Business & Economics",
  "Health & Medicine",
  "Social Sciences",
  "Engineering",
  "Languages",
  "Education",
  "Law & Politics",
];

const STRENGTH_OPTIONS = [
  "Mathematics",
  "Creative Thinking",
  "Communication",
  "Problem Solving",
  "Leadership",
  "Analysis",
  "Empathy",
  "Physical Skills",
];

const CAMPUS_VIBE_OPTIONS = [
  "Urban & Modern",
  "Traditional & Historic",
  "Green & Nature-focused",
  "Active & Social",
  "Quiet & Academic",
];

export function UniversityRecommendationQuestionnaire({
  onComplete,
  onCancel,
}: UniversityRecommendationQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({
    interests: [],
    strengths: [],
    preferredLocation: "",
    campusVibe: "",
    extracurriculars: [],
    careerAspirations: [],
    industryPreference: "",
  });

  const [customCareer, setCustomCareer] = useState("");

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const toggleSelection = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleSubmit = async () => {
    setIsAnalyzing(true);
    try {
      // Add custom career if present
      const finalProfile = { ...profile };
      if (customCareer.trim()) {
        finalProfile.careerAspirations = [
          ...finalProfile.careerAspirations,
          customCareer,
        ];
      }

      const result = await recommendUniversities(finalProfile);

      if (result.success && result.data) {
        onComplete(result.data);
      } else {
        toast.error("Failed to generate recommendations. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            AI University Advisor
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Answer a few questions to get personalized university
            recommendations.
          </p>
        </CardHeader>
        <CardContent>
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? "bg-blue-500" : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Interests & Strengths */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-3">
                <Label className="text-white text-lg">
                  What are you interested in?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <div
                      key={interest}
                      onClick={() => toggleSelection("interests", interest)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        profile.interests.includes(interest)
                          ? "bg-blue-600/20 border-blue-500 text-blue-100"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                      }`}
                    >
                      {interest}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-white text-lg">
                  What are your strengths?
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STRENGTH_OPTIONS.map((strength) => (
                    <div
                      key={strength}
                      onClick={() => toggleSelection("strengths", strength)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        profile.strengths.includes(strength)
                          ? "bg-green-600/20 border-green-500 text-green-100"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                      }`}
                    >
                      {strength}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Environment & Lifestyle */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-3">
                <Label className="text-white text-lg">
                  Preferred Campus Vibe
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CAMPUS_VIBE_OPTIONS.map((vibe) => (
                    <div
                      key={vibe}
                      onClick={() =>
                        setProfile({ ...profile, campusVibe: vibe })
                      }
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        profile.campusVibe === vibe
                          ? "bg-purple-600/20 border-purple-500 text-purple-100"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                      }`}
                    >
                      {vibe}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-white text-lg">Preferred Location</Label>
                <Input
                  placeholder="e.g. Bangkok, Chiang Mai, Near home..."
                  value={profile.preferredLocation}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferredLocation: e.target.value,
                    })
                  }
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Future Goals */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-3">
                <Label className="text-white text-lg">Dream Career</Label>
                <Input
                  placeholder="e.g. Software Engineer, Doctor, Entrepreneur..."
                  value={customCareer}
                  onChange={(e) => setCustomCareer(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white text-lg">
                  Industry Preference
                </Label>
                <Select
                  value={profile.industryPreference}
                  onValueChange={(val) =>
                    setProfile({ ...profile, industryPreference: val })
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">
                      Technology & Innovation
                    </SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="business">Business & Finance</SelectItem>
                    <SelectItem value="creative">
                      Creative Arts & Media
                    </SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="public_service">
                      Public Service
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-6 pt-0 flex justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isAnalyzing}
              className="border-slate-600 text-slate-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get Recommendations
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
