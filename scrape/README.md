# TCAS Discovery Engine: Data, Schema & Possibilities

The `scrape/` directory powers the core discovery experience of the platform. It provides a rich, multi-dimensional dataset of Thailand's University Central Admission System (TCAS), transformed for AI-driven interaction and deep personalization.

## 1. The Data
We have moved beyond static lists to a dynamic dataset that includes:
- **Comprehensive Program Catalog**: Every major, faculty, and university in the TCAS system.
- **Deep Admission Logic**: Granular data on every admission round (Portfolio, Quota, etc.), including specific project names, seat counts, and GPAX requirements.
- **Semantic Metadata**: Thai and English descriptions processed for machine understanding.

## 2. The Schema
The data is structured into three highly optimized layers in Supabase:

- **`tcas_universities`**: High-level metadata for all Thai universities.
- **`tcas_programs`**: The central entity. Each program contains:
    - **`embedding`**: A 1024-dimensional vector (`bge-m3`) representing the program's semantic "soul."
    - **`projection_2d`**: A [x, y] coordinate pair representing the program's location on our career map.
- **`tcas_admission_rounds`**: The "rules" layer. Links to programs with specific eligibility criteria (GPAX, scores, conditions).

## 3. The Possibilities

### A. Semantic Program Discovery
Instead of searching for "Law," users can ask: *"Programs for people who love debating and history."* Using our vector embeddings, the system identifies the most semantically relevant programs across all universities instantly.

### B. High-Fidelity Eligibility Matching
We can now provide instant, personalized answers to: *"Which Chulalongkorn programs can I get into with a 3.5 GPAX?"* The system filters through thousands of admission rounds in milliseconds to show only valid paths.

### C. The Career Discovery Map
Using the `projection_2d` coordinates, we can build a **"Galaxy of Careers."** 
- Similar programs (e.g., Computer Science and Software Engineering) naturally cluster together. 
- Distant clusters (e.g., Fine Arts vs. Medicine) show the breadth of the system.
- Users can browse this map visually to discover fields they didn't know existed but are semantically close to their interests.

### D. Multi-Lingual Intelligence
The search supports both Thai and English natively, allowing for a seamless experience regardless of the user's primary language or the program's official naming convention.
