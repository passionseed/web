"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Plus,
  X,
  Users,
  GraduationCap,
  Trophy,
  Heart
} from 'lucide-react';

interface PersonaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (persona: StudentPersona) => void;
  initialPersona?: StudentPersona | null;
  mode?: 'create' | 'edit';
}

export interface StudentPersona {
  name?: string;
  academicYear: string;
  interests: string[];
  gpaRange: string;
  extracurriculars: string[];
  background: string;
  careerGoals?: string;
  challenges?: string;
  strengths?: string;
}

const ACADEMIC_YEARS = [
  'High School Freshman',
  'High School Sophomore', 
  'High School Junior',
  'High School Senior',
  'College Freshman',
  'College Sophomore',
  'College Junior',
  'College Senior'
];

const GPA_RANGES = [
  '4.0+ (Perfect)',
  '3.7-3.9 (High)',
  '3.3-3.6 (Above Average)', 
  '3.0-3.2 (Average)',
  '2.5-2.9 (Below Average)',
  '2.0-2.4 (Low)'
];

const COMMON_INTERESTS = [
  'Computer Science',
  'Artificial Intelligence',
  'Game Development',
  'Web Development',
  'Data Science',
  'Cybersecurity',
  'Robotics',
  'Mathematics',
  'Physics',
  'Engineering',
  'Business',
  'Medicine',
  'Law',
  'Art & Design',
  'Music',
  'Sports',
  'Writing',
  'Research'
];

const COMMON_EXTRACURRICULARS = [
  'Debate Club',
  'Student Government',
  'Science Olympiad',
  'Math Club',
  'Coding Club',
  'Robotics Team',
  'Drama Club',
  'Band/Orchestra',
  'Sports Teams',
  'Volunteer Work',
  'Part-time Job',
  'Research Projects',
  'Academic Competitions',
  'Model UN',
  'Key Club',
  'NHS/Honor Society'
];

export function PersonaFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialPersona,
  mode = 'create'
}: PersonaFormDialogProps) {
  const [formData, setFormData] = useState<StudentPersona>(() => ({
    name: initialPersona?.name || '',
    academicYear: initialPersona?.academicYear || '',
    interests: initialPersona?.interests || [],
    gpaRange: initialPersona?.gpaRange || '',
    extracurriculars: initialPersona?.extracurriculars || [],
    background: initialPersona?.background || '',
    careerGoals: initialPersona?.careerGoals || '',
    challenges: initialPersona?.challenges || '',
    strengths: initialPersona?.strengths || ''
  }));

  const [newInterest, setNewInterest] = useState('');
  const [newExtracurricular, setNewExtracurricular] = useState('');

  const handleAddInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
    setNewInterest('');
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleAddExtracurricular = (activity: string) => {
    if (activity && !formData.extracurriculars.includes(activity)) {
      setFormData(prev => ({
        ...prev,
        extracurriculars: [...prev.extracurriculars, activity]
      }));
    }
    setNewExtracurricular('');
  };

  const handleRemoveExtracurricular = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars.filter(a => a !== activity)
    }));
  };

  const handleSubmit = () => {
    if (!formData.academicYear || !formData.gpaRange || formData.interests.length === 0) {
      return; // Basic validation
    }

    onSubmit(formData);
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      academicYear: '',
      interests: [],
      gpaRange: '',
      extracurriculars: [],
      background: '',
      careerGoals: '',
      challenges: '',
      strengths: ''
    });
    setNewInterest('');
    setNewExtracurricular('');
  };

  const handleClose = () => {
    onOpenChange(false);
    if (mode === 'create') {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            {mode === 'create' ? 'Define Student Persona' : 'Edit Student Persona'}
          </DialogTitle>
          <DialogDescription>
            Create a detailed profile of the target student for this example journey map.
            This helps generate more accurate and personalized milestones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Basic Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="persona-name">Persona Name (Optional)</Label>
                <Input
                  id="persona-name"
                  placeholder="e.g., Alex the Aspiring Game Developer"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="academic-year">Academic Year *</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpa-range">GPA Range *</Label>
                <Select
                  value={formData.gpaRange}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gpaRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GPA range" />
                  </SelectTrigger>
                  <SelectContent>
                    {GPA_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Academic Interests *</h3>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_INTERESTS.filter(interest => !formData.interests.includes(interest)).map((interest) => (
                  <Button
                    key={interest}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddInterest(interest)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {interest}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterest(newInterest);
                    }
                  }}
                />
                <Button
                  onClick={() => handleAddInterest(newInterest)}
                  disabled={!newInterest.trim()}
                  size="sm"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-sm">
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Extracurriculars */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Extracurricular Activities</h3>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_EXTRACURRICULARS.filter(activity => !formData.extracurriculars.includes(activity)).map((activity) => (
                  <Button
                    key={activity}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddExtracurricular(activity)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {activity}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom activity..."
                  value={newExtracurricular}
                  onChange={(e) => setNewExtracurricular(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExtracurricular(newExtracurricular);
                    }
                  }}
                />
                <Button
                  onClick={() => handleAddExtracurricular(newExtracurricular)}
                  disabled={!newExtracurricular.trim()}
                  size="sm"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.extracurriculars.map((activity) => (
                  <Badge key={activity} variant="secondary" className="text-sm">
                    {activity}
                    <button
                      onClick={() => handleRemoveExtracurricular(activity)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Details</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background">Background & Context</Label>
                <Textarea
                  id="background"
                  placeholder="Describe the student's socioeconomic background, family situation, location, etc."
                  value={formData.background}
                  onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="career-goals">Career Goals</Label>
                <Textarea
                  id="career-goals"
                  placeholder="What does this student hope to achieve in their career?"
                  value={formData.careerGoals}
                  onChange={(e) => setFormData(prev => ({ ...prev, careerGoals: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="challenges">Challenges & Obstacles</Label>
                  <Textarea
                    id="challenges"
                    placeholder="What challenges might this student face?"
                    value={formData.challenges}
                    onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strengths">Strengths & Assets</Label>
                  <Textarea
                    id="strengths"
                    placeholder="What are this student's strengths?"
                    value={formData.strengths}
                    onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.academicYear || !formData.gpaRange || formData.interests.length === 0}
          >
            {mode === 'create' ? 'Create Persona & Continue' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}