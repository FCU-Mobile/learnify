-- Fall 2025 Semester Complete Setup
-- Migration: 20250913_fall_semester_complete_setup.sql
-- Description: Complete Fall 2025 semester configuration with 3 projects scoring system
-- Merged from: 20250910_update_fall_semester_scoring.sql, 20250911_add_project3_support.sql, 20250912_update_points_calculation_for_project3.sql

-- ============================================================================
-- PART 1: Update Fall 2025 Semester Scoring Configuration
-- ============================================================================

-- Update Fall 2025 semester scoring configuration
-- New scoring: 10% Quiz, 30% for each of 3 projects (90% total)
UPDATE semester_scoring_config 
SET 
    check_in_points = 0,        -- No check-in points for Fall
    review_points = 0,          -- No review points for Fall  
    midterm_project_points = 30, -- First project: 30%
    final_project_points = 30,   -- Second project: 30%
    note_points = 30,           -- Third project: 30% (reusing note_points for third project)
    vote_points = 0,            -- No voting points for Fall
    bonus_points = 0,           -- No bonus points for Fall
    -- Quiz points will be calculated as 10% (handled in application logic)
    updated_at = NOW()
WHERE semester_id = (
    SELECT id FROM semesters WHERE code = 'fall_2025'
);

-- ============================================================================
-- PART 2: Add Project 3 Support
-- ============================================================================

-- Update the existing constraint to also allow 'project3' type for Fall semester
DROP INDEX IF EXISTS idx_unique_student_project_type_per_semester;

-- Create updated constraint that allows midterm, final, and project3 types per semester
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_project_type_per_semester 
ON submissions(student_id, project_type, semester_id) 
WHERE submission_type = 'project' AND project_type IS NOT NULL;

-- ============================================================================
-- PART 3: Update Points Calculation Function
-- ============================================================================

-- Update the points breakdown function to handle project3 submissions
-- project3 submissions will contribute to the note_points field (30% for Fall semester)
CREATE OR REPLACE FUNCTION get_student_points_breakdown(
    p_student_id text,
    p_semester_id uuid DEFAULT NULL
)
RETURNS TABLE(
    student_id text,
    check_in_points integer,
    review_points integer,
    midterm_project_points integer,
    final_project_points integer,
    project_notes_points integer,
    voting_points integer,
    quiz_points integer,
    bonus_points integer,
    total_points integer
) AS $$
DECLARE
    v_semester_id uuid;
    v_check_in_points integer := 0;
    v_review_points integer := 0;
    v_midterm_points integer := 0;
    v_final_points integer := 0;
    v_notes_points integer := 0;
    v_voting_points integer := 0;
    v_quiz_points integer := 0;
    v_bonus_points integer := 0;
    
    -- Get semester scoring config
    v_config RECORD;
BEGIN
    -- Determine which semester to use
    IF p_semester_id IS NULL THEN
        v_semester_id := get_current_semester();
    ELSE
        v_semester_id := p_semester_id;
    END IF;
    
    -- Get scoring configuration for the semester
    SELECT * INTO v_config
    FROM semester_scoring_config ssc
    JOIN semesters s ON ssc.semester_id = s.id
    WHERE s.id = v_semester_id;
    
    IF NOT FOUND THEN
        -- Fallback to default values if no config found
        v_config := (NULL, v_semester_id, 10, 10, 20, 50, 5, 5, 50, NOW(), NOW())::semester_scoring_config;
    END IF;
    
    -- Calculate check-in points (only if > 0 in config)
    IF v_config.check_in_points > 0 THEN
        SELECT COUNT(*) * v_config.check_in_points INTO v_check_in_points
        FROM student_check_ins sci
        WHERE sci.student_id = p_student_id 
        AND (v_semester_id IS NULL OR sci.semester_id = v_semester_id);
    END IF;
    
    -- Calculate review points (only if > 0 in config)
    IF v_config.review_points > 0 THEN
        SELECT COUNT(*) * v_config.review_points INTO v_review_points
        FROM student_reviews sr
        WHERE sr.student_id = p_student_id 
        AND (v_semester_id IS NULL OR sr.semester_id = v_semester_id);
    END IF;
    
    -- Calculate midterm project points (Project 1)
    IF v_config.midterm_project_points > 0 AND EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.student_id = p_student_id 
        AND s.submission_type = 'project' 
        AND s.project_type = 'midterm'
        AND (v_semester_id IS NULL OR s.semester_id = v_semester_id)
    ) THEN
        v_midterm_points := v_config.midterm_project_points;
    END IF;
    
    -- Calculate final project points (Project 2)
    IF v_config.final_project_points > 0 AND EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.student_id = p_student_id 
        AND s.submission_type = 'project' 
        AND s.project_type = 'final'
        AND (v_semester_id IS NULL OR s.semester_id = v_semester_id)
    ) THEN
        v_final_points := v_config.final_project_points;
    END IF;
    
    -- Calculate project notes points (includes both actual notes AND project3 submissions)
    IF v_config.note_points > 0 THEN
        -- Count actual project notes
        SELECT COUNT(*) * LEAST(v_config.note_points, 5) INTO v_notes_points
        FROM project_notes pn
        JOIN submissions s ON pn.submission_id = s.id
        WHERE s.student_id = p_student_id 
        AND (v_semester_id IS NULL OR s.semester_id = v_semester_id);
        
        -- Add project3 submission points (Project 3) - full note_points value
        IF EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.student_id = p_student_id 
            AND s.submission_type = 'project' 
            AND s.project_type = 'project3'
            AND (v_semester_id IS NULL OR s.semester_id = v_semester_id)
        ) THEN
            v_notes_points := v_config.note_points;  -- Full 30% for Fall semester
        END IF;
    END IF;
    
    -- Calculate voting points (only if > 0 in config)
    IF v_config.vote_points > 0 THEN
        SELECT COUNT(*) * v_config.vote_points INTO v_voting_points
        FROM project_votes pv
        JOIN submissions s ON pv.submission_id = s.id
        WHERE pv.voter_student_id = p_student_id 
        AND (v_semester_id IS NULL OR s.semester_id = v_semester_id);
    END IF;
    
    -- Calculate quiz points (based on correct answers)
    SELECT COALESCE(COUNT(DISTINCT qa.question_id) * 5, 0) INTO v_quiz_points
    FROM quiz_attempts qa
    WHERE qa.student_id = p_student_id 
    AND qa.is_correct = true
    AND (v_semester_id IS NULL OR qa.semester_id = v_semester_id);
    
    -- Calculate bonus points (only if > 0 in config)
    IF v_config.bonus_points > 0 THEN
        SELECT COALESCE(SUM(ba.bonus_amount), 0) INTO v_bonus_points
        FROM bonus_awards ba
        WHERE ba.student_id = p_student_id 
        AND (v_semester_id IS NULL OR ba.semester_id = v_semester_id);
    END IF;
    
    RETURN QUERY SELECT 
        p_student_id,
        v_check_in_points,
        v_review_points,
        v_midterm_points,
        v_final_points,
        v_notes_points,
        v_voting_points,
        v_quiz_points,
        v_bonus_points,
        (v_check_in_points + v_review_points + v_midterm_points + v_final_points + 
         v_notes_points + v_voting_points + v_quiz_points + v_bonus_points);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENTATION AND COMMENTS
-- ============================================================================

-- Add comments to document the Fall semester scoring structure
COMMENT ON TABLE semester_scoring_config IS 
'Configurable point values per semester. Fall 2025: 10% Quiz, 30% each for 3 projects (using midterm_project_points, final_project_points, note_points)';

-- Add comment to document all supported project types
COMMENT ON INDEX idx_unique_student_project_type_per_semester IS 
'Ensures each student can submit one project per type per semester. Supported types: midterm, final, project3';

-- Document the Fall semester project mapping
COMMENT ON TABLE submissions IS 
'Project submissions. Fall 2025 supports 3 projects: midterm (Project 1), final (Project 2), project3 (Project 3). Each worth 30%.';

-- Add comment for updated function
COMMENT ON FUNCTION get_student_points_breakdown(text, uuid) IS 
'Gets student points breakdown for a specific semester. For Fall 2025: project3 submissions count toward note_points (30%)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the Fall semester scoring configuration
SELECT 
    s.name as semester_name,
    s.code as semester_code,
    ssc.check_in_points,
    ssc.review_points, 
    ssc.midterm_project_points,
    ssc.final_project_points,
    ssc.note_points,
    ssc.vote_points,
    ssc.bonus_points
FROM semester_scoring_config ssc
JOIN semesters s ON ssc.semester_id = s.id
WHERE s.code = 'fall_2025';

-- Migration completed
SELECT 'Fall 2025 semester complete setup finished!' as migration_status;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 
-- Fall 2025 Semester Scoring Structure:
-- - Project 1 (midterm): 30% of grade
-- - Project 2 (final): 30% of grade  
-- - Project 3 (project3): 30% of grade
-- - Quiz Performance: 10% of grade
-- - Check-ins, Reviews, Voting: 0% (disabled for Fall)
-- 
-- Database Implementation:
-- - midterm_project_points field = Project 1 (30%)
-- - final_project_points field = Project 2 (30%)
-- - note_points field = Project 3 (30%)
-- - Quiz points calculated separately (10%)
-- 
-- Each project breakdown (to be implemented):
-- - 20% Teacher marking
-- - 10% Competition win bonus
-- ============================================================================