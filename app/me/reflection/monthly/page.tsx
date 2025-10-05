'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, Loader2, Award, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMonthlyInsights, getReflectionCalendar } from '@/lib/supabase/reflection';
import { MonthlyInsight, CalendarDay } from '@/types/reflection';

// Emotion color mapping
const EMOTION_COLORS: Record<string, string> = {
  happy: 'bg-green-100 hover:bg-green-200',
  excited: 'bg-yellow-100 hover:bg-yellow-200',
  grateful: 'bg-purple-100 hover:bg-purple-200',
  content: 'bg-blue-100 hover:bg-blue-200',
  hopeful: 'bg-pink-100 hover:bg-pink-200',
  sad: 'bg-blue-200 hover:bg-blue-300',
  anxious: 'bg-yellow-200 hover:bg-yellow-300',
  frustrated: 'bg-red-100 hover:bg-red-200',
  overwhelmed: 'bg-purple-200 hover:bg-purple-300',
  tired: 'bg-gray-200 hover:bg-gray-300',
  neutral: 'bg-gray-100 hover:bg-gray-200',
  calm: 'bg-blue-50 hover:bg-blue-100',
  proud: 'bg-orange-100 hover:bg-orange-200',
  motivated: 'bg-green-200 hover:bg-green-300',
  creative: 'bg-indigo-100 hover:bg-indigo-200',
  confused: 'bg-yellow-50 hover:bg-yellow-100',
  stuck: 'bg-red-50 hover:bg-red-100',
  bored: 'bg-gray-100 hover:bg-gray-200',
  stressed: 'bg-red-200 hover:bg-red-300',
  energized: 'bg-green-300 hover:bg-green-400',
};

const EMOTION_EMOJIS: Record<string, string> = {
  happy: '😊',
  excited: '🎉',
  grateful: '🙏',
  content: '😌',
  hopeful: '🌟',
  sad: '😢',
  anxious: '😟',
  frustrated: '😤',
  overwhelmed: '😵‍💫',
  tired: '😴',
  neutral: '😐',
  calm: '😌',
  proud: '🦁',
  motivated: '💪',
  creative: '🎨',
  confused: '😕',
  stuck: '🧗',
  bored: '🥱',
  stressed: '😫',
  energized: '⚡',
};

export default function MonthlyReviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [insights, setInsights] = useState<MonthlyInsight | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Get the first and last day of the current month view
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch calendar data and insights
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [calendarData, insightsData] = await Promise.all([
          getReflectionCalendar(monthStart, monthEnd),
          getMonthlyInsights(selectedDate.getFullYear(), selectedDate.getMonth() + 1)
        ]);
        
        setCalendarDays(calendarData);
        setInsights(insightsData);
      } catch (error) {
        console.error('Error fetching monthly data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Navigate to previous/next month
  const changeMonth = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setSelectedDate(newDate);
  };

  // Get the emotion for a specific day
  const getDayEmotion = (date: Date): string | null => {
    const day = calendarDays.find(day => 
      isSameDay(new Date(day.date), date)
    );
    return day?.emotion || null;
  };

  // Get the color class for an emotion
  const getEmotionColor = (emotion: string): string => {
    return EMOTION_COLORS[emotion] || 'bg-gray-100';
  };

  // Get the emoji for an emotion
  const getEmotionEmoji = (emotion: string): string => {
    return EMOTION_EMOJIS[emotion] || '•';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(-1)}
          >
            Previous
          </Button>
          
          <h1 className="text-xl font-semibold">
            {format(selectedDate, 'MMMM yyyy')}
          </h1>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(1)}
          >
            Next
          </Button>
        </div>
        
        <div className="w-24"></div> {/* Spacer for alignment */}
      </div>

      <Tabs 
        defaultValue="overview" 
        className="space-y-6"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Reflection Streak */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {insights?.currentStreak || 0} days
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {insights?.lastReflectionDate 
                    ? `Last reflection on ${format(new Date(insights.lastReflectionDate), 'MMM d, yyyy')}`
                    : 'No reflections yet'}
                </p>
              </CardContent>
            </Card>

            {/* Best Day */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Best Day</CardTitle>
              </CardHeader>
              <CardContent>
                {insights?.bestDay ? (
                  <>
                    <div className="text-2xl font-bold">
                      {format(new Date(insights.bestDay.date), 'MMMM d')}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">
                        {insights.bestDay.averageScore.toFixed(1)}/10
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {insights.bestDay.emotion ? getEmotionEmoji(insights.bestDay.emotion) : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Most Common Emotion */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mood</CardTitle>
              </CardHeader>
              <CardContent>
                {insights?.mostCommonEmotion ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {getEmotionEmoji(insights.mostCommonEmotion.emotion)}
                    </span>
                    <div>
                      <div className="text-lg font-semibold capitalize">
                        {insights.mostCommonEmotion.emotion}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {insights.mostCommonEmotion.count} days
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Topics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Topics
              </CardTitle>
              <CardDescription>
                Your most reflected-on topics this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights?.topTopics && insights.topTopics.length > 0 ? (
                <div className="space-y-4">
                  {insights.topTopics.map((topic, index) => (
                    <div key={topic.tagId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{topic.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {topic.count} reflection{topic.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        Avg. {(topic.averageScore || 0).toFixed(1)}/10
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No topic data available. Add some reflections with tags to see your top topics.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Progress Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Progress Over Time
              </CardTitle>
              <CardDescription>
                Your satisfaction and engagement scores this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Chart visualization would be implemented here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Reflection Calendar</CardTitle>
              <CardDescription>
                Your daily reflections for {format(selectedDate, 'MMMM yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-sm font-medium py-2">
                    {day}
                  </div>
                ))}
                
                {/* Empty cells for days before the first of the month */}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                  <div key={`empty-${index}`} className="h-10" />
                ))}
                
                {/* Days of the month */}
                {daysInMonth.map((date) => {
                  const emotion = getDayEmotion(date);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <div 
                      key={date.toString()}
                      className={`relative h-10 flex items-center justify-center rounded-md transition-colors ${
                        emotion 
                          ? `${getEmotionColor(emotion)} cursor-pointer hover:opacity-80` 
                          : 'hover:bg-muted/50'
                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => {
                        // Navigate to the reflection for this day if it exists
                        const dayReflection = calendarDays.find(d => 
                          isSameDay(new Date(d.date), date)
                        );
                        if (dayReflection?.reflectionId) {
                          router.push(`/me/reflection/${dayReflection.reflectionId}`);
                        }
                      }}
                    >
                      <span className={`text-sm ${emotion ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {date.getDate()}
                      </span>
                      {emotion && (
                        <span className="absolute bottom-1 text-xs">
                          {getEmotionEmoji(emotion)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {Object.entries(EMOTION_EMOJIS).slice(0, 8).map(([emotion, emoji]) => (
                  <div key={emotion} className="flex items-center gap-1 text-xs">
                    <span className="inline-block w-4 text-center">{emoji}</span>
                    <span className="capitalize">{emotion}</span>
                  </div>
                ))}
                <button 
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setActiveTab('insights')}
                >
                  View all <ArrowRight className="inline h-3 w-3" />
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Insights</CardTitle>
              <CardDescription>
                Key patterns and insights from your reflections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {insights?.insights && insights.insights.length > 0 ? (
                <div className="space-y-6">
                  {insights.insights.map((insight, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.suggestion && (
                        <div className="mt-3 p-3 bg-primary/5 rounded border border-primary/10 text-sm">
                          <p className="font-medium text-primary">Suggestion:</p>
                          <p className="mt-1">{insight.suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">No insights yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Continue adding reflections to see personalized insights and patterns.
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => router.push('/me/reflection/mindmap')}
                  >
                    Add Reflection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Utility function for class names
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
