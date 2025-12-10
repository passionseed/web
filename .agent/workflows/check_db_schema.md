---
description: How to access the local Supabase Postgres database in Docker
---

To inspect the database schema or read data directly from the local Supabase instance running in Docker, follow these steps.

1. **Identify the Container**
   The Postgres container is typically named `supabase_db_pseed` (for this project).
   You can verify it represents the postgres image (usually `supabase/postgres`).

   ```bash
   docker ps | grep supabase_db
   ```

2. **Get Table Schema**
   To see the structure of a specific table (e.g., `profiles`):

   ```bash
   docker exec supabase_db_pseed psql -U postgres -d postgres -c "\d profiles"
   ```

3. **Get Table Data**
   To see the actual data in a table:

   ```bash
   docker exec supabase_db_pseed psql -U postgres -d postgres -c "SELECT * FROM profiles LIMIT 5;"
   ```

4. **Dump Full Schema**
   To dump the entire public schema to a file for reference:

   ```bash
   docker exec supabase_db_pseed pg_dump -U postgres -d postgres -n public -s > .agent/schema_dump.sql
   ```
