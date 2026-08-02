-- The audit-note columns were added after the original table was exposed to
-- PostgREST. Reload its schema cache before the next normalization run.
notify pgrst, 'reload schema';
