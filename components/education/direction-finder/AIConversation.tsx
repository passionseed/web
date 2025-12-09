import { useState, useEffect, useRef } from 'react';
import { AssessmentAnswers, DirectionFinderResult, Message } from '@/types/direction-finder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { conductDirectionConversation, generateDirectionProfile } from '@/lib/ai/education-advisor';
import { toast } from 'sonner';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

interface AIConversationProps {
  answers: AssessmentAnswers;
  onComplete: (result: DirectionFinderResult) => void;
  history?: Message[];
  onHistoryChange?: (messages: Message[]) => void;
  onBack: () => void;
  model?: string;
  className?: string;
}

export function AIConversation({ answers, onComplete, history, onHistoryChange, onBack, model, className }: AIConversationProps) {
  const [messages, setMessages] = useState<Message[]>(history || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isTyping, currentOptions]);

  // Sync to parent
  useEffect(() => {
    onHistoryChange?.(messages);
  }, [messages, onHistoryChange]);

  // Initial greeting if no history
  useEffect(() => {
    if (!history && !hasStartedRef.current) {
      hasStartedRef.current = true;
      handleAIResponse([
        { role: 'user', content: 'Start conversation' } // Hidden trigger message
      ], true);
    }
  }, []);

  const simulateTyping = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleAIResponse = async (currentHistory: { role: 'user' | 'assistant', content: string }[], isInitial = false) => {
    setIsTyping(true);
    setCurrentOptions([]); // Hide options while thinking

    try {
      // If initial, we send the "Start conversation" trigger to the AI so it knows to begin.
      // The server action expects history.
      
      const response = await conductDirectionConversation(
        currentHistory, 
        answers,
        model
      );

      // Simulate "human" typing and message splitting
      for (const msgContent of response.messages) {
        await simulateTyping(300 + Math.random() * 300); // Shorter, snappier delay
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString(), role: 'assistant', content: msgContent }
        ]);
      }

      setCurrentOptions(response.options);

    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to connect to AI advisor');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setCurrentOptions([]); // Clear options after selection

    // Convert to format for API
    const apiHistory = newHistory.map(m => ({
      role: m.role,
      content: m.content
    }));

    await handleAIResponse(apiHistory);
  };

  const handleFinish = async () => {
    setIsGeneratingProfile(true);
    try {
      const apiHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const result = await generateDirectionProfile(apiHistory, answers, model);
      onComplete(result);
    } catch (error) {
      console.error('Error generating profile:', error);
      toast.error('Failed to generate profile');
      setIsGeneratingProfile(false);
    }
  };

  return (
    <Card className={cn("h-[600px] flex flex-col bg-slate-900 border-slate-700", className)}>
      <CardHeader className="border-b border-slate-800 py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 hover:text-white mr-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
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
          <div className="space-y-4 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <Avatar className="w-8 h-8 border border-slate-700 shrink-0">
                    <AvatarFallback className="bg-slate-800 text-purple-400">AI</AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}>
                  <div 
                    className="prose prose-invert prose-sm max-w-none [&>p]:m-0 [&>p]:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} 
                  />
                </div>

                {msg.role === 'user' && (
                  <Avatar className="w-8 h-8 border border-slate-700 shrink-0">
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

            {/* Options Buttons */}
            {!isTyping && currentOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 pl-11">
                {currentOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(option)}
                    className="px-4 py-2 bg-slate-800 hover:bg-blue-600/20 border border-slate-600 hover:border-blue-500 text-slate-200 hover:text-blue-200 text-sm rounded-full transition-all text-left animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              className="bg-slate-800 border-slate-700 focus-visible:ring-blue-500 min-h-[44px] max-h-[120px] resize-none py-3"
              disabled={isGeneratingProfile || isTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping || isGeneratingProfile} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>

      {/* Dev Debug View */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-50">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => console.log({ answers, messages })}
            className="text-xs bg-black/50 border-white/20 text-white backdrop-blur-md"
            title="Log context to console"
          >
            Log Context
          </Button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-96 p-4 bg-black/90 text-xs font-mono text-green-400 rounded-lg border border-green-900 shadow-2xl max-h-[500px] overflow-auto whitespace-pre-wrap">
             {/* We can make this a proper dialog or just log to console as implemented above for simplicity, 
                 but user asked to "show" it. Let's make a collapsible details element. */}
          </div>
        </div>
      )}
      
      {process.env.NODE_ENV === 'development' && (
        <details className="absolute top-14 right-2 z-40 max-w-sm w-full bg-black/80 backdrop-blur text-xs text-green-300 p-2 rounded border border-green-800 shadow-xl overflow-hidden">
            <summary className="cursor-pointer font-bold hover:text-green-100 p-1">DEV: AI Context</summary>
            <div className="max-h-60 overflow-auto p-2 space-y-4">
                <div>
                    <strong className="text-white block mb-1">Assessment Answers:</strong>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(answers, null, 2)}</pre>
                </div>
                <div>
                    <strong className="text-white block mb-1">View Result Logic:</strong>
                    <div className="text-gray-400">
                        Messages: {messages.length} / 5 (Required)<br/>
                        Typing: {isTyping ? 'Yes' : 'No'}<br/>
                        Generating: {isGeneratingProfile ? 'Yes' : 'No'}<br/>
                        <strong>Result: {messages.length > 4 ? 'VISIBLE' : 'HIDDEN'}</strong>
                    </div>
                </div>
                <div>
                    <strong className="text-white block mb-1">Chat History:</strong>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(messages, null, 2)}</pre>
                </div>
            </div>
        </details>
      )}
    </Card>
  );
}
