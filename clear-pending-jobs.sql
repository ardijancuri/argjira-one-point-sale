-- Clear all pending and stuck fiscal print jobs
-- Run this SQL query in your database to clean up the queue

-- 1. Show current pending jobs before deleting
SELECT id, type, status, created_at,
       (payload::jsonb -> 'items')::text as items_preview
FROM fiscal_print_jobs
WHERE status IN ('pending', 'printing')
ORDER BY created_at DESC;

-- 2. Delete all pending and printing jobs (uncomment to execute)
-- DELETE FROM fiscal_print_jobs WHERE status IN ('pending', 'printing');

-- 3. Verify deletion (should return 0 rows)
-- SELECT COUNT(*) FROM fiscal_print_jobs WHERE status IN ('pending', 'printing');
