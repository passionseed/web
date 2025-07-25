"use client";

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { MapNode, NodeContent, QuizQuestion, StudentNodeProgress, AssessmentSubmission } from '@/types/map';
import { CheckCircle, FileText, Film, Image as ImageIcon, Pencil, Play, Clock, CheckSquare, Upload } from 'lucide-react';
import { getStudentProgress, startNodeProgress, submitNodeProgress, createAssessmentSubmission, getAssessmentSubmission } from '@/lib/supabase/maps';
import { createClient } from '@/lib/supabase/client';

interface NodeViewPanelProps {
  selectedNode: Node<MapNode> | null;
  onProgressUpdate?: () => void;
}

const renderContent = (content: NodeContent) => {
  switch (content.content_type) {
    case 'video':
      // Ensure URL is a valid embed URL
      const videoUrl = content.content_url?.includes('embed') 
        ? content.content_url 
        : content.content_url?.replace('watch?v=', 'embed/');
      return (
        <div className="aspect-video">
          <iframe
            className="w-full h-full rounded-lg"
            src={videoUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    case 'text_with_images':
      // Using prose to style the raw HTML content
      return <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content.content_body || "" }} />;
    case 'canva_slide':
        return (
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-center p-4">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Canva Presentation</h3>
                <p className="text-sm text-muted-foreground mb-4">This content is best viewed in Canva.</p>
                <a href={content.content_url || '#'} target="_blank" rel="noopener noreferrer">
                    <Button>View Canva Slide</Button>
                </a>
            </div>
        )
    default:
      return <p className="text-muted-foreground">Unsupported content type.</p>;
  }
};

const renderQuizQuestion = (question: QuizQuestion) => (
    <div key={question.id} className="text-sm">
        <p className="font-semibold">{question.question_text}</p>
        <ul className="list-disc pl-5 mt-1 text-muted-foreground">
            {question.options?.map(opt => (
                <li key={opt.option}>{opt.text} {opt.option === question.correct_option && <span className="text-green-500 font-bold ml-2">(Correct)</span>}</li>
            ))}
        </ul>
    </div>
);

export function NodeViewPanel({ selectedNode, onProgressUpdate }: NodeViewPanelProps) {
  const [progress, setProgress] = useState<StudentNodeProgress | null>(null);
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentAnswer, setAssessmentAnswer] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (selectedNode && currentUser) {
      loadProgress();
    }
  }, [selectedNode, currentUser]);

  const loadProgress = async () => {
    if (!selectedNode || !currentUser) return;
    
    try {
      const progressData = await getStudentProgress(currentUser.id, selectedNode.id);
      setProgress(progressData);
      
      if (progressData && selectedNode.data.node_assessments?.[0]) {
        const submissionData = await getAssessmentSubmission(
          progressData.id, 
          selectedNode.data.node_assessments[0].id
        );
        setSubmission(submissionData);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const handleStartNode = async () => {
    if (!selectedNode || !currentUser) return;
    
    setIsStarting(true);
    try {
      const newProgress = await startNodeProgress(currentUser.id, selectedNode.id);
      setProgress(newProgress);
      onProgressUpdate?.();
      toast({ title: "Node started! Time tracking has begun." });
    } catch (error) {
      toast({ title: "Error starting node", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selectedNode || !currentUser || !progress) return;
    
    const assessment = selectedNode.data.node_assessments?.[0];
    if (!assessment) return;

    setIsSubmitting(true);
    try {
      const submissionData: Partial<AssessmentSubmission> = {
        progress_id: progress.id,
        assessment_id: assessment.id,
      };

      if (assessment.assessment_type === 'text_answer') {
        submissionData.text_answer = assessmentAnswer;
      } else if (assessment.assessment_type === 'quiz') {
        submissionData.quiz_answers = quizAnswers;
      }

      const newSubmission = await createAssessmentSubmission(submissionData);
      setSubmission(newSubmission);
      
      await submitNodeProgress(progress.id);
      setProgress(prev => prev ? { ...prev, status: 'submitted' } : null);
      onProgressUpdate?.();
      
      toast({ title: "Assessment submitted successfully!" });
    } catch (error) {
      toast({ title: "Error submitting assessment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedNode) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a node on the map to see its content.</p>
        </div>
      </div>
    );
  }

  const { data: nodeData } = selectedNode;
  const assessment = nodeData.node_assessments?.[0];
  const hasStarted = progress?.status !== 'not_started' && progress?.status;
  const isCompleted = progress?.status === 'passed' || progress?.status === 'failed';
  const hasSubmitted = progress?.status === 'submitted' || isCompleted;

  return (
    <div className="p-1 h-full overflow-y-auto">
      <Card className="border-none shadow-none">
        <CardHeader className="px-2 pt-0">
          <CardTitle>{nodeData.title}</CardTitle>
          {nodeData.instructions && <CardDescription>{nodeData.instructions}</CardDescription>}
          <div className="flex items-center space-x-2 pt-2">
            <Badge variant="outline">Difficulty: {nodeData.difficulty}</Badge>
            {nodeData.sprite_url && <Badge variant="secondary">Boss Node</Badge>}
            {progress && (
              <Badge variant={
                progress.status === 'passed' ? 'default' : 
                progress.status === 'failed' ? 'destructive' :
                progress.status === 'submitted' ? 'secondary' :
                progress.status === 'in_progress' ? 'outline' : 'outline'
              }>
                {progress.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                {progress.status === 'submitted' && <CheckSquare className="h-3 w-3 mr-1" />}
                {progress.status === 'passed' && <CheckCircle className="h-3 w-3 mr-1" />}
                {progress.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          
          {/* Start Button */}
          {currentUser && !hasStarted && (
            <div className="pt-4">
              <Button onClick={handleStartNode} disabled={isStarting} className="w-full">
                {isStarting ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Start Node
              </Button>
            </div>
          )}
          
          {/* Progress Information */}
          {progress && hasStarted && (
            <div className="pt-2 text-sm text-muted-foreground">
              <p>Started: {new Date(progress.started_at!).toLocaleString()}</p>
              {progress.submitted_at && (
                <p>Submitted: {new Date(progress.submitted_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-2 space-y-6">
          {/* Show content only if node has been started */}
          {hasStarted ? (
            <>
              {nodeData.node_content?.length > 0 ? (
                nodeData.node_content.map(content => (
                  <div key={content.id}>
                    <Separator className="my-4" />
                    {renderContent(content)}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-4">No learning content for this node yet.</p>
              )}

              {assessment && (
                <div>
                  <Separator className="my-4" />
                  <h3 className="font-semibold text-lg mb-2">Assessment</h3>
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="capitalize font-medium">Type: {assessment.assessment_type.replace('_', ' ')}</p>
                        {assessment.assessment_type === 'quiz' && <Badge><CheckCircle className="h-3 w-3 mr-1"/> {assessment.quiz_questions?.length || 0} Questions</Badge>}
                        {assessment.assessment_type === 'text_answer' && <Badge><Pencil className="h-3 w-3 mr-1"/> Written</Badge>}
                        {assessment.assessment_type === 'file_upload' && <Badge><FileText className="h-3 w-3 mr-1"/> File Upload</Badge>}
                    </div>

                    {/* Show assessment interface only if not yet submitted */}
                    {!hasSubmitted && (
                      <>
                        {assessment.assessment_type === 'text_answer' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Your Answer:</label>
                            <Textarea 
                              value={assessmentAnswer}
                              onChange={(e) => setAssessmentAnswer(e.target.value)}
                              placeholder="Type your answer here..."
                              className="min-h-[100px]"
                            />
                          </div>
                        )}

                        {assessment.assessment_type === 'quiz' && assessment.quiz_questions?.length > 0 && (
                          <div className="space-y-4">
                            {assessment.quiz_questions.map(question => (
                              <div key={question.id} className="space-y-2">
                                <p className="font-medium">{question.question_text}</p>
                                <div className="space-y-1">
                                  {question.options?.map(option => (
                                    <label key={option.option} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        name={question.id}
                                        value={option.option}
                                        checked={quizAnswers[question.id] === option.option}
                                        onChange={(e) => setQuizAnswers(prev => ({
                                          ...prev,
                                          [question.id]: e.target.value
                                        }))}
                                        className="radio"
                                      />
                                      <span className="text-sm">{option.text}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {assessment.assessment_type === 'file_upload' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Upload File:</label>
                            <Input type="file" />
                          </div>
                        )}

                        <Button 
                          onClick={handleSubmitAssessment} 
                          disabled={isSubmitting}
                          className="w-full"
                        >
                          {isSubmitting ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          Submit Assessment
                        </Button>
                      </>
                    )}

                    {/* Show submission status */}
                    {submission && (
                      <div className="mt-4 p-3 bg-background rounded border">
                        <p className="text-sm font-medium text-green-600">Assessment Submitted</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                        {submission.text_answer && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">Your Answer:</p>
                            <p className="text-xs text-muted-foreground">{submission.text_answer}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Start Node" to begin learning and access the content.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
