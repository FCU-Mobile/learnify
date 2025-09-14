-- Update Fall Semester Leaderboard Function to exclude teachers/admins
-- Migration: 20251214_exclude_teachers_fall_leaderboard.sql

-- Update Fall semester specific function to exclude admin/teacher accounts
CREATE OR REPLACE FUNCTION get_fall_semester_leaderboard()
RETURNS TABLE(
    student_id text,
    student_name text,
    quiz_points numeric,
    project1_rating numeric,
    project2_rating numeric,
    project3_rating numeric,
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

    -- Return ranked students with their scores (EXCLUDING ADMINS/TEACHERS)
    RETURN QUERY
    WITH student_scores AS (
        SELECT
            s.student_id,
            s.full_name as student_name,
            -- Quiz points (10% of total quiz score)
            COALESCE((
                SELECT (sqs.total_points * 0.1)
                FROM student_quiz_scores sqs
                WHERE sqs.student_id = s.student_id
            ), 0) as quiz_points,

            -- Project 1 rating (30% - teacher rating directly)
            COALESCE((
                SELECT pr.teacher_rating
                FROM project_ratings pr
                JOIN project_teams pt ON pt.id = pr.team_id
                JOIN team_members tm ON tm.team_id = pt.id
                WHERE tm.student_id = s.student_id
                AND pr.project_number = 1
                AND pr.semester_id = fall_semester_id
            ), 0) as project1_rating,

            -- Project 2 rating (30% - teacher rating directly)
            COALESCE((
                SELECT pr.teacher_rating
                FROM project_ratings pr
                JOIN project_teams pt ON pt.id = pr.team_id
                JOIN team_members tm ON tm.team_id = pt.id
                WHERE tm.student_id = s.student_id
                AND pr.project_number = 2
                AND pr.semester_id = fall_semester_id
            ), 0) as project2_rating,

            -- Project 3 rating (30% - teacher rating directly)
            COALESCE((
                SELECT pr.teacher_rating
                FROM project_ratings pr
                JOIN project_teams pt ON pt.id = pr.team_id
                JOIN team_members tm ON tm.team_id = pt.id
                WHERE tm.student_id = s.student_id
                AND pr.project_number = 3
                AND pr.semester_id = fall_semester_id
            ), 0) as project3_rating
        FROM students s
        WHERE s.is_admin = false  -- EXCLUDE ADMIN/TEACHER ACCOUNTS
    ),
    ranked_scores AS (
        SELECT
            ss.*,
            (ss.quiz_points + ss.project1_rating + ss.project2_rating + ss.project3_rating) as total_score
        FROM student_scores ss
    )
    SELECT
        rs.student_id,
        rs.student_name,
        rs.quiz_points::numeric,
        rs.project1_rating::numeric,
        rs.project2_rating::numeric,
        rs.project3_rating::numeric,
        rs.total_score::numeric,
        ROW_NUMBER() OVER (ORDER BY rs.total_score DESC, rs.student_name ASC)::integer as rank
    FROM ranked_scores rs
    ORDER BY rs.total_score DESC, rs.student_name ASC;
END
$$;

-- Comment to document the change
COMMENT ON FUNCTION get_fall_semester_leaderboard() IS 'Fall semester leaderboard function excluding admin/teacher accounts from rankings';