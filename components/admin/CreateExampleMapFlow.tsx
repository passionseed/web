"use client";

import { useState } from 'react';
import { University } from '@/types/education';
import { PersonaFormDialog, StudentPersona } from './PersonaFormDialog';
import { UniversityExampleJourneyCanvas } from './UniversityExampleJourneyCanvas';

interface CreateExampleMapFlowProps {
  university: University;
  user: any;
}

export function CreateExampleMapFlow({ university, user }: CreateExampleMapFlowProps) {
  const [showPersonaForm, setShowPersonaForm] = useState(true);
  const [persona, setPersona] = useState<StudentPersona | null>(null);

  const handlePersonaSubmit = (personaData: StudentPersona) => {
    setPersona(personaData);
    setShowPersonaForm(false);
  };

  const handlePersonaEdit = () => {
    setShowPersonaForm(true);
  };

  if (showPersonaForm) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              Create Example Journey Map
            </h1>
            <p className="text-slate-400 mb-2">
              for <span className="text-blue-400 font-semibold">{university.name}</span>
            </p>
            <p className="text-slate-500 text-sm">
              First, let's define the student persona to create targeted milestones.
            </p>
          </div>
        </div>

        <PersonaFormDialog
          open={showPersonaForm}
          onOpenChange={() => {}} // Prevent closing - required step
          onSubmit={handlePersonaSubmit}
          mode="create"
        />
      </div>
    );
  }

  return (
    <UniversityExampleJourneyCanvas 
      university={university}
      user={user}
      persona={persona}
      onEditPersona={handlePersonaEdit}
    />
  );
}