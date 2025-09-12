-- Exclude teachers/admins from team shuffling
-- Migration: 20251216_exclude_admins_from_team_shuffle.sql
-- Description: Modify get_unassigned_students function to exclude admin users from team formation

-- Update the function to exclude admin users from team shuffling
CREATE OR REPLACE FUNCTION get_unassigned_students(
    p_project_number integer,
    p_semester_id uuid
)
RETURNS TABLE(
    student_id text,
    full_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.student_id,
        s.full_name
    FROM students s
    WHERE s.student_id NOT IN (
        SELECT tm.student_id
        FROM team_members tm
        JOIN project_teams pt ON tm.team_id = pt.id
        WHERE pt.project_number = p_project_number
        AND pt.semester_id = p_semester_id
    )
    -- Only include students who have check-ins in this semester (active students)
    AND EXISTS (
        SELECT 1 FROM student_check_ins sci
        WHERE sci.student_id = s.student_id
        AND sci.semester_id = p_semester_id
    )
    -- Exclude admin users (teachers) from team formation
    AND (s.is_admin IS NULL OR s.is_admin = false)
    ORDER BY s.full_name;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE 'Successfully updated get_unassigned_students function to exclude admin users from team shuffling';
END $$;