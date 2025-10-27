-- Add voting scores to Project 1 (team-based) leaderboard calculation
-- Project 1 should be: teacher_rating (0-30%) + voting_score (0-10%) = 0-40%

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
            -- Quiz points (10% of total quiz score) - ONLY FROM FALL SEMESTER
            COALESCE((
                SELECT (sqs.total_points * 0.1)
                FROM student_quiz_scores sqs
                WHERE sqs.student_id = s.student_id
                AND sqs.semester_id = fall_semester_id  -- Only Fall semester quiz scores
            ), 0) as quiz_points,

            -- Project 1 rating (40% - team-based, uses team_id)
            -- Includes teacher rating (0-30%) + voting score (0-10%)
            COALESCE((
                SELECT
                    COALESCE(pr.teacher_rating, 0) +
                    COALESCE(pvr.voting_score, 0)
                FROM project_teams pt
                JOIN team_members tm ON tm.team_id = pt.id
                LEFT JOIN project_ratings pr ON pr.team_id = pt.id
                    AND pr.project_number = 1
                    AND pr.semester_id = fall_semester_id
                LEFT JOIN project_voting_results pvr ON pvr.team_id = pt.id
                    AND pvr.project_number = 1
                    AND pvr.semester_id = fall_semester_id
                WHERE tm.student_id = s.student_id
                AND pt.semester_id = fall_semester_id
                LIMIT 1
            ), 0) as project1_rating,

            -- Project 2 rating (50% - individual, uses submission_id)
            -- Includes teacher rating (0-40%) + voting score (0-10%)
            COALESCE((
                SELECT
                    COALESCE(pr.teacher_rating, 0) +
                    COALESCE(pvr.voting_score, 0)
                FROM submissions sub
                LEFT JOIN project_ratings pr ON pr.submission_id = sub.id
                    AND pr.project_number = 2
                    AND pr.semester_id = fall_semester_id
                LEFT JOIN project_voting_results pvr ON pvr.submission_id = sub.id
                    AND pvr.project_number = 2
                    AND pvr.semester_id = fall_semester_id
                WHERE sub.student_id = s.student_id
                AND sub.submission_type = 'project'
                AND sub.project_type = 'final'
                AND sub.semester_id = fall_semester_id
                LIMIT 1
            ), 0) as project2_rating,

            -- Project 3 rating (not used in 2-project system, always 0)
            0 as project3_rating
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

COMMENT ON FUNCTION get_fall_semester_leaderboard() IS 'Fall semester leaderboard: Project 1 (40% = 30% teacher + 10% voting, team-based), Project 2 (50% = 40% teacher + 10% voting, individual), Quiz (10%). Excludes admin accounts.';

DO $$
BEGIN
    RAISE NOTICE '✅ Fall leaderboard function updated to include Project 1 voting scores';
    RAISE NOTICE 'Project 1 now correctly calculates: teacher_rating (0-30%%) + voting_score (0-10%%) = 0-40%%';
    RAISE NOTICE 'Project 2 correctly calculates: teacher_rating (0-40%%) + voting_score (0-10%%) = 0-50%%';
END $$;
