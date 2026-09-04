-- Drop the activity log.
--
-- Per-teammate task ownership (project_tasks) is the real collaboration signal;
-- the activity feed mostly recorded low-value "viewed / opened" events and its
-- only reader was the now-removed Activity Log page. Nothing else depends on it
-- (points, badges and the AI features are all independent of this table).
--
-- Idempotent: safe to run more than once. CASCADE removes the table's indexes
-- (idx_activities_*) and its RLS policies (activities_select / activities_insert).

DROP TABLE IF EXISTS public.activities CASCADE;
