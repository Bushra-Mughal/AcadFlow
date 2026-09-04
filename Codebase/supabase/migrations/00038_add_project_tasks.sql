-- Per-teammate task lists for team projects.
-- Visibility: a member sees ONLY their own tasks; the project creator (lead) sees everyone's.
-- This is enforced in RLS, not just in the UI.

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee ON public.project_tasks(assignee_id);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- A member reads only their own tasks; the lead (creator) reads the whole team's.
DROP POLICY IF EXISTS "tasks_select_own_or_lead" ON public.project_tasks;
CREATE POLICY "tasks_select_own_or_lead" ON public.project_tasks FOR SELECT
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR is_project_creator(project_id, auth.uid())
  );

-- The lead or any project member can create tasks (AI delegation runs as the lead).
DROP POLICY IF EXISTS "tasks_insert_member" ON public.project_tasks;
CREATE POLICY "tasks_insert_member" ON public.project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_creator(project_id, auth.uid())
    OR is_project_member(project_id, auth.uid())
  );

-- The assignee ticks/edits their own tasks; the lead can edit anyone's.
DROP POLICY IF EXISTS "tasks_update_own_or_lead" ON public.project_tasks;
CREATE POLICY "tasks_update_own_or_lead" ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR is_project_creator(project_id, auth.uid())
  )
  WITH CHECK (
    assignee_id = auth.uid()
    OR is_project_creator(project_id, auth.uid())
  );

-- The assignee or the lead can delete a task.
DROP POLICY IF EXISTS "tasks_delete_own_or_lead" ON public.project_tasks;
CREATE POLICY "tasks_delete_own_or_lead" ON public.project_tasks FOR DELETE
  TO authenticated
  USING (
    assignee_id = auth.uid()
    OR is_project_creator(project_id, auth.uid())
  );
