-- Create semester-specific functions that were referenced in the leaderboard API
-- but never actually created

-- Function for Summer 2025 semester
CREATE OR REPLACE FUNCTION get_summer_2025_student_points_breakdown(p_student_id text)
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
    summer_semester_id uuid;
BEGIN
    -- Get Summer 2025 semester ID
    SELECT id INTO summer_semester_id FROM semesters WHERE code = 'summer_2025' LIMIT 1;
    
    IF summer_semester_id IS NULL THEN
        -- If no Summer 2025 semester found, return zeros
        RETURN QUERY 
        SELECT 
            p_student_id::text,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer;
        RETURN;
    END IF;
    
    -- Call the existing semester-aware function
    RETURN QUERY 
    SELECT * FROM get_student_points_breakdown(p_student_id, summer_semester_id);
END;
$$ LANGUAGE plpgsql;

-- Function for Fall 2025 semester
CREATE OR REPLACE FUNCTION get_fall_2025_student_points_breakdown(p_student_id text)
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
    fall_semester_id uuid;
BEGIN
    -- Get Fall 2025 semester ID
    SELECT id INTO fall_semester_id FROM semesters WHERE code = 'fall_2025' LIMIT 1;
    
    IF fall_semester_id IS NULL THEN
        -- If no Fall 2025 semester found, return zeros
        RETURN QUERY 
        SELECT 
            p_student_id::text,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer,
            0::integer;
        RETURN;
    END IF;
    
    -- Call the existing semester-aware function
    RETURN QUERY 
    SELECT * FROM get_student_points_breakdown(p_student_id, fall_semester_id);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_summer_2025_student_points_breakdown(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fall_2025_student_points_breakdown(text) TO authenticated;

-- Grant execute permissions to anon users for public access
GRANT EXECUTE ON FUNCTION get_summer_2025_student_points_breakdown(text) TO anon;
GRANT EXECUTE ON FUNCTION get_fall_2025_student_points_breakdown(text) TO anon;