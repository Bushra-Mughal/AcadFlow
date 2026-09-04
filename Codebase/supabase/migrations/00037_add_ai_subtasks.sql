-- 00037_add_ai_subtasks.sql
-- Lets the AI Copilot "Plan my work" output be written back into assignments and
-- projects as an actionable checklist. Stored as JSONB so it inherits the existing
-- RLS on each table (users own their assignments; creators/members update projects).

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.assignments.subtasks IS
  'Checklist array of {id, text, done, source, created_at}; source is "ai-copilot" or "manual".';
COMMENT ON COLUMN public.projects.subtasks IS
  'Checklist array of {id, text, done, source, created_at}; source is "ai-copilot" or "manual".';
