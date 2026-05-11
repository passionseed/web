# PassionSeed External App Integration Guide

This document provides all the information needed to build a separate application that connects to the PassionSeed project's database and APIs.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Authentication](#authentication)
3. [Database Access](#database-access)
4. [API Endpoints](#api-endpoints)
5. [Key Data Models](#key-data-models)
6. [Security & CORS](#security--cors)
7. [Code Examples](#code-examples)

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL="https://xdaeujtrqy1imi6nqzt1.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key" # Same as anon key

# Server-side only (if needed)
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" # NEVER expose this to client

# Optional: Site Configuration
NEXT_PUBLIC_SITE_URL="https://your-app-domain.com"

# Optional: AI Features
OPENAI_API_KEY="your_openai_key"
GEMINI_API_KEY="your_gemini_key"
```

### Installation (for any framework)

**Supabase Client:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**For React/Next.js:**
```bash
npm install @supabase/ssr
```

---

## Authentication

### Supabase Auth Integration

PassionSeed uses Supabase Authentication with multiple providers:

**Supported Auth Methods:**
- Email/Password
- Discord OAuth
- Google OAuth
- Magic Link

### Client Setup (Browser)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Setup (Node.js/API Routes)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

### Get Current User

```typescript
const supabase = createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (user) {
  console.log("User ID:", user.id);
  console.log("Email:", user.email);
}
```

---

## Database Access

### Direct Database Connection

**Database URL:** `postgresql://postgres.xdaeujtrqy1imi6nqzt1:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

⚠️ **Important:** Use Row Level Security (RLS) policies - never bypass with service role key unless necessary.

### Key Database Tables

#### Core Tables

**`profiles`** - User profiles
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `full_name` (text)
- `avatar_url` (text)
- `role` (text: 'student', 'teacher', 'admin', 'mentor')
- `created_at` (timestamp)

**`learning_maps`** - Learning journey maps
- `id` (uuid, primary key)
- `title` (text)
- `description` (text)
- `creator_id` (uuid, references profiles)
- `cover_image_url` (text)
- `is_public` (boolean)
- `created_at` (timestamp)

**`map_nodes`** - Individual learning nodes
- `id` (uuid, primary key)
- `map_id` (uuid, references learning_maps)
- `title` (text)
- `content` (jsonb)
- `node_type` (text: 'text', 'video', 'quiz', 'assessment', etc.)
- `position_x` (numeric)
- `position_y` (numeric)

**`user_map_enrollments`** - User enrollment in maps
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `map_id` (uuid, references learning_maps)
- `enrolled_at` (timestamp)
- `progress` (jsonb)

**`student_node_progress`** - Progress tracking
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `node_id` (uuid, references map_nodes)
- `status` (text: 'not_started', 'in_progress', 'submitted', 'passed', 'failed')
- `submission` (jsonb)
- `updated_at` (timestamp)

#### Journey System Tables

**`north_stars`** - Long-term goals
- `id` (uuid, primary key)
- `user_id` (uuid)
- `title` (text)
- `description` (text)
- `icon` (text)

**`journey_projects`** - Projects/milestones
- `id` (uuid, primary key)
- `user_id` (uuid)
- `title` (text)
- `description` (text)
- `status` (text)
- `start_date` (date)
- `end_date` (date)
- `position_x` (numeric)
- `position_y` (numeric)

#### Classroom System

**`classrooms`** - Learning classrooms
- `id` (uuid, primary key)
- `name` (text)
- `join_code` (text, unique)
- `instructor_id` (uuid, references profiles)
- `created_at` (timestamp)

**`classroom_memberships`** - Student enrollment
- `id` (uuid, primary key)
- `classroom_id` (uuid)
- `user_id` (uuid)
- `role` (text: 'student', 'instructor', 'ta')

**`classroom_teams`** - Team collaboration
- `id` (uuid, primary key)
- `classroom_id` (uuid)
- `name` (text)
- `leader_id` (uuid)

#### Hackathon System

**`hackathon_participants`** - Hackathon registrations
- `id` (uuid, primary key)
- `email` (text, unique)
- `full_name` (text)
- `password_hash` (text)
- `school` (text)
- `grade_level` (text)
- `created_at` (timestamp)

**`hackathon_teams`** - Hackathon teams
- `id` (uuid, primary key)
- `name` (text)
- `owner_id` (uuid, references hackathon_participants)
- `join_code` (text, unique)
- `track` (text)
- `max_members` (integer, default 5)

**`hackathon_team_members`** - Team membership
- `id` (uuid, primary key)
- `team_id` (uuid)
- `participant_id` (uuid)
- `joined_at` (timestamp)

---

## API Endpoints

Base URL: `https://onecha.org/api` or `http://localhost:3000/api` for local

### Authentication Required
All API routes require authentication via Supabase session cookies or Authorization header.

### Learning Maps

**GET** `/api/maps` - List all accessible maps
```typescript
// Response
{
  maps: [
    {
      id: "uuid",
      title: "Map Title",
      description: "Description",
      creator_id: "uuid",
      is_public: true,
      created_at: "timestamp"
    }
  ]
}
```

**GET** `/api/maps/[id]` - Get specific map details

**POST** `/api/maps` - Create new map
```typescript
// Request Body
{
  title: "Map Title",
  description: "Description",
  is_public: true
}
```

**PUT** `/api/maps/[id]` - Update map

**POST** `/api/maps/[id]/enroll` - Enroll user in map

**GET** `/api/maps/[id]/progress` - Get user progress on map

**GET** `/api/maps/[id]/nodes` - Get all nodes for a map

### User Progress

**GET** `/api/user/next-nodes` - Get next incomplete nodes across all enrolled maps
```typescript
// Response
{
  nodes: [
    {
      node_id: "uuid",
      node_title: "Node Title",
      map_id: "uuid",
      map_title: "Map Title",
      status: "not_started" | "in_progress"
    }
  ]
}
```

### Classrooms

**GET** `/api/classrooms` - List user's classrooms

**POST** `/api/classrooms` - Create classroom
```typescript
// Request Body
{
  name: "Classroom Name",
  description: "Description"
}
```

**POST** `/api/classrooms/join` - Join classroom via code
```typescript
// Request Body
{
  join_code: "ABC123"
}
```

**GET** `/api/classrooms/[id]` - Get classroom details

**GET** `/api/classrooms/[id]/students` - Get students in classroom

**POST** `/api/classrooms/[id]/assignments` - Create assignment

**GET** `/api/classrooms/[id]/grading` - Get grading data

### Journey System

**GET** `/api/journey/north-stars` - Get user's north stars

**POST** `/api/journey/north-stars` - Create north star
```typescript
// Request Body
{
  title: "North Star Title",
  description: "Description",
  icon: "🎯"
}
```

**GET** `/api/journey/projects` - Get user's projects

**POST** `/api/journey/projects` - Create project

### Hackathon (Custom Auth)

**POST** `/api/hackathon/register` - Register participant
```typescript
// Request Body
{
  email: "email@example.com",
  password: "password",
  full_name: "Full Name",
  school: "School Name",
  grade_level: "ม.6"
}
```

**POST** `/api/hackathon/login` - Login participant
```typescript
// Request Body
{
  email: "email@example.com",
  password: "password"
}

// Response - Sets SESSION_COOKIE
{
  token: "session_token",
  participant: { ... }
}
```

**GET** `/api/hackathon/me` - Get current participant (requires SESSION_COOKIE)

**POST** `/api/hackathon/team/create` - Create team

**POST** `/api/hackathon/team/join` - Join team via code

**GET** `/api/hackathon/team/me` - Get user's team

**POST** `/api/hackathon/logout` - Logout

### PathLab (AI Learning Paths)

**POST** `/api/pathlab/chat` - Chat with AI to generate learning path

**POST** `/api/pathlab/generate` - Generate PathLab map

**POST** `/api/pathlab/enroll` - Enroll in PathLab

**GET** `/api/pathlab/preview` - Preview generated path

### Admin

**GET** `/api/admin/stats` - Get system statistics (admin only)

**GET** `/api/admin/users` - List all users (admin only)

**POST** `/api/admin/users/roles` - Update user role (admin only)

---

## Key Data Models

### TypeScript Types

```typescript
// User Profile
interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin' | 'mentor';
  created_at: string;
}

// Learning Map
interface LearningMap {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  cover_image_url?: string;
  is_public: boolean;
  created_at: string;
}

// Map Node
interface MapNode {
  id: string;
  map_id: string;
  title: string;
  content: any; // JSONB content
  node_type: 'text' | 'video' | 'quiz' | 'assessment' | 'project';
  position_x: number;
  position_y: number;
}

// User Progress
interface StudentNodeProgress {
  id: string;
  user_id: string;
  node_id: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'passed' | 'failed';
  submission?: any;
  score?: number;
  updated_at: string;
}

// Classroom
interface Classroom {
  id: string;
  name: string;
  join_code: string;
  instructor_id: string;
  created_at: string;
}

// North Star (Journey)
interface NorthStar {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  icon?: string;
  position_x: number;
  position_y: number;
}

// Journey Project
interface JourneyProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  start_date?: string;
  end_date?: string;
  position_x: number;
  position_y: number;
}

// Hackathon Participant
interface HackathonParticipant {
  id: string;
  email: string;
  full_name: string;
  school: string;
  grade_level: string;
  created_at: string;
}

// Hackathon Team
interface HackathonTeam {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  track?: string;
  max_members: number;
  created_at: string;
}
```

---

## Security & CORS

### Row Level Security (RLS)

All tables have RLS enabled. Make sure to:

1. **Always authenticate** - Use Supabase auth sessions
2. **Use anon key** for client-side operations
3. **Use service role key** only server-side for admin operations

### CORS Configuration

If your app is on a different domain, you'll need to:

1. Add your domain to Supabase allowed origins:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your domain to "Site URL" and "Redirect URLs"

2. For API routes, the PassionSeed project should accept your origin (update `next.config.js` if needed)

### Authentication Flow

**For regular features (learning maps, journey):**
```typescript
// 1. Login via Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// 2. Session is stored in cookies automatically
// 3. Make API calls - session included automatically
const response = await fetch('https://onecha.org/api/maps');
```

**For hackathon features:**
```typescript
// 1. Login via hackathon API
const response = await fetch('https://onecha.org/api/hackathon/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include' // Important! Includes cookies
});

// 2. SESSION_COOKIE is set
// 3. Make hackathon API calls with credentials
const teamResponse = await fetch('https://onecha.org/api/hackathon/team/me', {
  credentials: 'include'
});
```

---

## Code Examples

### React App Integration

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

// components/MapList.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function MapList() {
  const [maps, setMaps] = useState([]);

  useEffect(() => {
    async function fetchMaps() {
      const { data, error } = await supabase
        .from('learning_maps')
        .select('*')
        .eq('is_public', true);

      if (data) setMaps(data);
    }

    fetchMaps();
  }, []);

  return (
    <div>
      {maps.map(map => (
        <div key={map.id}>{map.title}</div>
      ))}
    </div>
  );
}
```

### Vue App Integration

```typescript
// plugins/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// composables/useAuth.ts
import { ref, onMounted } from 'vue';
import { supabase } from '@/plugins/supabase';

export function useAuth() {
  const user = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    user.value = session?.user ?? null;
    loading.value = false;

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
    });
  });

  return { user, loading };
}
```

### Flutter/Mobile Integration

```dart
// pubspec.yaml
// dependencies:
//   supabase_flutter: ^2.0.0

// lib/supabase.dart
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: 'https://xdaeujtrqy1imi6nqzt1.supabase.co',
    anonKey: 'your_anon_key',
  );
}

final supabase = Supabase.instance.client;

// lib/services/auth_service.dart
class AuthService {
  Future<User?> signIn(String email, String password) async {
    final response = await supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    return response.user;
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  Stream<User?> get authStateChanges {
    return supabase.auth.onAuthStateChange.map((data) => data.session?.user);
  }
}

// lib/services/map_service.dart
class MapService {
  Future<List<Map<String, dynamic>>> getMaps() async {
    final response = await supabase
        .from('learning_maps')
        .select()
        .eq('is_public', true);
    return List<Map<String, dynamic>>.from(response);
  }
}
```

---

## Quick Start Checklist

- [ ] Get Supabase credentials from PassionSeed team
- [ ] Set up environment variables
- [ ] Install Supabase client library
- [ ] Implement authentication
- [ ] Test database connection
- [ ] Configure CORS if needed
- [ ] Test API endpoints
- [ ] Implement RLS-aware queries
- [ ] Handle error cases
- [ ] Set up session management

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **PassionSeed Codebase:** https://github.com/yourrepo/pseed
- **Project Base URL:** https://onecha.org
- **Contact:** Team lead or project maintainer

---

## Important Notes

1. **Never expose service role key** in client-side code
2. **Always use RLS** - Don't bypass security policies
3. **Test with real sessions** - Don't rely on service role for testing user flows
4. **Handle errors gracefully** - Supabase returns detailed error messages
5. **Use TypeScript** - Leverage type safety with Supabase generated types
6. **Cache wisely** - Consider implementing caching for frequently accessed data
7. **Monitor usage** - Track API calls and database queries

---

## Advanced: Generate TypeScript Types from Database

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref xdaeujtrqy1imi6nqzt1

# Generate types
supabase gen types typescript --linked > types/supabase.ts
```

Then use in your app:

```typescript
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(url, key);

// Now you get full type safety!
const { data } = await supabase
  .from('learning_maps')
  .select('*');
// data is fully typed!
```
