-- Restore get_student_points_breakdown to the original working logic from 20250810
-- Migration: 20250917_restore_original_function.sql

-- Drop all the broken semester-aware versions
DROP FUNCTION IF EXISTS get_student_points_breakdown(text);
DROP FUNCTION IF EXISTS get_student_points_breakdown(text, uuid);
DROP FUNCTION IF EXISTS get_summer_2025_student_points_breakdown(text);
DROP FUNCTION IF EXISTS get_fall_2025_student_points_breakdown(text);

-- Restore the original simple working function from 20250810
CREATE OR REPLACE FUNCTION get_student_points_breakdown(p_student_id text)
RETURNS TABLE(
    student_id text,
    check_ins integer,
    reviews integer,
    quiz_attempts integer,
    quiz_points numeric,
    midterm_submissions integer,
    midterm_project_points numeric,
    final_submissions integer,
    final_project_points numeric,
    note_submissions integer,
    project_notes_points numeric,
    vote_submissions integer,
    voting_points numeric,
    bonus_points numeric,
    total_points numeric,
    semester_code text,
    semester_name text,
    check_in_points numeric,
    review_points numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_check_in_points integer := 0;
    v_review_points integer := 0;
    v_midterm_points integer := 0;
    v_final_points integer := 0;
    v_notes_points integer := 0;
    v_voting_points integer := 0;
    v_quiz_points integer := 0;
    v_bonus_points integer := 0;
BEGIN
    -- Check-in points (10 if any check-ins exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 10 ELSE 0 END
    INTO v_check_in_points
    FROM student_check_ins
    WHERE student_check_ins.student_id = p_student_id;

    -- Review points (10 if any reviews exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 10 ELSE 0 END
    INTO v_review_points
    FROM student_reviews
    WHERE student_reviews.student_id = p_student_id;

    -- Midterm project points (20 if any midterm submissions exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 20 ELSE 0 END
    INTO v_midterm_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submissions.submission_type = 'project'
        AND submissions.project_type = 'midterm';

    -- Final project points (50 if any final submissions exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 50 ELSE 0 END
    INTO v_final_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submissions.submission_type = 'project'
        AND submissions.project_type = 'final';

    -- Project notes points (5 if any note submissions exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 5 ELSE 0 END
    INTO v_notes_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submissions.submission_type = 'note';

    -- Voting points (5 if any votes exist)
    SELECT CASE WHEN COUNT(*) > 0 THEN 5 ELSE 0 END
    INTO v_voting_points
    FROM project_votes
    WHERE project_votes.student_id = p_student_id;

    -- Quiz points (ORIGINAL WORKING LOGIC - use student_quiz_scores.total_points)
    SELECT COALESCE(MAX(student_quiz_scores.total_points), 0)
    INTO v_quiz_points
    FROM student_quiz_scores
    WHERE student_quiz_scores.student_id = p_student_id;

    -- Bonus points (from winning votes)
    SELECT COALESCE(SUM(submissions.bonus_points), 0)
    INTO v_bonus_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submissions.bonus_points > 0;

    RETURN QUERY SELECT
        p_student_id,
        -- Return the COUNTS for the new format, but POINTS for the points_breakdown
        (SELECT COUNT(*)::integer FROM student_check_ins sci WHERE sci.student_id = p_student_id), -- check_ins count
        (SELECT COUNT(*)::integer FROM student_reviews sr WHERE sr.student_id = p_student_id), -- reviews count
        (SELECT COUNT(*)::integer FROM student_quiz_attempts sqa WHERE sqa.student_id = p_student_id), -- quiz_attempts count
        v_quiz_points::numeric, -- quiz_points (actual points)
        (SELECT COUNT(*)::integer FROM submissions s WHERE s.student_id = p_student_id AND s.submission_type = 'project' AND s.project_type = 'midterm'), -- midterm_submissions count
        v_midterm_points::numeric, -- midterm_project_points (actual points)
        (SELECT COUNT(*)::integer FROM submissions s2 WHERE s2.student_id = p_student_id AND s2.submission_type = 'project' AND s2.project_type = 'final'), -- final_submissions count
        v_final_points::numeric, -- final_project_points (actual points)
        (SELECT COUNT(*)::integer FROM submissions s3 WHERE s3.student_id = p_student_id AND s3.submission_type = 'note'), -- note_submissions count
        v_notes_points::numeric, -- project_notes_points (actual points)
        (SELECT COUNT(*)::integer FROM project_votes pv WHERE pv.student_id = p_student_id), -- vote_submissions count
        v_voting_points::numeric, -- voting_points (actual points)
        v_bonus_points::numeric, -- bonus_points (actual points)
        (v_check_in_points + v_review_points + v_midterm_points + v_final_points +
         v_notes_points + v_voting_points + v_quiz_points + v_bonus_points)::numeric, -- total_points
        'original'::text, -- semester_code
        'Original Logic'::text, -- semester_name
        v_check_in_points::numeric, -- check_in_points (actual points)
        v_review_points::numeric; -- review_points (actual points)
END
$$;