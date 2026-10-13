-- A completed enrollment may later expire or be explicitly revoked while retaining its
-- completion timestamp as history. Active rows still cannot carry completion timestamps.
ALTER TABLE public.enrollments
  DROP CONSTRAINT enrollments_lifecycle_check;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_lifecycle_check CHECK (
    (status <> 'completed' OR completed_at IS NOT NULL)
    AND (status IN ('completed', 'revoked', 'expired') OR completed_at IS NULL)
    AND (status = 'revoked') = (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    AND (revoked_at IS NULL) = (revoked_by IS NULL)
  );
