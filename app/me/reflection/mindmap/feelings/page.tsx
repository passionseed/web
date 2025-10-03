"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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

export default function MindmapFeelingsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [ratings, setRatings] = useState<FeelingRating>({
    satisfaction: 0,
    progress: 0,
    challenge: 0
  });

  useEffect(() => {
    // Get topics from session storage
    const storedTopics = sessionStorage.getItem('mindmap-topics');
    if (storedTopics) {
      setTopics(JSON.parse(storedTopics));
    } else {
      // If no topics, redirect back to mindmap
      router.push('/me/reflection/mindmap');
    }
  }, [router]);

  const handleRatingChange = (type: keyof FeelingRating, value: number) => {
    setRatings(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleContinue = () => {
    // Save ratings to session storage
    sessionStorage.setItem('mindmap-ratings', JSON.stringify(ratings));
    router.push('/me/reflection/mindmap/reflection');
  };

  const isComplete = ratings.satisfaction > 0 && ratings.progress > 0 && ratings.challenge > 0;

  const RatingSlider = ({ 
    label, 
    value, 
    onChange, 
    icon: Icon, 
    color,
    description 
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: any;
    color: string;
    description: string;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{label}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>1 - Low</span>
          <span>100 - High</span>
        </div>
        <div 
          className="relative w-full h-3 bg-gray-200 rounded-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            const newValue = Math.min(100, Math.max(1, Math.round(percentage)));
            onChange(newValue);
          }}
        >
          <div 
            className={`absolute h-full rounded-full transition-all duration-200 ease-out ${
              color === 'bg-pink-500' ? 'bg-pink-500' :
              color === 'bg-blue-500' ? 'bg-blue-500' :
              'bg-orange-500'
            }`}
            style={{ width: `${value}%` }}
          />
          <div 
            className={`absolute top-1/2 w-6 h-6 bg-white border-2 rounded-full shadow-lg cursor-grab active:cursor-grabbing transform -translate-y-1/2 transition-all duration-200 ease-out hover:scale-110 ${
              color === 'bg-pink-500' ? 'border-pink-500' :
              color === 'bg-blue-500' ? 'border-blue-500' :
              'border-orange-500'
            }`}
            style={{ left: `calc(${value}% - 12px)` }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startValue = value;
              const rect = e.currentTarget.parentElement!.getBoundingClientRect();
              
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaPercentage = (deltaX / rect.width) * 100;
                const newValue = Math.min(100, Math.max(1, Math.round(startValue + deltaPercentage)));
                onChange(newValue);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold">
            {value === 0 ? 'Not rated' : `${value}/100`}
          </span>
        </div>
      </div>
    </div>
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
          Back to Mindmap
        </Button>
        <div>
          <h1 className="text-3xl font-bold">How do you feel?</h1>
          <p className="text-muted-foreground">
            Rate your feelings about today's work on a scale of 1-5
          </p>
        </div>
      </div>

      {/* Topics Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Today's Focus Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <span
                key={topic.id}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  topic.notes 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {topic.text}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rating Bars */}
      <Card className="mb-8">
        <CardContent className="pt-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <RatingSlider
              label="Satisfaction"
              value={ratings.satisfaction}
              onChange={(value) => handleRatingChange('satisfaction', value)}
              icon={Heart}
              color="bg-pink-500"
              description="How satisfied are you with today's work?"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <RatingSlider
              label="Progress"
              value={ratings.progress}
              onChange={(value) => handleRatingChange('progress', value)}
              icon={TrendingUp}
              color="bg-blue-500"
              description="How much progress did you make today?"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <RatingSlider
              label="Challenge"
              value={ratings.challenge}
              onChange={(value) => handleRatingChange('challenge', value)}
              icon={Zap}
              color="bg-orange-500"
              description="How challenging was today's work?"
            />
          </motion.div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleContinue}
          disabled={!isComplete}
          size="lg"
          className="px-8"
        >
          Continue to Reflection
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {!isComplete && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Please rate all three feelings to continue
        </p>
      )}
    </div>
  );
}