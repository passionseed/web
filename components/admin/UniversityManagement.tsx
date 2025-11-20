"use client";

import { useState } from 'react';
import { University } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Globe, 
  Upload,
  Download,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  createUniversity, 
  updateUniversity, 
  deleteUniversity 
} from '@/lib/supabase/education';

interface UniversityManagementProps {
  initialUniversities: University[];
  user: any;
}

export function UniversityManagement({ 
  initialUniversities,
  user 
}: UniversityManagementProps) {
  const [universities, setUniversities] = useState<University[]>(initialUniversities);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    website_url: '',
    logo_url: '',
    description: '',
    admission_requirements: ''
  });

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    uni.short_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      short_name: '',
      website_url: '',
      logo_url: '',
      description: '',
      admission_requirements: ''
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (university: University) => {
    setEditingUniversity(university);
    setFormData({
      name: university.name,
      short_name: university.short_name || '',
      website_url: university.website_url || '',
      logo_url: university.logo_url || '',
      description: university.description || '',
      admission_requirements: university.admission_requirements || ''
    });
    setShowEditDialog(true);
  };

  const handleDelete = (university: University) => {
    setEditingUniversity(university);
    setShowDeleteDialog(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('University name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const newUniversity = await createUniversity(formData);
      setUniversities(prev => [...prev, newUniversity]);
      setShowCreateDialog(false);
      resetForm();
      toast.success(`University "${newUniversity.name}" created successfully`);
    } catch (error) {
      console.error('Error creating university:', error);
      toast.error('Failed to create university');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingUniversity || !formData.name.trim()) {
      toast.error('University name is required');
      return;
    }

    if (!editingUniversity.id) {
      toast.error('University ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUniversity = await updateUniversity(editingUniversity.id, formData);
      setUniversities(prev => 
        prev.map(uni => uni.id === editingUniversity.id ? updatedUniversity : uni)
      );
      setShowEditDialog(false);
      setEditingUniversity(null);
      resetForm();
      toast.success(`University "${updatedUniversity.name}" updated successfully`);
    } catch (error) {
      console.error('Error updating university:', error);
      toast.error('Failed to update university');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!editingUniversity) return;

    setIsSubmitting(true);
    try {
      await deleteUniversity(editingUniversity.id);
      setUniversities(prev => 
        prev.filter(uni => uni.id !== editingUniversity.id)
      );
      setShowDeleteDialog(false);
      setEditingUniversity(null);
      toast.success(`University "${editingUniversity.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting university:', error);
      toast.error('Failed to delete university');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToCsv = () => {
    const csvHeaders = [
      'name',
      'short_name',
      'website_url',
      'description',
      'admission_requirements'
    ];
    
    const csvRows = universities.map(uni => [
      `"${uni.name}"`,
      `"${uni.short_name || ''}"`,
      `"${uni.website_url || ''}"`,
      `"${uni.description || ''}"`,
      `"${uni.admission_requirements || ''}"`
    ]);

    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `universities_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Universities exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search universities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportToCsv}
                className="border-slate-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add University
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
            <span>Total: {universities.length} universities</span>
            <span>•</span>
            <span>Filtered: {filteredUniversities.length} results</span>
          </div>
        </CardContent>
      </Card>

      {/* Universities Grid */}
      <div className="grid gap-4">
        {filteredUniversities.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400 text-lg mb-4">
                {searchQuery ? 'No universities match your search' : 'No universities found'}
              </p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add First University
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredUniversities.map((university) => (
            <Card key={university.id} className="bg-slate-900 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Logo placeholder */}
                      <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
                        {university.logo_url ? (
                          <img 
                            src={university.logo_url} 
                            alt={`${university.name} logo`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-slate-400">
                            {university.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">
                            {university.name}
                          </h3>
                          {university.short_name && (
                            <Badge variant="outline" className="text-slate-400">
                              {university.short_name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          {university.website_url && (
                            <div className="flex items-center gap-1">
                              <Globe className="w-4 h-4" />
                              <a 
                                href={university.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-400 transition-colors"
                              >
                                Website
                              </a>
                            </div>
                          )}
                        </div>

                        {university.description && (
                          <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                            {university.description}
                          </p>
                        )}

                        {university.admission_requirements && (
                          <div className="bg-slate-800 rounded p-2 mb-3">
                            <p className="text-xs text-slate-400 mb-1">Admission Requirements:</p>
                            <p className="text-sm text-slate-300 line-clamp-2">
                              {university.admission_requirements}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(university)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(university)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New University</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">University Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Harvard University"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_name">Short Name</Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                  placeholder="e.g., Harvard"
                />
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://www.harvard.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the university..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admission_requirements">Admission Requirements</Label>
              <Textarea
                id="admission_requirements"
                value={formData.admission_requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, admission_requirements: e.target.value }))}
                placeholder="High GPA, Strong SAT scores, Leadership experience..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create University'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit University</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">University Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Harvard University"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_short_name">Short Name</Label>
                <Input
                  id="edit_short_name"
                  value={formData.short_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_name: e.target.value }))}
                  placeholder="e.g., Harvard"
                />
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="edit_website_url">Website URL</Label>
              <Input
                id="edit_website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://www.harvard.edu"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the university..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_admission_requirements">Admission Requirements</Label>
              <Textarea
                id="edit_admission_requirements"
                value={formData.admission_requirements}
                onChange={(e) => setFormData(prev => ({ ...prev, admission_requirements: e.target.value }))}
                placeholder="High GPA, Strong SAT scores, Leadership experience..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete University</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-300">
            Are you sure you want to delete <strong>{editingUniversity?.name}</strong>? 
            This action cannot be undone.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Deleting...' : 'Delete University'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}