-- Migration to support individual project ratings (Project 2 - Final)
-- This migration adds submission_id column to ratings tables to properly handle individual submissions

-- ============================================================================
-- PART 1: Modify project_ratings table
-- ============================================================================

-- Add submission_id column (nullable to support existing team-based ratings)
ALTER TABLE project_ratings
ADD COLUMN submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE;

-- Make team_id nullable since individual projects don't have teams
ALTER TABLE project_ratings
ALTER COLUMN team_id DROP NOT NULL;

-- Add check constraint: either team_id OR submission_id must be set, but not both
ALTER TABLE project_ratings
ADD CONSTRAINT check_team_or_submission
    CHECK (
        (team_id IS NOT NULL AND submission_id IS NULL) OR
        (team_id IS NULL AND submission_id IS NOT NULL)
    );

-- Drop old unique constraint
ALTER TABLE project_ratings
DROP CONSTRAINT IF EXISTS unique_teacher_rating_per_team_project;

-- Add new unique constraints
-- For team-based projects, ensure one rating per team
CREATE UNIQUE INDEX unique_teacher_rating_per_team_project
    ON project_ratings(team_id, project_number, semester_id)
    WHERE team_id IS NOT NULL;

-- For individual projects, ensure one rating per submission
CREATE UNIQUE INDEX unique_teacher_rating_per_submission
    ON project_ratings(submission_id, project_number, semester_id)
    WHERE submission_id IS NOT NULL;

-- Add index for submission-based lookups
CREATE INDEX idx_project_ratings_submission ON project_ratings(submission_id, project_number);

-- ============================================================================
-- PART 2: Modify project_star_ratings table
-- ============================================================================

-- Add submission_id column
ALTER TABLE project_star_ratings
ADD COLUMN submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE;

-- Make team_id nullable
ALTER TABLE project_star_ratings
ALTER COLUMN team_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE project_star_ratings
ADD CONSTRAINT check_team_or_submission_star
    CHECK (
        (team_id IS NOT NULL AND submission_id IS NULL) OR
        (team_id IS NULL AND submission_id IS NOT NULL)
    );

-- Drop old unique constraint
ALTER TABLE project_star_ratings
DROP CONSTRAINT IF EXISTS unique_star_rating_per_voter_team_project;

-- Add new unique constraints as partial indexes
-- For team-based projects
CREATE UNIQUE INDEX unique_star_rating_per_voter_team_project
    ON project_star_ratings(voter_id, team_id, project_number, semester_id)
    WHERE team_id IS NOT NULL;

-- For individual projects
CREATE UNIQUE INDEX unique_star_rating_per_voter_submission
    ON project_star_ratings(voter_id, submission_id, project_number, semester_id)
    WHERE submission_id IS NOT NULL;

-- Add index for submission-based lookups
CREATE INDEX idx_project_star_ratings_submission ON project_star_ratings(submission_id, project_number);

-- ============================================================================
-- PART 3: Migration script comments
-- ============================================================================

COMMENT ON COLUMN project_ratings.team_id IS 'Team ID for team-based projects (Project 1). NULL for individual projects.';
COMMENT ON COLUMN project_ratings.submission_id IS 'Submission ID for individual projects (Project 2). NULL for team-based projects.';
COMMENT ON COLUMN project_star_ratings.team_id IS 'Team ID for team-based projects (Project 1). NULL for individual projects.';
COMMENT ON COLUMN project_star_ratings.submission_id IS 'Submission ID for individual projects (Project 2). NULL for team-based projects.';
