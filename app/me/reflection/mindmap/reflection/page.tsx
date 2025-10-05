"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Heart, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Topic {
  id: string;
  text: string;
  x: number;
  y: number;
  notes?: string;
}

interface FeelingRating {
  satisfaction: number;
  progress: number;
  challenge: number;
}

interface ReflectionAnswers {
  overallWhy: string;
}

export default function MindmapReflectionPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ratings, setRatings] = useState<FeelingRating>({
    satisfaction: 0,
    progress: 0,
    challenge: 0
  });
  const [answers, setAnswers] = useState<ReflectionAnswers>({
    overallWhy: ""
  });

  useEffect(() => {
    // Get topics from session storage
    const storedTopics = sessionStorage.getItem('mindmap-topics');
    if (storedTopics) {
      setTopics(JSON.parse(storedTopics));
    }

    // Get ratings from session storage
    const storedRatings = sessionStorage.getItem('mindmap-ratings');
    if (storedRatings) {
      setRatings(JSON.parse(storedRatings));
    } else {
      // If no ratings, redirect back to feelings
      router.push('/me/reflection/mindmap/feelings');
    }
  }, [router]);

  const handleAnswerChange = (type: keyof ReflectionAnswers, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleContinue = () => {
    // Save reflection answers to session storage
    sessionStorage.setItem('mindmap-reflection', JSON.stringify(answers));
    router.push('/me/reflection/mindmap/summary');
  };

  const isComplete = answers.overallWhy.trim();

  const RatingDisplay = ({ 
    label, 
    value, 
    icon: Icon, 
    color,
    answer,
    onAnswerChange,
    placeholder
  }: {
    label: string;
    value: number;
    icon: any;
    color: string;
    answer: string;
    onAnswerChange: (value: string) => void;
    placeholder: string;
  }) => (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Rating Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">{label}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{value}/5</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div
                    key={rating}
                    className={`w-3 h-3 rounded-full ${
                      value >= rating ? color.replace('bg-', 'bg-') : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Why Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Why do you feel this way about your {label.toLowerCase()} today?
            </label>
            <Textarea
              placeholder={placeholder}
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feelings
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Reflect on Your Day</h1>
          <p className="text-muted-foreground">
            Tell us why you rated your feelings this way
          </p>
        </div>
      </div>

      {/* Feelings Summary */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Satisfaction</h3>
                  <p className="text-2xl font-bold">{ratings.satisfaction}/100</p>
                </div>
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ratings.satisfaction}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Progress</h3>
                  <p className="text-2xl font-bold">{ratings.progress}/100</p>
                </div>
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ratings.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Challenge</h3>
                  <p className="text-2xl font-bold">{ratings.challenge}/100</p>
                </div>
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ratings.challenge}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Why Question */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Why</h3>
            <p className="text-sm text-muted-foreground">
              Explain why you rated your satisfaction, progress, and challenge this way today
            </p>
            <Textarea
              placeholder="Reflect on your day... What made you feel satisfied or unsatisfied? What progress did you make? What was challenging and how did you handle it?"
              value={answers.overallWhy}
              onChange={(e) => handleAnswerChange('overallWhy', e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-center mt-8">
        <Button 
          onClick={handleContinue}
          disabled={!isComplete}
          size="lg"
          className="px-8"
        >
          Continue to Summary
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {!isComplete && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Please answer the reflection question to continue
        </p>
      )}
    </div>
  );
}