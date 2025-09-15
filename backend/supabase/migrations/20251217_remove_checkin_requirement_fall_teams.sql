-- Remove check-in requirement for Fall semester team assignment
-- Migration: 20251217_remove_checkin_requirement_fall_teams.sql
-- Description: Fall semester should not require check-ins for team assignment

-- Update the function to remove check-in requirement for Fall semester
CREATE OR REPLACE FUNCTION get_unassigned_students(
    p_project_number integer,
    p_semester_id uuid
)
RETURNS TABLE(
    student_id text,
    full_name text
) AS $$
DECLARE
    semester_code text;
BEGIN
    -- Get the semester code to determine requirements
    SELECT code INTO semester_code
    FROM semesters
    WHERE id = p_semester_id;

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
    -- For Fall semesters, include all non-admin students (no check-in requirement)
    -- For other semesters, require check-ins to ensure active participation
    AND (
        semester_code LIKE 'fall_%' OR
        EXISTS (
            SELECT 1 FROM student_check_ins sci
            WHERE sci.student_id = s.student_id
            AND sci.semester_id = p_semester_id
        )
    )
    -- Exclude admin users (teachers) from team formation
    AND (s.is_admin IS NULL OR s.is_admin = false)
    ORDER BY s.full_name;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the logic
COMMENT ON FUNCTION get_unassigned_students(integer, uuid) IS
'Returns students available for team assignment. Fall semesters do not require check-ins, other semesters require at least one check-in to ensure active participation.';

DO $$
BEGIN
    RAISE NOTICE 'Successfully updated get_unassigned_students function to remove check-in requirement for Fall semesters';
END $$;