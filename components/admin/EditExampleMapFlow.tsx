"use client";

import { useState, useEffect } from 'react';
import { University } from '@/types/education';
import { PersonaFormDialog, StudentPersona } from './PersonaFormDialog';
import { UniversityExampleJourneyCanvas } from './UniversityExampleJourneyCanvas';

interface EditExampleMapFlowProps {
  university: University;
  exampleMap: any;
  user: any;
}

export function EditExampleMapFlow({ university, exampleMap, user }: EditExampleMapFlowProps) {
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [persona, setPersona] = useState<StudentPersona | null>(null);

  // Extract persona from example map data
  useEffect(() => {
    if (exampleMap?.example_data?.persona) {
      setPersona(exampleMap.example_data.persona);
    }
  }, [exampleMap]);

  const handlePersonaEdit = () => {
    setShowPersonaForm(true);
  };

  const handlePersonaUpdate = (updatedPersona: StudentPersona) => {
    setPersona(updatedPersona);
    setShowPersonaForm(false);
  };

  return (
    <>
      <UniversityExampleJourneyCanvas 
        university={university}
        user={user}
        persona={persona}
        onEditPersona={handlePersonaEdit}
        existingMapId={exampleMap.id}
        initialMapData={{
          title: exampleMap.title,
          description: exampleMap.description || '',
          target_audience: exampleMap.target_audience || ''
        }}
        initialExampleData={exampleMap.example_data}
      />

      {/* Persona Edit Dialog */}
      <PersonaFormDialog
        open={showPersonaForm}
        onOpenChange={setShowPersonaForm}
        onSubmit={handlePersonaUpdate}
        initialPersona={persona}
        mode="edit"
      />
    </>
  );
}