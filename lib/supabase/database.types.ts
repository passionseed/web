export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      branches: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          importance: number
          mastery: number
          name: string
          passion_tree_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: number
          mastery?: number
          name: string
          passion_tree_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          importance?: number
          mastery?: number
          name?: string
          passion_tree_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          member_count: number | null
          name: string
          short_description: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          member_count?: number | null
          name: string
          short_description?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          member_count?: number | null
          name?: string
          short_description?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      community_images: {
        Row: {
          community_id: string
          created_at: string
          id: string
          storage_path: string
          type: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          storage_path: string
          type: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          type?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_images_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_mentors: {
        Row: {
          bio: string | null
          community_id: string
          created_at: string
          expertise: string[] | null
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          community_id: string
          created_at?: string
          expertise?: string[] | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          community_id?: string
          created_at?: string
          expertise?: string[] | null
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_mentors_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          community_id: string
          content: string | null
          created_at: string
          id: string
          is_edited: boolean
          is_pinned: boolean
          metadata: Json | null
          parent_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          community_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          metadata?: Json | null
          parent_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          community_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          metadata?: Json | null
          parent_id?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_projects: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_featured: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_featured?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_projects_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          passion_tree_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          passion_tree_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          passion_tree_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      emotions: {
        Row: {
          challenge: number
          created_at: string | null
          curiosity: number
          fulfillment: number
          id: string
          joy: number
          passion_tree_id: string
          updated_at: string | null
        }
        Insert: {
          challenge?: number
          created_at?: string | null
          curiosity?: number
          fulfillment?: number
          id?: string
          joy?: number
          passion_tree_id: string
          updated_at?: string | null
        }
        Update: {
          challenge?: number
          created_at?: string | null
          curiosity?: number
          fulfillment?: number
          id?: string
          joy?: number
          passion_tree_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emotions_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement: {
        Row: {
          created_at: string | null
          current_level: number
          date: string | null
          id: string
          passion_tree_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number
          date?: string | null
          id?: string
          passion_tree_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: number
          date?: string | null
          id?: string
          passion_tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      impacts: {
        Row: {
          connection_id: string
          created_at: string | null
          id: string
          impact_type: string
          interest_name: string
          strength: number
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          id?: string
          impact_type: string
          interest_name: string
          strength?: number
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          id?: string
          impact_type?: string
          interest_name?: string
          strength?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impacts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      influences: {
        Row: {
          connection_id: string
          created_at: string | null
          id: string
          influence_type: string
          interest_name: string
          strength: number
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          id?: string
          influence_type: string
          interest_name: string
          strength?: number
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          id?: string
          influence_type?: string
          interest_name?: string
          strength?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influences_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          application: string | null
          created_at: string | null
          date_discovered: string | null
          description: string
          id: string
          passion_tree_id: string
          updated_at: string | null
        }
        Insert: {
          application?: string | null
          created_at?: string | null
          date_discovered?: string | null
          description: string
          id?: string
          passion_tree_id: string
          updated_at?: string | null
        }
        Update: {
          application?: string | null
          created_at?: string | null
          date_discovered?: string | null
          description?: string
          id?: string
          passion_tree_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string | null
          emotion: string
          id: string
          level: number
          name: string
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emotion: string
          id?: string
          level: number
          name: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emotion?: string
          id?: string
          level?: number
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string | null
          current_focus: string | null
          id: string
          passion_tree_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_focus?: string | null
          id?: string
          passion_tree_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_focus?: string | null
          id?: string
          passion_tree_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved: boolean
          created_at: string | null
          date: string | null
          description: string
          id: string
          learning_path_id: string
          updated_at: string | null
        }
        Insert: {
          achieved?: boolean
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          learning_path_id: string
          updated_at?: string | null
        }
        Update: {
          achieved?: boolean
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          learning_path_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_insights: {
        Row: {
          created_at: string | null
          id: string
          month: number
          most_used_tag_id: string | null
          progress_notes: string | null
          top_emotion: Database["public"]["Enums"]["emotion"] | null
          top_emotion_count: number | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          most_used_tag_id?: string | null
          progress_notes?: string | null
          top_emotion?: Database["public"]["Enums"]["emotion"] | null
          top_emotion_count?: number | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          most_used_tag_id?: string | null
          progress_notes?: string | null
          top_emotion?: Database["public"]["Enums"]["emotion"] | null
          top_emotion_count?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_insights_most_used_tag_id_fkey"
            columns: ["most_used_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      passion_trees: {
        Row: {
          category: string
          created_at: string | null
          depth: number
          growth_stage: string
          id: string
          last_updated: string | null
          mastery: number
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          depth?: number
          growth_stage?: string
          id?: string
          last_updated?: string | null
          mastery?: number
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          depth?: number
          growth_stage?: string
          id?: string
          last_updated?: string | null
          mastery?: number
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passion_trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          post_id: string
          storage_path: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          post_id: string
          storage_path: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          post_id?: string
          storage_path?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      potential_offshoots: {
        Row: {
          created_at: string | null
          germination_stage: number
          id: string
          insight_id: string
          interest_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          germination_stage?: number
          id?: string
          insight_id: string
          interest_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          germination_stage?: number
          id?: string
          insight_id?: string
          interest_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "potential_offshoots_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "insights"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          discord_id: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          discord_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          discord_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "community_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_outcomes: {
        Row: {
          created_at: string | null
          description: string
          id: string
          project_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          project_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          project_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_outcomes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          completion_date: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          passion_tree_id: string
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          passion_tree_id: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          passion_tree_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_metrics: {
        Row: {
          challenge: number
          created_at: string | null
          engagement: number
          id: string
          reflection_id: string
          satisfaction: number
          updated_at: string | null
        }
        Insert: {
          challenge: number
          created_at?: string | null
          engagement: number
          id?: string
          reflection_id: string
          satisfaction: number
          updated_at?: string | null
        }
        Update: {
          challenge?: number
          created_at?: string | null
          engagement?: number
          id?: string
          reflection_id?: string
          satisfaction?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reflection_metrics_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "reflections"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_tags: {
        Row: {
          reflection_id: string
          tag_id: string
        }
        Insert: {
          reflection_id: string
          tag_id: string
        }
        Update: {
          reflection_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_tags_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "reflections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflection_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          content: string
          created_at: string | null
          emotion: Database["public"]["Enums"]["emotion"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          emotion: Database["public"]["Enums"]["emotion"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          emotion?: Database["public"]["Enums"]["emotion"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      related_interests: {
        Row: {
          connection_strength: number
          connection_type: string
          created_at: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          connection_strength?: number
          connection_type: string
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          connection_strength?: number
          connection_type?: string
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "related_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string | null
          id: string
          impact: number | null
          learning_path_id: string
          name: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impact?: number | null
          learning_path_id: string
          name: string
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impact?: number | null
          learning_path_id?: string
          name?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      roots: {
        Row: {
          created_at: string | null
          financial_investment: number
          id: string
          passion_tree_id: string
          root_strength: number
          time_invested: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          financial_investment?: number
          id?: string
          passion_tree_id: string
          root_strength?: number
          time_invested?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          financial_investment?: number
          id?: string
          passion_tree_id?: string
          root_strength?: number
          time_invested?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roots_passion_tree_id_fkey"
            columns: ["passion_tree_id"]
            isOneToOne: false
            referencedRelation: "passion_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          level: number
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          level?: number
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          level?: number
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      synergies: {
        Row: {
          connection_id: string
          created_at: string | null
          exploration_level: number
          id: string
          interest_name: string
          potential_outcome: string
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          exploration_level?: number
          id?: string
          interest_name: string
          potential_outcome: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          exploration_level?: number
          id?: string
          interest_name?: string
          potential_outcome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "synergies_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tools_acquired: {
        Row: {
          created_at: string | null
          id: string
          name: string
          root_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          root_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          root_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_acquired_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "roots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_communities: {
        Row: {
          community_id: string | null
          id: string
          joined_at: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_communities_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_communities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          average_rating: number | null
          communities_helped: number | null
          created_at: string | null
          helpful_responses: number | null
          id: string
          kudos_received: number | null
          updated_at: string | null
          user_id: string | null
          workshops_contributed: number | null
        }
        Insert: {
          average_rating?: number | null
          communities_helped?: number | null
          created_at?: string | null
          helpful_responses?: number | null
          id?: string
          kudos_received?: number | null
          updated_at?: string | null
          user_id?: string | null
          workshops_contributed?: number | null
        }
        Update: {
          average_rating?: number | null
          communities_helped?: number | null
          created_at?: string | null
          helpful_responses?: number | null
          id?: string
          kudos_received?: number | null
          updated_at?: string | null
          user_id?: string | null
          workshops_contributed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workshops: {
        Row: {
          id: string
          joined_at: string | null
          user_id: string | null
          workshop_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          user_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_workshops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workshops_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          user_id: string | null
          workshop_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_comments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_suggestions: {
        Row: {
          created_at: string | null
          id: string
          suggestion: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          suggestion: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          suggestion?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workshop_votes: {
        Row: {
          created_at: string | null
          id: string
          path_name: string | null
          user_id: string | null
          vote_type: string | null
          workshop_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          path_name?: string | null
          user_id?: string | null
          vote_type?: string | null
          workshop_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          path_name?: string | null
          user_id?: string | null
          vote_type?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_votes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          instructor: string | null
          paths: Json | null
          paths_in_development: Json | null
          slug: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          voting_enabled: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          instructor?: string | null
          paths?: Json | null
          paths_in_development?: Json | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          voting_enabled?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          instructor?: string | null
          paths?: Json | null
          paths_in_development?: Json | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          voting_enabled?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_community_admin: {
        Args: { community_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { community_id_param: string; user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      community_role: "member" | "moderator" | "admin" | "owner"
      emotion:
        | "joy"
        | "curiosity"
        | "fulfillment"
        | "challenge"
        | "sadness"
        | "anxiety"
        | "anticipation"
        | "trust"
        | "happy"
        | "excited"
        | "grateful"
        | "content"
        | "hopeful"
        | "sad"
        | "anxious"
        | "frustrated"
        | "overwhelmed"
        | "tired"
        | "neutral"
        | "calm"
        | "proud"
        | "motivated"
        | "creative"
        | "confused"
        | "stuck"
        | "bored"
        | "stressed"
        | "energized"
      post_type: "text" | "image" | "link" | "poll"
      project_status: "planning" | "in_progress" | "completed" | "on_hold"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      community_role: ["member", "moderator", "admin", "owner"],
      emotion: [
        "joy",
        "curiosity",
        "fulfillment",
        "challenge",
        "sadness",
        "anxiety",
        "anticipation",
        "trust",
        "happy",
        "excited",
        "grateful",
        "content",
        "hopeful",
        "sad",
        "anxious",
        "frustrated",
        "overwhelmed",
        "tired",
        "neutral",
        "calm",
        "proud",
        "motivated",
        "creative",
        "confused",
        "stuck",
        "bored",
        "stressed",
        "energized",
      ],
      post_type: ["text", "image", "link", "poll"],
      project_status: ["planning", "in_progress", "completed", "on_hold"],
    },
  },
} as const

