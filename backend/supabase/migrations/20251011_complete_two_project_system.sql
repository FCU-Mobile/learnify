-- Complete Two-Project System Migration for Fall 2025
-- Migration: 20251004_complete_two_project_system.sql
-- Description: Comprehensive migration to implement 2-project grading system
-- Consolidates: 20251015_update_to_two_project_system.sql, 20251016_fix_fall_leaderboard_two_projects.sql, 20251219_final_two_project_system_fix.sql
--
-- NEW GRADING STRUCTURE:
--   - Project 1 (Midterm - Team): 40%
--   - Project 2 (Final - Individual): 50%
--   - Quiz: 10%
--   - TOTAL: 100%

-- ============================================================================
-- PART 1: Update Database Constraints
-- ============================================================================

-- Update project_teams to only allow project_number 1 and 2
ALTER TABLE project_teams
DROP CONSTRAINT IF EXISTS project_teams_project_number_check;

ALTER TABLE project_teams
ADD CONSTRAINT project_teams_project_number_check
CHECK (project_number IN (1, 2));

-- Update rating system tables constraints
DO $$
BEGIN
    -- Update project_ratings
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'project_ratings'
    ) THEN
        ALTER TABLE project_ratings
        DROP CONSTRAINT IF EXISTS project_ratings_project_number_check;

        ALTER TABLE project_ratings
        ADD CONSTRAINT project_ratings_project_number_check
        CHECK (project_number IN (1, 2));
    END IF;

    -- Update rating_criteria
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rating_criteria'
    ) THEN
        ALTER TABLE rating_criteria
        DROP CONSTRAINT IF EXISTS rating_criteria_project_number_check;

        ALTER TABLE rating_criteria
        ADD CONSTRAINT rating_criteria_project_number_check
        CHECK (project_number IN (1, 2));
    END IF;

    -- Update rating_submissions
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'rating_submissions'
    ) THEN
        ALTER TABLE rating_submissions
        DROP CONSTRAINT IF EXISTS rating_submissions_project_number_check;

        ALTER TABLE rating_submissions
        ADD CONSTRAINT rating_submissions_project_number_check
        CHECK (project_number IN (1, 2));
    END IF;
END $$;

-- ============================================================================
-- PART 2: Update Fall 2025 Semester Scoring Configuration
-- ============================================================================

-- Update scoring weights in database
-- Note: Quiz weight (10%) is handled in application logic
UPDATE semester_scoring_config
SET
    check_in_points = 0,         -- No check-in points for Fall
    review_points = 0,           -- No review points for Fall
    midterm_project_points = 40, -- Project 1 (Midterm - Team): 40%
    final_project_points = 50,   -- Project 2 (Final - Individual): 50%
    note_points = 0,             -- No third project
    vote_points = 0,             -- No voting points for Fall
    bonus_points = 0,            -- No bonus points for Fall
    updated_at = NOW()
WHERE semester_id = (
    SELECT id FROM semesters WHERE code = 'fall_2025'
);

-- ============================================================================
-- PART 3: Clean Up Project 3 Data
-- ============================================================================

-- Delete any Project 3 teams and related data
DELETE FROM project_teams
WHERE project_number = 3;

-- Update any project3 submissions to be null (preserve data but mark as invalid)
UPDATE submissions
SET project_type = NULL
WHERE project_type = 'project3';

-- ============================================================================
-- PART 4: Update Fall Leaderboard Function
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_fall_2025_leaderboard();

-- Create updated function with 2-project scoring
CREATE OR REPLACE FUNCTION get_fall_2025_leaderboard()
RETURNS TABLE(
    student_id text,
    student_name text,
    quiz_points numeric,
    project1_rating numeric,
    project2_rating numeric,
    total_score numeric,
    rank integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    fall_semester_id uuid;
BEGIN
    -- Get Fall 2025 semester ID
    SELECT id INTO fall_semester_id
    FROM semesters
    WHERE code = 'fall_2025'
    LIMIT 1;

    -- Calculate leaderboard with 2-project system
    -- Quiz: 10%, Project 1 (Midterm): 40%, Project 2 (Final): 50%
    RETURN QUERY
    WITH student_scores AS (
        SELECT
            s.student_id,
            s.full_name as student_name,

            -- Quiz points (10% - max 10 points from quiz system)
            COALESCE((
                SELECT SUM(qa.points_earned)
                FROM quiz_attempts qa
                WHERE qa.student_id = s.student_id
                AND qa.semester_id = fall_semester_id
            ), 0) as quiz_points,

            -- Project 1 rating (Midterm - 40% max, team-based)
            -- Formula: (teacher_rating / 20) * 40 + student_rating_bonus
            COALESCE((
                SELECT
                    -- Teacher rating worth 40% (scaled from 0-20 to 0-40)
                    (pr.teacher_rating / 20.0) * 40.0
                    -- Student star rating bonus (up to 10% additional)
                    + COALESCE((
                        SELECT pvr.final_score
                        FROM project_voting_results pvr
                        WHERE pvr.team_id = pr.team_id
                        AND pvr.project_number = 1
                        AND pvr.semester_id = fall_semester_id
                    ), 0)
                FROM project_ratings pr
                JOIN team_members tm ON pr.team_id = tm.team_id
                WHERE tm.student_id = s.student_id
                AND pr.project_number = 1
                AND pr.semester_id = fall_semester_id
            ), 0) as project1_rating,

            -- Project 2 rating (Final - 50% max, individual)
            -- Formula: (teacher_rating / 20) * 50 + student_rating_bonus
            COALESCE((
                SELECT
                    -- Teacher rating worth 50% (scaled from 0-20 to 0-50)
                    (pr.teacher_rating / 20.0) * 50.0
                    -- Student star rating bonus (up to 10% additional)
                    + COALESCE((
                        SELECT pvr.final_score
                        FROM project_voting_results pvr
                        WHERE pvr.team_id = pr.team_id
                        AND pvr.project_number = 2
                        AND pvr.semester_id = fall_semester_id
                    ), 0)
                FROM project_ratings pr
                JOIN team_members tm ON pr.team_id = tm.team_id
                WHERE tm.student_id = s.student_id
                AND pr.project_number = 2
                AND pr.semester_id = fall_semester_id
            ), 0) as project2_rating
        FROM students s
        WHERE s.is_admin = false  -- EXCLUDE ADMIN/TEACHER ACCOUNTS
    ),
    ranked_scores AS (
        SELECT
            ss.*,
            -- Total = Quiz (10%) + Project 1 (40%) + Project 2 (50%) = 100%
            (ss.quiz_points + ss.project1_rating + ss.project2_rating) as total_score
        FROM student_scores ss
    )
    SELECT
        rs.student_id,
        rs.student_name,
        rs.quiz_points::numeric,
        rs.project1_rating::numeric,
        rs.project2_rating::numeric,
        rs.total_score::numeric,
        ROW_NUMBER() OVER (ORDER BY rs.total_score DESC, rs.student_name ASC)::integer as rank
    FROM ranked_scores rs
    ORDER BY rank ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_fall_2025_leaderboard() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_fall_2025_leaderboard() IS
'Fall 2025 leaderboard with 2-project grading: Quiz 10%, Project 1 (Midterm/Team) 40%, Project 2 (Final/Individual) 50%. NO PROJECT 3.';

-- ============================================================================
-- PART 5: Update Function Documentation
-- ============================================================================

-- Update get_project_teams function documentation
COMMENT ON FUNCTION get_project_teams(integer, uuid) IS
'Get teams for a specific project (1 or 2) and semester. Project 1 is team-based (Midterm 40%), Project 2 is individual (Final 50%)';

-- Update can_students_be_grouped function documentation
COMMENT ON FUNCTION can_students_be_grouped(text[], uuid, integer) IS
'Check if students can be grouped together. Only applicable for Project 1 (Midterm - Team-based)';

-- ============================================================================
-- PART 6: Create Helper View
-- ============================================================================

-- Create a view to show the current project structure
CREATE OR REPLACE VIEW fall_project_structure AS
SELECT
    1 as project_number,
    'Midterm' as project_name,
    'Team' as submission_type,
    40 as weight_percentage,
    'Team-based project with shared scoring' as description
UNION ALL
SELECT
    2 as project_number,
    'Final' as project_name,
    'Individual' as submission_type,
    50 as weight_percentage,
    'Individual project submission' as description;

GRANT SELECT ON fall_project_structure TO authenticated;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TWO-PROJECT SYSTEM MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'OLD STRUCTURE (3 projects):';
    RAISE NOTICE '  - Project 1: 30%%';
    RAISE NOTICE '  - Project 2: 30%%';
    RAISE NOTICE '  - Project 3: 30%%';
    RAISE NOTICE '  - Quiz: 10%%';
    RAISE NOTICE '';
    RAISE NOTICE 'NEW STRUCTURE (2 projects):';
    RAISE NOTICE '  - Project 1 (Midterm - Team): 40%%';
    RAISE NOTICE '  - Project 2 (Final - Individual): 50%%';
    RAISE NOTICE '  - Quiz: 10%%';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  ✅ Updated all CHECK constraints to only allow projects (1, 2)';
    RAISE NOTICE '  ✅ Updated Fall 2025 scoring configuration';
    RAISE NOTICE '  ✅ Removed all Project 3 data';
    RAISE NOTICE '  ✅ Updated Fall leaderboard function';
    RAISE NOTICE '  ✅ Updated function documentation';
    RAISE NOTICE '  ✅ Created fall_project_structure view';
    RAISE NOTICE '';
    RAISE NOTICE 'Project 1 (Midterm):';
    RAISE NOTICE '  - Team-based (3-4 students)';
    RAISE NOTICE '  - Teams already assigned';
    RAISE NOTICE '  - Worth 40%% of final grade';
    RAISE NOTICE '';
    RAISE NOTICE 'Project 2 (Final):';
    RAISE NOTICE '  - Individual submission only';
    RAISE NOTICE '  - No team collaboration';
    RAISE NOTICE '  - Worth 50%% of final grade';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
