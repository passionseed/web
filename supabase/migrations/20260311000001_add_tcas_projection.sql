-- Add 2D projection column for visualization
alter table public.tcas_programs add column if not exists projection_2d vector(2);

-- Index for faster retrieval of projected data
create index if not exists idx_tcas_programs_projection on public.tcas_programs (projection_2d) where projection_2d is not null;
