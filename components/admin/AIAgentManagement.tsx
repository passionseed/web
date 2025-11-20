"use client";

import { useState, useEffect } from 'react';
import { AIAgent } from '@/types/education';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Bot,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

interface AIAgentManagementProps {
  user: any;
}

export function AIAgentManagement({ user }: AIAgentManagementProps) {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    use_case: '',
    category: 'general',
    system_prompt: '',
    user_prompt_template: '',
    model_config: '{}',
    is_active: true
  });

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.use_case.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading AI agents:', error);
      toast.error('Failed to load AI agents');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      use_case: '',
      category: 'general',
      system_prompt: '',
      user_prompt_template: '',
      model_config: '{}',
      is_active: true
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      use_case: agent.use_case,
      category: agent.category,
      system_prompt: agent.system_prompt,
      user_prompt_template: agent.user_prompt_template || '',
      model_config: JSON.stringify(agent.model_config, null, 2),
      is_active: agent.is_active
    });
    setShowEditDialog(true);
  };

  const handleDelete = (agent: AIAgent) => {
    setEditingAgent(agent);
    setShowDeleteDialog(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.name.trim() || !formData.use_case.trim() || !formData.system_prompt.trim()) {
      toast.error('Name, use case, and system prompt are required');
      return;
    }

    let modelConfig = {};
    if (formData.model_config.trim()) {
      try {
        modelConfig = JSON.parse(formData.model_config);
      } catch (error) {
        toast.error('Invalid JSON format in model config');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          name: formData.name,
          description: formData.description || null,
          use_case: formData.use_case,
          category: formData.category,
          system_prompt: formData.system_prompt,
          user_prompt_template: formData.user_prompt_template || null,
          model_config: modelConfig,
          is_active: formData.is_active
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setAgents(prev => [data, ...prev]);
      setShowCreateDialog(false);
      resetForm();
      toast.success(`AI Agent "${data.name}" created successfully`);
    } catch (error) {
      console.error('Error creating AI agent:', error);
      toast.error('Failed to create AI agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingAgent || !formData.name.trim() || !formData.use_case.trim() || !formData.system_prompt.trim()) {
      toast.error('Name, use case, and system prompt are required');
      return;
    }

    let modelConfig = {};
    if (formData.model_config.trim()) {
      try {
        modelConfig = JSON.parse(formData.model_config);
      } catch (error) {
        toast.error('Invalid JSON format in model config');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_agents')
        .update({
          name: formData.name,
          description: formData.description || null,
          use_case: formData.use_case,
          category: formData.category,
          system_prompt: formData.system_prompt,
          user_prompt_template: formData.user_prompt_template || null,
          model_config: modelConfig,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAgent.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setAgents(prev => 
        prev.map(agent => agent.id === editingAgent.id ? data : agent)
      );
      setShowEditDialog(false);
      setEditingAgent(null);
      resetForm();
      toast.success(`AI Agent "${data.name}" updated successfully`);
    } catch (error) {
      console.error('Error updating AI agent:', error);
      toast.error('Failed to update AI agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!editingAgent) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', editingAgent.id);
      
      if (error) throw error;
      
      setAgents(prev => 
        prev.filter(agent => agent.id !== editingAgent.id)
      );
      setShowDeleteDialog(false);
      setEditingAgent(null);
      toast.success(`AI Agent "${editingAgent.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      toast.error('Failed to delete AI agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAgentStatus = async (agent: AIAgent) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ai_agents')
        .update({ 
          is_active: !agent.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id)
        .select()
        .single();
      
      if (error) throw error;
      
      setAgents(prev => 
        prev.map(a => a.id === agent.id ? data : a)
      );
      toast.success(`Agent ${data.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast.error('Failed to update agent status');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Loading AI agents...</p>
      </div>
    );
  }

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
                  placeholder="Search AI agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600"
                />
              </div>
            </div>
            
            <Button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add AI Agent
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-400">
            <span>Total: {agents.length} agents</span>
            <span>•</span>
            <span>Active: {agents.filter(a => a.is_active).length}</span>
            <span>•</span>
            <span>Filtered: {filteredAgents.length} results</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Agents Grid */}
      <div className="grid gap-4">
        {filteredAgents.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400 text-lg mb-4">
                {searchQuery ? 'No AI agents match your search' : 'No AI agents found'}
              </p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add First AI Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAgents.map((agent) => (
            <Card key={agent.id} className="bg-slate-900 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
                        <Bot className="w-6 h-6 text-blue-400" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">
                            {agent.name}
                          </h3>
                          <Badge 
                            variant={agent.is_active ? "default" : "secondary"}
                            className={agent.is_active ? "bg-green-600" : "bg-slate-600"}
                          >
                            {agent.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-slate-400">
                            {agent.category}
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium text-slate-300 mb-1">
                            Use Case: {agent.use_case}
                          </p>
                          {agent.description && (
                            <p className="text-slate-300 text-sm line-clamp-2">
                              {agent.description}
                            </p>
                          )}
                        </div>

                        <div className="bg-slate-800 rounded p-3 mb-3">
                          <p className="text-xs text-slate-400 mb-1">System Prompt:</p>
                          <p className="text-sm text-slate-300 line-clamp-3">
                            {agent.system_prompt}
                          </p>
                        </div>

                        {agent.last_used_at && (
                          <p className="text-xs text-slate-400">
                            Last used: {new Date(agent.last_used_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleAgentStatus(agent)}
                      className={`${
                        agent.is_active 
                          ? "text-slate-400 hover:text-yellow-400" 
                          : "text-slate-400 hover:text-green-400"
                      }`}
                      title={agent.is_active ? "Deactivate" : "Activate"}
                    >
                      {agent.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(agent)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(agent)}
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New AI Agent</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Educational Roadmap Generator"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="use_case">Use Case *</Label>
                <Input
                  id="use_case"
                  value={formData.use_case}
                  onChange={(e) => setFormData(prev => ({ ...prev, use_case: e.target.value }))}
                  placeholder="e.g., roadmap_generation"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., educational, journey_planning"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Active</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active" className="text-sm">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this AI agent does..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">System Prompt *</Label>
              <Textarea
                id="system_prompt"
                value={formData.system_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                placeholder="You are an expert..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_prompt_template">User Prompt Template</Label>
              <Textarea
                id="user_prompt_template"
                value={formData.user_prompt_template}
                onChange={(e) => setFormData(prev => ({ ...prev, user_prompt_template: e.target.value }))}
                placeholder="Template with placeholders like {variable_name}..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_config">Model Configuration (JSON)</Label>
              <Textarea
                id="model_config"
                value={formData.model_config}
                onChange={(e) => setFormData(prev => ({ ...prev, model_config: e.target.value }))}
                placeholder='{"temperature": 0.7, "top_p": 0.9, "max_tokens": 2000}'
                rows={3}
                className="font-mono text-sm"
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
              disabled={isSubmitting || !formData.name.trim() || !formData.use_case.trim() || !formData.system_prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Agent</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Educational Roadmap Generator"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_use_case">Use Case *</Label>
                <Input
                  id="edit_use_case"
                  value={formData.use_case}
                  onChange={(e) => setFormData(prev => ({ ...prev, use_case: e.target.value }))}
                  placeholder="e.g., roadmap_generation"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Category</Label>
                <Input
                  id="edit_category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., educational, journey_planning"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_is_active">Active</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="edit_is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="edit_is_active" className="text-sm">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this AI agent does..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_system_prompt">System Prompt *</Label>
              <Textarea
                id="edit_system_prompt"
                value={formData.system_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                placeholder="You are an expert..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_user_prompt_template">User Prompt Template</Label>
              <Textarea
                id="edit_user_prompt_template"
                value={formData.user_prompt_template}
                onChange={(e) => setFormData(prev => ({ ...prev, user_prompt_template: e.target.value }))}
                placeholder="Template with placeholders like {variable_name}..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_model_config">Model Configuration (JSON)</Label>
              <Textarea
                id="edit_model_config"
                value={formData.model_config}
                onChange={(e) => setFormData(prev => ({ ...prev, model_config: e.target.value }))}
                placeholder='{"temperature": 0.7, "top_p": 0.9, "max_tokens": 2000}'
                rows={3}
                className="font-mono text-sm"
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
              disabled={isSubmitting || !formData.name.trim() || !formData.use_case.trim() || !formData.system_prompt.trim()}
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
            <DialogTitle>Delete AI Agent</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-300">
            Are you sure you want to delete <strong>{editingAgent?.name}</strong>? 
            This action cannot be undone and may affect system functionality.
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
              {isSubmitting ? 'Deleting...' : 'Delete Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}