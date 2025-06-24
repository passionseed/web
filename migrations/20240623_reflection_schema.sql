-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for emotions
CREATE TYPE emotion_type AS ENUM (
  'happy', 'excited', 'grateful', 'content', 'hopeful',
  'sad', 'anxious', 'frustrated', 'overwhelmed', 'tired',
  'neutral', 'calm', 'proud', 'motivated', 'creative',
  'confused', 'stuck', 'bored', 'stressed', 'energized'
);

-- Main reflections table
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  emotion emotion_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags for reflections (many-to-many relationship)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Junction table for reflections and tags
CREATE TABLE reflection_tags (
  reflection_id UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (reflection_id, tag_id)
);

-- Slider metrics for reflections
CREATE TABLE reflection_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reflection_id UUID NOT NULL REFERENCES reflections(id) ON DELETE CASCADE,
  satisfaction SMALLINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 10),
  engagement SMALLINT NOT NULL CHECK (engagement BETWEEN 1 AND 10),
  challenge SMALLINT NOT NULL CHECK (challenge BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly insights
CREATE TABLE monthly_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  top_emotion emotion_type,
  top_emotion_count INTEGER DEFAULT 0,
  most_used_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,
  progress_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- Indexes for better query performance
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_created_at ON reflections(created_at);
CREATE INDEX idx_reflection_tags_reflection_id ON reflection_tags(reflection_id);
CREATE INDEX idx_reflection_metrics_reflection_id ON reflection_metrics(reflection_id);

-- Row Level Security (RLS) policies
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- Policies for reflections
CREATE POLICY "Users can view their own reflections" 
  ON reflections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
  ON reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables...

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_reflections_updated_at
BEFORE UPDATE ON reflections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflection_metrics_updated_at
BEFORE UPDATE ON reflection_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
