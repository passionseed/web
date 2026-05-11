# Gemini System Instructions: Supabase Data Access

This document outlines the correct pattern for interacting with the Supabase database in this project. The goal is to centralize data access logic and ensure a consistent, maintainable, and scalable architecture.

## Core Principle: Abstract Data Logic

**DO NOT** query the Supabase client directly from within page components (Server or Client). All database interactions **MUST** be encapsulated in dedicated functions within the `/lib/supabase/` directory.

### The New Standard: Client-Side Fetching with Hooks

For all new features and when refactoring, the preferred method is to use Client Components (`"use client"`) that fetch data via custom functions. This provides a more interactive user experience and aligns with the project's direction.

**Workflow:**

1.  **Create a Data-Access File:**
    If a file for the relevant data domain doesn't exist, create one (e.g., `lib/supabase/maps.ts`, `lib/supabase/projects.ts`).

2.  **Define Data-Access Functions:**
    Inside this file, create and export `async` functions for each database operation (e.g., `getMaps`, `createMap`). These functions are responsible for creating a Supabase client and executing the query.

    ```typescript
    // Example: lib/supabase/maps.ts
    import { createClient } from "@/utils/supabase/client"; // Uses the client-side Supabase client
    import { LearningMap } from "@/types/map";

    export const getMaps = async (): Promise<LearningMap[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("learning_maps")
        .select("id, title, description");

      if (error) {
        console.error("Error fetching maps:", error);
        throw new Error("Could not fetch learning maps.");
      }

      return data || [];
    };
    ```

3.  **Use in a Client Component:**
    In your page or component file, add the `"use client";` directive. Use the `useState` and `useEffect` hooks to call your data-access function and manage state (loading, data, errors).

    ```tsx
    // Example: app/maps/page.tsx
    "use client";

    import { useEffect, useState } from "react";
    import { getMaps } from "@/lib/supabase/maps";
    import { LearningMap } from "@/types/map";

    export default function MapsPage() {
      const [maps, setMaps] = useState<LearningMap[]>([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const fetchMaps = async () => {
          try {
            const fetchedMaps = await getMaps();
            setMaps(fetchedMaps);
          } catch (err) {
            // Handle error
          } finally {
            setLoading(false);
          }
        };
        fetchMaps();
      }, []);

      // Render UI based on state
    }
    ```

### Reference Implementations

- **Fetching Data:** See `@app/me/reflection/page.tsx` for an example of fetching and displaying data.
- **Creating Data:** See `@app/me/reflection/new/page.tsx` for an example of a form that creates new data entries.
- **Data-Access Logic:** See `@lib/supabase/reflection.ts` for how data-access functions are structured.
