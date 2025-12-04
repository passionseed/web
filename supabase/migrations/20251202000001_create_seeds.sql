-- Create seeds table
CREATE TABLE IF NOT EXISTS seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES learning_maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seed_rooms table
CREATE TABLE IF NOT EXISTS seed_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  join_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  min_students INTEGER DEFAULT 1,
  max_students INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seed_room_members table
CREATE TABLE IF NOT EXISTS seed_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES seed_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_room_members ENABLE ROW LEVEL SECURITY;

-- Policies for seeds
CREATE POLICY "Seeds are viewable by everyone" 
  ON seeds FOR SELECT 
  USING (true);

CREATE POLICY "Seeds are insertable by admins" 
  ON seeds FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Seeds are updateable by admins" 
  ON seeds FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Seeds are deletable by admins" 
  ON seeds FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policies for seed_rooms
CREATE POLICY "Seed rooms are viewable by authenticated users" 
  ON seed_rooms FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Seed rooms are insertable by authenticated users" 
  ON seed_rooms FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Seed rooms are updateable by host or admin" 
  ON seed_rooms FOR UPDATE 
  USING (
    auth.uid() = host_id OR 
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policies for seed_room_members
CREATE POLICY "Seed room members are viewable by authenticated users" 
  ON seed_room_members FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Seed room members are insertable by authenticated users" 
  ON seed_room_members FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_seeds_map_id ON seeds(map_id);
CREATE INDEX idx_seed_rooms_join_code ON seed_rooms(join_code);
CREATE INDEX idx_seed_rooms_status ON seed_rooms(status);
CREATE INDEX idx_seed_room_members_room_id ON seed_room_members(room_id);
CREATE INDEX idx_seed_room_members_user_id ON seed_room_members(user_id);
