import { useState, useEffect, useRef } from 'react';
import { AssessmentAnswers, DirectionFinderResult } from '@/types/direction-finder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { conductDirectionConversation, generateDirectionProfile } from '@/lib/ai/education-advisor';
import { toast } from 'sonner';

interface AIConversationProps {
  answers: AssessmentAnswers;
  onComplete: (result: DirectionFinderResult) => void;
  history?: Message[];
  onHistoryChange?: (messages: Message[]) => void;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIConversation({ answers, onComplete, history, onHistoryChange }: AIConversationProps) {
  const [messages, setMessages] = useState<Message[]>(history || [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I've looked at your assessment. You have some really interesting strengths! I'd love to ask a few quick questions to understand what kind of impact you want to make. Ready?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Sync to parent
  useEffect(() => {
    onHistoryChange?.(messages);
  }, [messages, onHistoryChange]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsTyping(true);

    try {
      // Convert internal message format to AI SDK format
      const aiHistory = newHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await conductDirectionConversation(aiHistory, answers);
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Error in conversation:', error);
      toast.error('Failed to get response from AI');
    } finally {
      setIsTyping(false);
    }
  };

  const handleFinish = async () => {
    setIsGeneratingProfile(true);
    try {
      const aiHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const result = await generateDirectionProfile(aiHistory, answers);
      onComplete(result);
    } catch (error) {
      console.error('Error generating profile:', error);
      toast.error('Failed to generate profile');
      setIsGeneratingProfile(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-slate-900 border-slate-700">
      <CardHeader className="border-b border-slate-800 py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-2 rounded-full">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Education Advisor</CardTitle>
            <p className="text-xs text-slate-400">Helping you find your direction</p>
          </div>
        </div>
        {messages.length > 4 && (
          <Button 
            onClick={handleFinish} 
            disabled={isGeneratingProfile || isTyping}
            className="bg-green-600 hover:bg-green-700 text-xs h-8"
          >
            {isGeneratingProfile ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Generating Profile...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" /> View Results
              </>
            )}
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="w-8 h-8 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-purple-400">AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <Avatar className="w-8 h-8 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-blue-400">Me</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 border border-slate-700">
                  <AvatarFallback className="bg-slate-800 text-purple-400">AI</AvatarFallback>
                </Avatar>
                <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="bg-slate-800 border-slate-700 focus-visible:ring-blue-500"
              disabled={isGeneratingProfile}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping || isGeneratingProfile} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
