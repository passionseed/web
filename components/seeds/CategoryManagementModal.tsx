"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Trash2, Upload, Loader2, Plus } from "lucide-react";
import { SeedCategory } from "@/types/seeds";
import { Card } from "@/components/ui/card";

interface CategoryManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCategoryCreated?: () => void;
}

export function CategoryManagementModal({ isOpen, onClose, onCategoryCreated }: CategoryManagementModalProps) {
    const [categories, setCategories] = useState<SeedCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editLogo, setEditLogo] = useState<File | null>(null);
    const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from("seed_categories")
            .select("*")
            .order("name", { ascending: true });

        if (data) {
            setCategories(data);
        }
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedLogo(file);
            const url = URL.createObjectURL(file);
            setLogoPreview(url);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            toast.error("Please enter a category name");
            return;
        }

        setLoading(true);
        try {
            // 1. Create category
            const { data: category, error: categoryError } = await supabase
                .from("seed_categories")
                .insert({ name: newCategoryName.trim() })
                .select()
                .single();

            if (categoryError) throw categoryError;

            // 2. Upload logo if selected
            if (selectedLogo && category) {
                const formData = new FormData();
                formData.append("file", selectedLogo);
                formData.append("categoryId", category.id);

                const uploadResponse = await fetch("/api/categories/upload-logo", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    console.error("Failed to upload logo");
                    toast.warning("Category created, but logo upload failed.");
                }
            }

            toast.success("Category created successfully!");
            setNewCategoryName("");
            setSelectedLogo(null);
            setLogoPreview(null);
            fetchCategories();
            onCategoryCreated?.();
        } catch (error: any) {
            console.error("Error creating category:", error);
            toast.error(error.message || "Failed to create category");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        setCategoryToDelete({ id: categoryId, name: categoryName });
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;

        try {
            const { error } = await supabase
                .from("seed_categories")
                .delete()
                .eq("id", categoryToDelete.id);

            if (error) throw error;

            toast.success("Category deleted");
            fetchCategories();
            onCategoryCreated?.();
        } catch (error: any) {
            console.error("Error deleting category:", error);
            toast.error(error.message || "Failed to delete category");
        } finally {
            setDeleteConfirmOpen(false);
            setCategoryToDelete(null);
        }
    };

    const handleUpdateCategory = async (categoryId: string) => {
        if (!editName.trim()) {
            toast.error("Category name cannot be empty");
            return;
        }

        setLoading(true);
        try {
            // 1. Update category name
            const { error: updateError } = await supabase
                .from("seed_categories")
                .update({ name: editName.trim() })
                .eq("id", categoryId);

            if (updateError) throw updateError;

            // 2. Upload new logo if selected
            if (editLogo) {
                const formData = new FormData();
                formData.append("file", editLogo);
                formData.append("categoryId", categoryId);

                const uploadResponse = await fetch("/api/categories/upload-logo", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    console.error("Failed to upload logo");
                    toast.warning("Category updated, but logo upload failed.");
                }
            }

            toast.success("Category updated successfully!");
            setEditingCategory(null);
            setEditName("");
            setEditLogo(null);
            setEditLogoPreview(null);
            fetchCategories();
            onCategoryCreated?.();
        } catch (error: any) {
            console.error("Error updating category:", error);
            toast.error(error.message || "Failed to update category");
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (category: SeedCategory) => {
        setEditingCategory(category.id);
        setEditName(category.name);
        setEditLogoPreview(category.logo_url);
    };

    const cancelEditing = () => {
        setEditingCategory(null);
        setEditName("");
        setEditLogo(null);
        setEditLogoPreview(null);
    };

    const handleEditLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditLogo(file);
            const url = URL.createObjectURL(file);
            setEditLogoPreview(url);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-neutral-900 text-white border-neutral-800 max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Manage Categories</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Create New Category */}
                    <Card className="bg-neutral-800 border-neutral-700 p-4">
                        <h3 className="text-lg font-semibold mb-4">Create New Category</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="categoryName">Category Name</Label>
                                <Input
                                    id="categoryName"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g., Workshop, Course"
                                    className="bg-neutral-900 border-neutral-700"
                                />
                            </div>

                            <div>
                                <Label htmlFor="categoryLogo">Logo (PNG, optional)</Label>
                                <Input
                                    id="categoryLogo"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handleLogoSelect}
                                    className="bg-neutral-900 border-neutral-700 file:text-white file:bg-neutral-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:hover:bg-neutral-600 cursor-pointer"
                                />
                                {logoPreview && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <img src={logoPreview} alt="Logo preview" className="w-8 h-8 object-contain bg-white rounded p-1" />
                                        <span className="text-sm text-neutral-400">Preview</span>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleCreateCategory}
                                disabled={loading || !newCategoryName.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Category
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Existing Categories */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Existing Categories</h3>
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <Card key={category.id} className="bg-neutral-800 border-neutral-700 p-3">
                                    {editingCategory === category.id ? (
                                        // Edit mode
                                        <div className="space-y-3">
                                            <div>
                                                <Label>Category Name</Label>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="bg-neutral-900 border-neutral-700"
                                                />
                                            </div>
                                            <div>
                                                <Label>Logo</Label>
                                                <Input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    onChange={handleEditLogoSelect}
                                                    className="bg-neutral-900 border-neutral-700 file:text-white file:bg-neutral-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:hover:bg-neutral-600 cursor-pointer"
                                                />
                                                {editLogoPreview && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <img src={editLogoPreview} alt="Logo preview" className="w-8 h-8 object-contain bg-white rounded p-1" />
                                                        <span className="text-sm text-neutral-400">Preview</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleUpdateCategory(category.id)}
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                    size="sm"
                                                >
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                                </Button>
                                                <Button
                                                    onClick={cancelEditing}
                                                    variant="outline"
                                                    className="flex-1 border-neutral-700"
                                                    size="sm"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {category.logo_url ? (
                                                    <img
                                                        src={category.logo_url}
                                                        alt={category.name}
                                                        className="w-8 h-8 object-contain bg-white rounded p-1"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center text-[10px] text-neutral-400">
                                                        No logo
                                                    </div>
                                                )}
                                                <span className="font-medium">{category.name}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => startEditing(category)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2 border-neutral-700"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteCategory(category.id, category.name)}
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            ))}

                            {categories.length === 0 && (
                                <div className="text-center py-8 text-neutral-400">
                                    <p>No categories yet. Create one above!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="bg-neutral-900 text-white border-neutral-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            Are you sure you want to delete "{categoryToDelete?.name}"? Seeds in this category will become uncategorized. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
