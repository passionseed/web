"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createNodeAssessment, deleteNodeAssessment, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from '@/lib/supabase/maps';
import { NodeAssessment, AssessmentType, QuizQuestion } from '@/types/map';
import { Loader2, Trash2, PlusCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssessmentEditorProps {
  nodeId: string;
  assessment: NodeAssessment | null;
  onAssessmentChange: (newAssessment: NodeAssessment | null, action: 'add' | 'delete') => void;
}

const QuizEditor = ({ assessment, onQuestionChange }: { assessment: NodeAssessment, onQuestionChange: (q: QuizQuestion, action: 'add' | 'update' | 'delete') => void }) => {
    const [newQuestion, setNewQuestion] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    const handleAddQuestion = async () => {
        if (!newQuestion.trim()) return;
        try {
            const question = await createQuizQuestion({ assessment_id: assessment.id, question_text: newQuestion });
            onQuestionChange(question, 'add');
            setNewQuestion('');
            setIsAdding(false);
            toast({ title: 'Question added' });
        } catch (error) {
            toast({ title: 'Error adding question', variant: 'destructive' });
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        try {
            await deleteQuizQuestion(id);
            onQuestionChange({ id } as QuizQuestion, 'delete');
            toast({ title: 'Question deleted' });
        } catch (error) {
            toast({ title: 'Error deleting question', variant: 'destructive' });
        }
    }

    return (
        <div className="space-y-3 mt-4">
            {assessment.quiz_questions?.map(q => (
                <div key={q.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <p className="text-sm">{q.question_text}</p>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
            ))}
            {isAdding ? (
                <div className="flex gap-2">
                    <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="New question..." />
                    <Button onClick={handleAddQuestion}>Add</Button>
                    <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                </div>
            ) : (
                <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}><PlusCircle className="h-4 w-4 mr-2" /> Add Question</Button>
            )}
        </div>
    )
}

export function AssessmentEditor({ nodeId, assessment, onAssessmentChange }: AssessmentEditorProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddAssessment = (type: AssessmentType) => {
    startTransition(async () => {
      try {
        const newAssessment = await createNodeAssessment({ node_id: nodeId, assessment_type: type });
        onAssessmentChange(newAssessment, 'add');
        toast({ title: 'Assessment added' });
      } catch (error) {
        toast({ title: 'Error adding assessment', variant: 'destructive' });
      }
    });
  };

  const handleDeleteAssessment = () => {
    if (!assessment) return;
    startTransition(async () => {
        try {
            await deleteNodeAssessment(assessment.id);
            onAssessmentChange(null, 'delete');
            toast({ title: 'Assessment removed' });
        } catch (error) {
            toast({ title: 'Error removing assessment', variant: 'destructive' });
        }
    });
  };

  const handleQuestionChange = (changedQuestion: QuizQuestion, action: 'add' | 'update' | 'delete') => {
      if (!assessment) return;
      let newQuestions: QuizQuestion[];
      if (action === 'add') {
          newQuestions = [...(assessment.quiz_questions || []), changedQuestion];
      } else if (action === 'update') {
          newQuestions = (assessment.quiz_questions || []).map(q => q.id === changedQuestion.id ? changedQuestion : q);
      } else {
          newQuestions = (assessment.quiz_questions || []).filter(q => q.id !== changedQuestion.id);
      }
      onAssessmentChange({ ...assessment, quiz_questions: newQuestions }, 'add');
  }

  if (isPending) {
      return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!assessment) {
    return (
      <div className="p-4 space-y-2 text-center">
        <p className="text-muted-foreground">No assessment for this node.</p>
        <Select onValueChange={(v: AssessmentType) => handleAddAssessment(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Add Assessment..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="text_answer">Text Answer</SelectItem>
            <SelectItem value="image_upload">Image Upload</SelectItem>
            <SelectItem value="file_upload">File Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="p-2">
        <Card>
            <CardHeader>
                <CardTitle className="capitalize flex justify-between items-center">
                    {assessment.assessment_type.replace('_', ' ')}
                    <Button variant="destructive" size="sm" onClick={handleDeleteAssessment} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {assessment.assessment_type === 'quiz' && <QuizEditor assessment={assessment} onQuestionChange={handleQuestionChange} />}
                {assessment.assessment_type !== 'quiz' && <p className="text-muted-foreground text-sm">Configuration for this assessment type is not yet available.</p>}
            </CardContent>
        </Card>
    </div>
  );
}
