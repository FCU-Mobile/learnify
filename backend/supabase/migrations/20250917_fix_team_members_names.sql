-- Fix get_project_teams function to include student full names

CREATE OR REPLACE FUNCTION get_project_teams(
    p_project_number integer,
    p_semester_id uuid
)
RETURNS TABLE(
    team_id bigint,
    team_name text,
    project_number integer,
    member_count bigint,
    members jsonb,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pt.id as team_id,
        pt.team_name,
        pt.project_number,
        COUNT(tm.id) as member_count,
        jsonb_agg(
            jsonb_build_object(
                'student_id', tm.student_id,
                'full_name', COALESCE(s.full_name, 'Unknown Student'),
                'joined_at', tm.created_at
            ) ORDER BY tm.created_at
        ) as members,
        pt.created_at
    FROM project_teams pt
    LEFT JOIN team_members tm ON pt.id = tm.team_id
    LEFT JOIN students s ON tm.student_id = s.student_id
    WHERE pt.project_number = p_project_number
    AND pt.semester_id = p_semester_id
    GROUP BY pt.id, pt.team_name, pt.project_number, pt.created_at
    ORDER BY pt.team_name;
END;
$$ LANGUAGE plpgsql;