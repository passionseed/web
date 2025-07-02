import { Tag } from "./reflection";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  goal?: string;
  description?: string;
  image_url?: string;
  link?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface ProjectFormData {
  name: string;
  goal?: string;
  description?: string;
  image_url?: string;
  link?: string;
  tagIds: string[];
}
