"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Target, CheckCircle, Heart, TrendingUp, Zap } from "lucide-react";
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

export default function MindmapSummaryPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ratings, setRatings] = useState<FeelingRating>({ satisfaction: 0, progress: 0, challenge: 0 });
  const [reflectionAnswers, setReflectionAnswers] = useState<ReflectionAnswers>({ overallWhy: "" });
  const [currentDate, setCurrentDate] = useState("");

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
    }

    // Get reflection answers from session storage
    const storedReflection = sessionStorage.getItem('mindmap-reflection');
    if (storedReflection) {
      setReflectionAnswers(JSON.parse(storedReflection));
    }

    // Set current date
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  }, []);

  const topicsWithNotes = topics.filter(topic => topic.notes && topic.notes.trim());
  const topicsWithoutNotes = topics.filter(topic => !topic.notes || !topic.notes.trim());

  const handleFinish = () => {
    // Clear session storage and navigate back to dashboard
    sessionStorage.removeItem('mindmap-topics');
    sessionStorage.removeItem('mindmap-ratings');
    sessionStorage.removeItem('mindmap-reflection');
    router.push('/me');
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mindmap
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Daily Reflection Summary</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {currentDate}
          </p>
        </div>
      </div>

      {/* Feelings Summary */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-sm text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold">{ratings.satisfaction}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{ratings.progress}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Challenge</p>
                <p className="text-2xl font-bold">{ratings.challenge}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Topics</p>
                <p className="text-2xl font-bold">{topics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Progress</p>
                <p className="text-2xl font-bold">{topicsWithNotes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Need Attention</p>
                <p className="text-2xl font-bold">{topicsWithoutNotes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Details */}
      {topicsWithNotes.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topicsWithNotes.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20"
              >
                <h4 className="font-semibold text-lg mb-2 text-green-800 dark:text-green-200">
                  {topic.text}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topic.notes}
                </p>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Topics Needing Attention */}
      {topicsWithoutNotes.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Topics to Focus On Tomorrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topicsWithoutNotes.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/20"
                >
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm font-medium">{topic.text}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Consider adding notes for these topics in your next reflection session.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reflection Details */}
      {reflectionAnswers.overallWhy && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <h4 className="font-semibold">
                  Why you rated your day: {ratings.satisfaction}/100 satisfaction, {ratings.progress}/100 progress, {ratings.challenge}/100 challenge
                </h4>
              </div>
              <div className="bg-gradient-to-r from-pink-50 via-blue-50 to-orange-50 dark:from-pink-900/20 dark:via-blue-900/20 dark:to-orange-900/20 p-6 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {reflectionAnswers.overallWhy}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reflection Insights */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Daily Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feelings-based insights */}
          {ratings.satisfaction > 0 && (
            <div className="space-y-3">
              {ratings.satisfaction >= 70 && (
                <div className="flex items-start gap-3 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <Heart className="h-5 w-5 text-pink-500 mt-1" />
                  <div>
                    <p className="font-medium">High Satisfaction!</p>
                    <p className="text-sm text-muted-foreground">
                      You're feeling great about today's work. This positive energy will help fuel tomorrow's progress!
                    </p>
                  </div>
                </div>
              )}

              {ratings.progress >= 70 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-medium">Strong Progress Made!</p>
                    <p className="text-sm text-muted-foreground">
                      You made significant progress today on {topicsWithNotes.length} out of {topics.length} topics. 
                      Keep this momentum going!
                    </p>
                  </div>
                </div>
              )}

              {ratings.challenge >= 70 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-500 mt-1" />
                  <div>
                    <p className="font-medium">Embracing Challenge!</p>
                    <p className="text-sm text-muted-foreground">
                      Today was challenging, which means you're pushing your boundaries and growing. Great job!
                    </p>
                  </div>
                </div>
              )}

              {topicsWithoutNotes.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Areas for Tomorrow</p>
                    <p className="text-sm text-muted-foreground">
                      Consider dedicating time to the {topicsWithoutNotes.length} topics that need attention.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {ratings.satisfaction === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Complete your feelings rating to see personalized insights!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Edit Mindmap
        </Button>
        <Button 
          onClick={handleFinish}
          size="lg"
          className="px-8"
        >
          Complete Reflection
        </Button>
      </div>
    </div>
  );
}