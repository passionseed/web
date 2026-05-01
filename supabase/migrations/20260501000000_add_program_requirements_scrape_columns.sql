-- Add raw scrape data columns to program_requirements
-- Supports the deep TCAS scraping pipeline: raw PDF text, admission URLs, and pipeline status tracking

alter table public.program_requirements
  add column if not exists raw_pdf_text text,
  add column if not exists admission_url text,
  add column if not exists pdf_urls text[] default '{}',
  add column if not exists detailed_conditions text,
  add column if not exists scrape_status text not null default 'pending';

-- Drop the overly strict unique(round_id) and replace with (round_id, program_id)
-- which already has data integrity via the FK constraints
alter table public.program_requirements drop constraint if exists program_requirements_round_id_key;
create unique index if not exists idx_program_requirements_round_program
  on public.program_requirements(round_id, program_id);

comment on column public.program_requirements.raw_pdf_text is 'Full extracted text from admission PDF';
comment on column public.program_requirements.admission_url is 'University admission page URL where PDFs were found';
comment on column public.program_requirements.pdf_urls is 'Array of PDF URLs found on the admission page';
comment on column public.program_requirements.detailed_conditions is 'Full conditions text from LLM extraction';
comment on column public.program_requirements.scrape_status is 'Pipeline progress: pending, text_extracted, enriched';
