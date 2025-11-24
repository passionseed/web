"use client";

import { useState, useEffect } from 'react';
import { University } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Map,
  Users,
  Calendar,
  Target,
  Download,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { getUniversityExampleMaps } from '@/lib/supabase/education';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { PersonaFormDialog, StudentPersona } from './PersonaFormDialog';

interface UniversityExampleMapsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  university: University | null;
}

interface UniversityExampleMap {
  id: string;
  title: string;
  description: string | null;
  target_audience: string | null;
  example_data: any;
  created_at: string;
  updated_at: string;
  persona?: {
    academicYear?: string;
    interests?: string[];
    gpaRange?: string;
    extracurriculars?: string[];
    background?: string;
  } | null;
}

export function UniversityExampleMapsDialog({
  open,
  onOpenChange,
  university
}: UniversityExampleMapsDialogProps) {
  const router = useRouter();
  const [exampleMaps, setExampleMaps] = useState<UniversityExampleMap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);
  const [editingPersona, setEditingPersona] = useState<StudentPersona | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);

  // Load existing example maps when dialog opens
  useEffect(() => {
    if (open && university) {
      loadExampleMaps();
    }
  }, [open, university]);

  const loadExampleMaps = async () => {
    if (!university) return;
    
    setIsLoading(true);
    try {
      const maps = await getUniversityExampleMaps(university.id);
      setExampleMaps(maps);
    } catch (error) {
      console.error('Error loading example maps:', error);
      toast.error('Failed to load example maps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    if (!university) return;
    // Close this dialog and navigate to create with persona form
    onOpenChange(false);
    router.push(`/admin/archive/universities/${university.id}/example-maps/create`);
  };

  const handleEditMap = (mapId: string) => {
    if (!university) return;
    // Navigate to edit existing map
    onOpenChange(false);
    router.push(`/admin/archive/universities/${university.id}/example-maps/${mapId}`);
  };

  const handleEditPersona = (mapId: string) => {
    const map = exampleMaps.find(m => m.id === mapId);
    if (map) {
      setEditingPersona(map.persona || null);
      setEditingMapId(mapId);
      setShowPersonaDialog(true);
    }
  };

  const handlePersonaUpdate = async (updatedPersona: StudentPersona) => {
    if (!editingMapId) return;
    
    // TODO: Update the persona in the database
    // For now, just update local state
    setExampleMaps(prev => prev.map(map => 
      map.id === editingMapId 
        ? { ...map, persona: updatedPersona }
        : map
    ));
    
    setShowPersonaDialog(false);
    setEditingPersona(null);
    setEditingMapId(null);
    toast.success('Persona updated successfully!');
  };

  const handleDeleteMap = async (mapId: string) => {
    const mapToDelete = exampleMaps.find(m => m.id === mapId);
    if (!mapToDelete) return;
    
    if (!confirm(`Are you sure you want to delete "${mapToDelete.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete from database
      const supabase = createClient();
      const { error } = await supabase
        .from('university_example_maps')
        .delete()
        .eq('id', mapId);
      
      if (error) {
        console.error('Error deleting example map:', error);
        toast.error('Failed to delete example map');
        return;
      }
      
      // Update local state
      setExampleMaps(prev => prev.filter(map => map.id !== mapId));
      toast.success('Example map deleted successfully');
    } catch (error) {
      console.error('Error deleting example map:', error);
      toast.error('Failed to delete example map');
    }
  };

  const handleExportMap = (mapId: string) => {
    const mapToExport = exampleMaps.find(m => m.id === mapId);
    if (!mapToExport) return;
    
    // Create export data
    const exportData = {
      title: mapToExport.title,
      description: mapToExport.description,
      target_audience: mapToExport.target_audience,
      example_data: mapToExport.example_data,
      exported_at: new Date().toISOString(),
      exported_from: university?.name || 'Unknown University'
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mapToExport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_roadmap.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Roadmap exported successfully!');
  };

  const handleImportMap = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data structure
        if (!importData.title || !importData.example_data) {
          toast.error('Invalid roadmap file format');
          return;
        }
        
        // Create new map from imported data
        const supabase = createClient();
        const { data, error } = await supabase
          .from('university_example_maps')
          .insert({
            university_id: university!.id,
            title: `${importData.title} (Imported)`,
            description: importData.description || 'Imported roadmap',
            target_audience: importData.target_audience || '',
            example_data: importData.example_data
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error importing roadmap:', error);
          toast.error('Failed to import roadmap');
          return;
        }
        
        // Add to local state
        setExampleMaps(prev => [data, ...prev]);
        toast.success(`Roadmap "${importData.title}" imported successfully!`);
      } catch (error) {
        console.error('Error parsing import file:', error);
        toast.error('Invalid JSON file');
      }
    };
    input.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!university) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <div>
              <div className="text-xl font-bold">{university.name}</div>
              <div className="text-sm text-muted-foreground">
                Example Journey Maps
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
          {/* Create New and Import Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed border-2 hover:border-blue-400 transition-colors">
              <CardContent className="p-6">
                <Button 
                  onClick={handleCreateNew}
                  variant="ghost" 
                  className="w-full h-24 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-8 h-8" />
                  <span className="font-medium">Create New Example Journey Map</span>
                  <span className="text-xs">Define student persona and build journey</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-dashed border-2 hover:border-green-400 transition-colors">
              <CardContent className="p-6">
                <Button 
                  onClick={handleImportMap}
                  variant="ghost" 
                  className="w-full h-24 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Upload className="w-8 h-8" />
                  <span className="font-medium">Import Roadmap</span>
                  <span className="text-xs">Upload existing roadmap from JSON file</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Existing Maps */}
          {!isLoading && exampleMaps.map((map) => (
            <Card key={map.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {map.title}
                    </CardTitle>
                    {map.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {map.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditPersona(map.id)}
                      className="text-slate-500 hover:text-blue-500"
                      title="Edit Student Persona"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditMap(map.id)}
                      className="text-slate-500 hover:text-green-500"
                      title="Edit Journey Map"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportMap(map.id)}
                      className="text-slate-500 hover:text-blue-500"
                      title="Export Roadmap"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMap(map.id)}
                      className="text-slate-500 hover:text-red-500"
                      title="Delete Map"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Target Audience */}
                  {map.target_audience && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {map.target_audience}
                      </Badge>
                    </div>
                  )}

                  {/* Persona Summary */}
                  {map.persona && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Student Persona
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {map.persona.academicYear && (
                          <Badge variant="secondary" className="text-xs">
                            {map.persona.academicYear}
                          </Badge>
                        )}
                        {map.persona.gpaRange && (
                          <Badge variant="secondary" className="text-xs">
                            GPA: {map.persona.gpaRange}
                          </Badge>
                        )}
                        {map.persona.interests?.slice(0, 2).map((interest, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {map.persona.interests && map.persona.interests.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{map.persona.interests.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>Created {formatDate(map.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Map className="w-3 h-3" />
                      <span>
                        {map.example_data?.milestones?.length || 0} milestones
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {!isLoading && exampleMaps.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Map className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Example Maps Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first example journey map for {university.name} students.
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Map
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
      
      {/* Persona Edit Dialog */}
      <PersonaFormDialog
        open={showPersonaDialog}
        onOpenChange={setShowPersonaDialog}
        onSubmit={handlePersonaUpdate}
        initialPersona={editingPersona}
        mode="edit"
      />
    </Dialog>
  );
}