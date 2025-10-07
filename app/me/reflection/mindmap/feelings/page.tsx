"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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

interface TopicRating {
  satisfaction: number;
  progress: number;
  challenge: number;
  why?: string;
}

export default function MindmapFeelingsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsWithNotes, setTopicsWithNotes] = useState<Topic[]>([]);
  const [topicRatings, setTopicRatings] = useState<{[topicId: string]: TopicRating}>({});

  useEffect(() => {
    // Get topics from session storage
    const storedTopics = sessionStorage.getItem('mindmap-topics');
    if (storedTopics) {
      const allTopics = JSON.parse(storedTopics);
      setTopics(allTopics);
      
      // Filter topics that have notes
      const topicsWithNotes = allTopics.filter((topic: Topic) => topic.notes && topic.notes.trim() !== '');
      setTopicsWithNotes(topicsWithNotes);
      
      // Initialize ratings for topics with notes
      const initialRatings: {[topicId: string]: TopicRating} = {};
      topicsWithNotes.forEach((topic: Topic) => {
        initialRatings[topic.id] = {
          satisfaction: 0,
          progress: 0,
          challenge: 0,
          why: ''
        };
      });
      setTopicRatings(initialRatings);
    } else {
      // If no topics, redirect back to mindmap
      router.push('/me/reflection/mindmap');
    }
  }, [router]);

  const handleTopicRatingChange = (topicId: string, type: keyof TopicRating, value: number | string) => {
    setTopicRatings(prev => ({
      ...prev,
      [topicId]: {
        ...prev[topicId],
        [type]: value
      }
    }));
  };

  const handleContinue = () => {
    // Save topic ratings to session storage
    sessionStorage.setItem('mindmap-topic-ratings', JSON.stringify(topicRatings));
    router.push('/me/reflection/mindmap/summary');
  };

  const isComplete = topicsWithNotes.every(topic => {
    const rating = topicRatings[topic.id];
    return rating && rating.satisfaction > 0 && rating.progress > 0 && rating.challenge > 0 && rating.why && rating.why.trim().length > 0;
  });

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-base">{label}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Low</span>
          <span>High</span>
        </div>
        <div 
          className="relative w-full h-2.5 bg-gray-200 rounded-full cursor-pointer"
          onMouseDown={(e) => {
            // Only handle if we clicked on the bar, not the dot
            if (e.target === e.currentTarget) {
              e.preventDefault();
              
              const slider = e.currentTarget;
              const rect = slider.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              const newValue = Math.min(100, Math.max(1, Math.round(percentage)));
              
              console.log('Bar mousedown - setting initial value:', {
                clickX: e.clientX,
                rectLeft: rect.left,
                rectWidth: rect.width,
                x: x,
                percentage: percentage,
                newValue: newValue,
                previousValue: value
              });
              
              // Set the initial value
              onChange(newValue);
              
              // Start drag from this position
              const handleMouseMove = (e: MouseEvent) => {
                const currentX = e.clientX - rect.left;
                const currentPercentage = (currentX / rect.width) * 100;
                const currentValue = Math.min(100, Math.max(1, Math.round(currentPercentage)));
                
                console.log('Bar drag move:', {
                  clientX: e.clientX,
                  rectLeft: rect.left,
                  rectWidth: rect.width,
                  currentX: currentX,
                  currentPercentage: currentPercentage,
                  currentValue: currentValue
                });
                
                onChange(currentValue);
              };
              
              const handleMouseUp = () => {
                console.log('Bar drag ended');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }
          }}
        >
          <div 
            className={`absolute h-full rounded-full transition-all duration-200 ease-out cursor-pointer ${
              color === 'bg-pink-500' ? 'bg-pink-500' :
              color === 'bg-blue-500' ? 'bg-blue-500' :
              'bg-orange-500'
            }`}
            style={{ width: `${value}%` }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const slider = e.currentTarget.parentElement!;
              const rect = slider.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = (x / rect.width) * 100;
              const newValue = Math.min(100, Math.max(1, Math.round(percentage)));
              
              console.log('Color bar mousedown - setting initial value:', {
                clickX: e.clientX,
                rectLeft: rect.left,
                rectWidth: rect.width,
                x: x,
                percentage: percentage,
                newValue: newValue,
                previousValue: value
              });
              
              // Set the initial value
              onChange(newValue);
              
              // Start drag from this position
              const handleMouseMove = (e: MouseEvent) => {
                const currentX = e.clientX - rect.left;
                const currentPercentage = (currentX / rect.width) * 100;
                const currentValue = Math.min(100, Math.max(1, Math.round(currentPercentage)));
                
                console.log('Color bar drag move:', {
                  clientX: e.clientX,
                  rectLeft: rect.left,
                  rectWidth: rect.width,
                  currentX: currentX,
                  currentPercentage: currentPercentage,
                  currentValue: currentValue
                });
                
                onChange(currentValue);
              };
              
              const handleMouseUp = () => {
                console.log('Color bar drag ended');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <div 
            className={`absolute top-1/2 w-5 h-5 bg-white border-2 rounded-full shadow-lg cursor-grab active:cursor-grabbing transform -translate-y-1/2 transition-all duration-200 ease-out hover:scale-110 ${
              color === 'bg-pink-500' ? 'border-pink-500' :
              color === 'bg-blue-500' ? 'border-blue-500' :
              'border-orange-500'
            }`}
            style={{ left: `calc(${value}% - 10px)` }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Prevent triggering the bar's onMouseDown
              
              const slider = e.currentTarget.parentElement!;
              const rect = slider.getBoundingClientRect();
              
              console.log('Dot drag started:', {
                rect,
                currentValue: value,
                dotLeft: `calc(${value}% - 12px)`
              });
              
              const handleMouseMove = (e: MouseEvent) => {
                const x = e.clientX - rect.left;
                const percentage = (x / rect.width) * 100;
                const newValue = Math.min(100, Math.max(1, Math.round(percentage)));
                
                console.log('Dot drag move:', {
                  clientX: e.clientX,
                  rectLeft: rect.left,
                  rectWidth: rect.width,
                  x: x,
                  percentage: percentage,
                  newValue: newValue,
                  previousValue: value
                });
                
                onChange(newValue);
              };
              
              const handleMouseUp = () => {
                console.log('Dot drag ended');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
        <div className="text-center">
          <span className="text-sm font-semibold">
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
            Rate your feelings about each topic you worked on today (scale 1-100)
          </p>
        </div>
      </div>

      {/* Individual Topic Ratings */}
      <div className="space-y-3 mb-4">
        {topicsWithNotes.map((topic, index) => (
          <Card key={topic.id}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
                  {topic.text}
                </span>
              </CardTitle>
              {topic.notes && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Updates:</strong> {topic.notes}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <RatingSlider
                  label="Satisfaction"
                  value={topicRatings[topic.id]?.satisfaction || 0}
                  onChange={(value) => handleTopicRatingChange(topic.id, 'satisfaction', value)}
                  icon={Heart}
                  color="bg-pink-500"
                  description="How satisfied are you with your work on this topic?"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <RatingSlider
                  label="Progress"
                  value={topicRatings[topic.id]?.progress || 0}
                  onChange={(value) => handleTopicRatingChange(topic.id, 'progress', value)}
                  icon={TrendingUp}
                  color="bg-blue-500"
                  description="How much progress did you make on this topic?"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <RatingSlider
                  label="Challenge"
                  value={topicRatings[topic.id]?.challenge || 0}
                  onChange={(value) => handleTopicRatingChange(topic.id, 'challenge', value)}
                  icon={Zap}
                  color="bg-orange-500"
                  description="How challenging was this topic for you?"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="pt-2"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">Why do you feel this way?</h3>
                  <p className="text-sm text-muted-foreground">
                    Explain your ratings for this topic
                  </p>
                  <Textarea
                    placeholder="Share your thoughts about your experience with this topic..."
                    value={topicRatings[topic.id]?.why || ''}
                    onChange={(e) => handleTopicRatingChange(topic.id, 'why', e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </motion.div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center">
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

      {!isComplete && topicsWithNotes.length > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          Please rate all three feelings and explain why for each topic to continue
        </p>
      )}
      
      {topicsWithNotes.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-muted-foreground mb-4">
            No topics with updates found. Please go back and add updates to your topics first.
          </p>
          <Button 
            variant="outline"
            onClick={() => router.push('/me/reflection/mindmap')}
          >
            Back to Mindmap
          </Button>
        </div>
      )}
    </div>
  );
}