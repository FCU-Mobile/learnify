-- Migration to support individual project voting results (Project 2 - Final)
-- This migration adds submission_id column to project_voting_results table

-- ============================================================================
-- PART 1: Modify project_voting_results table
-- ============================================================================

-- Add submission_id column (nullable to support existing team-based results)
ALTER TABLE project_voting_results
ADD COLUMN submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE;

-- Make team_id nullable since individual projects don't have teams
ALTER TABLE project_voting_results
ALTER COLUMN team_id DROP NOT NULL;

-- Add check constraint: either team_id OR submission_id must be set, but not both
ALTER TABLE project_voting_results
ADD CONSTRAINT check_team_or_submission_voting
    CHECK (
        (team_id IS NOT NULL AND submission_id IS NULL) OR
        (team_id IS NULL AND submission_id IS NOT NULL)
    );

-- Drop old unique constraint
ALTER TABLE project_voting_results
DROP CONSTRAINT IF EXISTS unique_voting_result_per_team_project;

-- Add new unique constraints as partial indexes
-- For team-based projects, ensure one result per team
CREATE UNIQUE INDEX unique_voting_result_per_team_project
    ON project_voting_results(team_id, project_number, semester_id)
    WHERE team_id IS NOT NULL;

-- For individual projects, ensure one result per submission
CREATE UNIQUE INDEX unique_voting_result_per_submission
    ON project_voting_results(submission_id, project_number, semester_id)
    WHERE submission_id IS NOT NULL;

-- Add index for submission-based lookups
CREATE INDEX idx_project_voting_results_submission ON project_voting_results(submission_id, project_number);

-- ============================================================================
-- PART 2: Update comments for documentation
-- ============================================================================

COMMENT ON COLUMN project_voting_results.team_id IS 'Team ID for team-based projects (Project 1). NULL for individual projects.';
COMMENT ON COLUMN project_voting_results.submission_id IS 'Submission ID for individual projects (Project 2). NULL for team-based projects.';

DO $$
BEGIN
    RAISE NOTICE '✅ project_voting_results table updated to support individual projects!';
    RAISE NOTICE 'Added submission_id column with check constraint';
    RAISE NOTICE 'Team projects: Use team_id (submission_id = NULL)';
    RAISE NOTICE 'Individual projects: Use submission_id (team_id = NULL)';
END $$;
