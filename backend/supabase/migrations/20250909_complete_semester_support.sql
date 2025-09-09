-- Complete Semester Support Migration
-- Migration: 20250909_complete_semester_support.sql
-- Description: Comprehensive semester support including tables, data migration, function updates, and bug fixes
-- Consolidates: 20250909_add_semester_support.sql, 20250910_migrate_existing_data_to_summer_semester.sql, 
--               20250911_update_functions_with_semester_support.sql, 20250912_fix_function_overloading.sql

-- ================================
-- PART 1: CREATE SEMESTER TABLES
-- ================================

-- Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'summer_2025', 'fall_2025'
    name TEXT NOT NULL, -- e.g. 'Summer 2025', 'Fall 2025'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create semester-specific scoring configuration table
CREATE TABLE IF NOT EXISTS semester_scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    check_in_points INTEGER DEFAULT 10,
    review_points INTEGER DEFAULT 10,
    midterm_project_points INTEGER DEFAULT 20,
    final_project_points INTEGER DEFAULT 50,
    note_points INTEGER DEFAULT 5,
    vote_points INTEGER DEFAULT 5,
    bonus_points INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one config per semester
    UNIQUE(semester_id)
);

-- Insert initial semesters (if not exists)
INSERT INTO semesters (code, name, start_date, end_date, is_current, is_active) 
SELECT 'summer_2025', 'Summer 2025', '2025-06-01', '2025-08-31', false, true
WHERE NOT EXISTS (SELECT 1 FROM semesters WHERE code = 'summer_2025');

INSERT INTO semesters (code, name, start_date, end_date, is_current, is_active) 
SELECT 'fall_2025', 'Fall 2025', '2025-09-09', '2026-01-06', true, true
WHERE NOT EXISTS (SELECT 1 FROM semesters WHERE code = 'fall_2025');

-- Insert default scoring configurations for both semesters (if not exists)
INSERT INTO semester_scoring_config (semester_id, check_in_points, review_points, midterm_project_points, final_project_points, note_points, vote_points, bonus_points)
SELECT 
    s.id,
    10,  -- check_in_points
    10,  -- review_points
    20,  -- midterm_project_points
    50,  -- final_project_points
    5,   -- note_points
    5,   -- vote_points
    50   -- bonus_points
FROM semesters s
WHERE NOT EXISTS (SELECT 1 FROM semester_scoring_config WHERE semester_id = s.id);

-- ================================
-- PART 2: ADD SEMESTER COLUMNS
-- ================================

-- Add semester_id column to existing data tables (if not exists)
DO $$ 
BEGIN
    -- student_check_ins
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_check_ins' AND column_name = 'semester_id') THEN
        ALTER TABLE student_check_ins ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- submissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'semester_id') THEN
        ALTER TABLE submissions ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- project_votes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_votes' AND column_name = 'semester_id') THEN
        ALTER TABLE project_votes ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- project_notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_notes' AND column_name = 'semester_id') THEN
        ALTER TABLE project_notes ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- student_reviews (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_reviews') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_reviews' AND column_name = 'semester_id') THEN
        ALTER TABLE student_reviews ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- quiz_attempts (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_attempts') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_attempts' AND column_name = 'semester_id') THEN
        ALTER TABLE quiz_attempts ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- student_quiz_scores (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_quiz_scores') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_quiz_scores' AND column_name = 'semester_id') THEN
        ALTER TABLE student_quiz_scores ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;

    -- student_feedback (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_feedback') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_feedback' AND column_name = 'semester_id') THEN
        ALTER TABLE student_feedback ADD COLUMN semester_id UUID REFERENCES semesters(id);
    END IF;
END $$;

-- ================================
-- PART 3: MIGRATE EXISTING DATA
-- ================================

-- Migrate existing data to Summer 2025 semester
DO $$ 
DECLARE
    summer_semester_id UUID;
BEGIN
    -- Get Summer 2025 semester ID
    SELECT id INTO summer_semester_id 
    FROM semesters 
    WHERE code = 'summer_2025';
    
    -- Update student_check_ins
    UPDATE student_check_ins 
    SET semester_id = summer_semester_id 
    WHERE semester_id IS NULL;
    
    -- Update submissions
    UPDATE submissions 
    SET semester_id = summer_semester_id 
    WHERE semester_id IS NULL;
    
    -- Update project_votes
    UPDATE project_votes 
    SET semester_id = summer_semester_id 
    WHERE semester_id IS NULL;
    
    -- Update project_notes
    UPDATE project_notes 
    SET semester_id = summer_semester_id 
    WHERE semester_id IS NULL;
    
    -- Update student_reviews (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_reviews') THEN
        EXECUTE 'UPDATE student_reviews 
                SET semester_id = $1 
                WHERE semester_id IS NULL' 
        USING summer_semester_id;
    END IF;
    
    -- Update quiz_attempts (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_attempts') THEN
        EXECUTE 'UPDATE quiz_attempts 
                SET semester_id = $1 
                WHERE semester_id IS NULL' 
        USING summer_semester_id;
    END IF;
    
    -- Update student_quiz_scores (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_quiz_scores') THEN
        EXECUTE 'UPDATE student_quiz_scores 
                SET semester_id = $1 
                WHERE semester_id IS NULL' 
        USING summer_semester_id;
    END IF;
    
    -- Update student_feedback (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_feedback') THEN
        EXECUTE 'UPDATE student_feedback 
                SET semester_id = $1 
                WHERE semester_id IS NULL' 
        USING summer_semester_id;
    END IF;
    
    -- Log migration results
    RAISE NOTICE 'Data migration completed successfully. All existing records assigned to Summer 2025 semester (ID: %)', summer_semester_id;
END $$;

-- ================================
-- PART 4: CREATE INDEXES
-- ================================

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_semesters_code ON semesters(code);
CREATE INDEX IF NOT EXISTS idx_semesters_is_current ON semesters(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_semester_scoring_semester_id ON semester_scoring_config(semester_id);

CREATE INDEX IF NOT EXISTS idx_student_check_ins_semester_id ON student_check_ins(semester_id);
CREATE INDEX IF NOT EXISTS idx_submissions_semester_id ON submissions(semester_id);
CREATE INDEX IF NOT EXISTS idx_project_votes_semester_id ON project_votes(semester_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_semester_id ON project_notes(semester_id);

-- Create conditional indexes for tables that might not exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_reviews') THEN
        CREATE INDEX IF NOT EXISTS idx_student_reviews_semester_id ON student_reviews(semester_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_attempts') THEN
        CREATE INDEX IF NOT EXISTS idx_quiz_attempts_semester_id ON quiz_attempts(semester_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_quiz_scores') THEN
        CREATE INDEX IF NOT EXISTS idx_student_quiz_scores_semester_id ON student_quiz_scores(semester_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_student_feedback_semester_id ON student_feedback(semester_id);
    END IF;
END $$;

-- ================================
-- PART 5: RLS POLICIES
-- ================================

-- Add RLS policies
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_scoring_config ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that work with service role key
DROP POLICY IF EXISTS "Allow all semester operations" ON semesters;
CREATE POLICY "Allow all semester operations" ON semesters
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all semester scoring operations" ON semester_scoring_config;
CREATE POLICY "Allow all semester scoring operations" ON semester_scoring_config
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON semesters TO authenticated;
GRANT ALL ON semester_scoring_config TO authenticated;
GRANT ALL ON semesters TO anon;
GRANT ALL ON semester_scoring_config TO anon;

-- ================================
-- PART 6: HELPER FUNCTIONS
-- ================================

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (if not exists)
DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
CREATE TRIGGER update_semesters_updated_at
    BEFORE UPDATE ON semesters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_semester_scoring_config_updated_at ON semester_scoring_config;
CREATE TRIGGER update_semester_scoring_config_updated_at
    BEFORE UPDATE ON semester_scoring_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get current semester
CREATE OR REPLACE FUNCTION get_current_semester()
RETURNS UUID AS $$
DECLARE
    current_semester_id UUID;
BEGIN
    SELECT id INTO current_semester_id
    FROM semesters
    WHERE is_current = true AND is_active = true
    LIMIT 1;
    
    RETURN current_semester_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get semester by code
CREATE OR REPLACE FUNCTION get_semester_by_code(semester_code TEXT)
RETURNS UUID AS $$
DECLARE
    semester_id UUID;
BEGIN
    SELECT id INTO semester_id
    FROM semesters
    WHERE code = semester_code AND is_active = true
    LIMIT 1;
    
    RETURN semester_id;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- PART 7: FIX FUNCTION OVERLOADING
-- ================================

-- Drop the old function (single parameter version) to fix overloading issue
DROP FUNCTION IF EXISTS get_student_points_breakdown(p_student_id text);

-- ================================
-- PART 8: UPDATED SEMESTER-AWARE FUNCTIONS
-- ================================

-- Updated function to get student points breakdown with optional semester filtering
CREATE OR REPLACE FUNCTION get_student_points_breakdown(
    p_student_id text,
    p_semester_id uuid DEFAULT NULL -- Optional semester filter, defaults to current if NULL
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
    scoring_config RECORD;
BEGIN
    -- Determine which semester to use
    IF p_semester_id IS NULL THEN
        v_semester_id := get_current_semester();
    ELSE
        v_semester_id := p_semester_id;
    END IF;
    
    -- Get scoring configuration for the semester
    SELECT * INTO scoring_config
    FROM semester_scoring_config
    WHERE semester_id = v_semester_id;
    
    -- If no specific config found, use default values
    IF scoring_config IS NULL THEN
        scoring_config.check_in_points := 10;
        scoring_config.review_points := 10;
        scoring_config.midterm_project_points := 20;
        scoring_config.final_project_points := 50;
        scoring_config.note_points := 5;
        scoring_config.vote_points := 5;
        scoring_config.bonus_points := 50;
    END IF;
    
    -- Check-in points (configured points if any check-ins exist for the semester)
    SELECT CASE WHEN COUNT(*) > 0 THEN scoring_config.check_in_points ELSE 0 END
    INTO v_check_in_points
    FROM student_check_ins
    WHERE student_check_ins.student_id = p_student_id
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
    -- Review points (configured points if any reviews exist for the semester)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_reviews') THEN
        EXECUTE 'SELECT CASE WHEN COUNT(*) > 0 THEN $1 ELSE 0 END
                FROM student_reviews
                WHERE student_reviews.student_id = $2
                    AND ($3 IS NULL OR semester_id = $3)'
        INTO v_review_points
        USING scoring_config.review_points, p_student_id, v_semester_id;
    END IF;
    
    -- Midterm project points (configured points per midterm submission for the semester)
    SELECT COALESCE(COUNT(*) * scoring_config.midterm_project_points, 0)
    INTO v_midterm_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submission_type = 'project'
        AND project_type = 'midterm'
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
    -- Final project points (configured points per final submission for the semester)
    SELECT COALESCE(COUNT(*) * scoring_config.final_project_points, 0)
    INTO v_final_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submission_type = 'project'
        AND project_type = 'final'
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
    -- Notes points (configured points per project note for the semester)
    SELECT COALESCE(COUNT(*) * scoring_config.note_points, 0)
    INTO v_notes_points
    FROM project_notes
    WHERE project_notes.student_id = p_student_id
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
    -- Voting points (configured points per vote for the semester)
    SELECT COALESCE(COUNT(*) * scoring_config.vote_points, 0)
    INTO v_voting_points
    FROM project_votes
    WHERE project_votes.student_id = p_student_id
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
    -- Quiz points (max score for the semester)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_quiz_scores') THEN
        EXECUTE 'SELECT COALESCE(MAX(student_quiz_scores.total_points), 0)
                FROM student_quiz_scores
                WHERE student_quiz_scores.student_id = $1
                    AND ($2 IS NULL OR semester_id = $2)'
        INTO v_quiz_points
        USING p_student_id, v_semester_id;
    END IF;
    
    -- Bonus points (from winning votes for the semester)
    SELECT COALESCE(SUM(submissions.bonus_points), 0)
    INTO v_bonus_points
    FROM submissions
    WHERE submissions.student_id = p_student_id
        AND submissions.bonus_points > 0
        AND (v_semester_id IS NULL OR semester_id = v_semester_id);
    
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
         v_notes_points + v_voting_points + v_quiz_points + v_bonus_points) as total_points;
END;
$$ LANGUAGE plpgsql;

-- Updated function to award vote winner bonus with semester filtering
CREATE OR REPLACE FUNCTION award_vote_winner_bonus(
    p_project_type text,
    p_semester_id uuid DEFAULT NULL -- Optional semester filter
)
RETURNS TABLE(
    submission_id bigint,
    bonus_awarded integer,
    vote_count bigint
) AS $$
DECLARE
    v_semester_id uuid;
    bonus_cutoff_date timestamp with time zone := '2025-08-26 00:00:00+00'::timestamp with time zone;
    winning_submission_id bigint;
    max_votes bigint;
BEGIN
    -- Determine which semester to use
    IF p_semester_id IS NULL THEN
        v_semester_id := get_current_semester();
    ELSE
        v_semester_id := p_semester_id;
    END IF;
    
    -- Find the submission with the most votes (only counting votes after cutoff date for the semester)
    SELECT s.id, COUNT(pv.id) as votes
    INTO winning_submission_id, max_votes
    FROM submissions s
    LEFT JOIN project_votes pv ON s.id = pv.submission_id 
        AND pv.created_at >= bonus_cutoff_date
        AND (v_semester_id IS NULL OR pv.semester_id = v_semester_id)
    WHERE s.submission_type = 'project' 
        AND s.is_public = true
        AND s.project_type = p_project_type
        AND (v_semester_id IS NULL OR s.semester_id = v_semester_id)
    GROUP BY s.id
    ORDER BY votes DESC, s.created_at ASC  -- If tie, earliest submission wins
    LIMIT 1;
    
    -- Only award bonus if there are actually votes and no bonus already awarded
    IF winning_submission_id IS NOT NULL AND max_votes > 0 THEN
        -- Check if bonus already awarded for this submission
        IF NOT EXISTS (
            SELECT 1 FROM submissions 
            WHERE id = winning_submission_id 
            AND bonus_points > 0
        ) THEN
            -- Award the bonus
            UPDATE submissions 
            SET bonus_points = 50,
                bonus_awarded_date = now()
            WHERE id = winning_submission_id;
            
            RETURN QUERY SELECT winning_submission_id, 50, max_votes;
        END IF;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get semester leaderboard
CREATE OR REPLACE FUNCTION get_semester_leaderboard(p_semester_id uuid DEFAULT NULL)
RETURNS TABLE(
    student_id text,
    full_name text,
    total_points integer,
    check_in_points integer,
    review_points integer,
    midterm_project_points integer,
    final_project_points integer,
    project_notes_points integer,
    voting_points integer,
    quiz_points integer,
    bonus_points integer,
    rank_position bigint
) AS $$
DECLARE
    v_semester_id uuid;
BEGIN
    -- Determine which semester to use
    IF p_semester_id IS NULL THEN
        v_semester_id := get_current_semester();
    ELSE
        v_semester_id := p_semester_id;
    END IF;
    
    RETURN QUERY
    SELECT 
        s.student_id,
        s.full_name,
        pb.total_points,
        pb.check_in_points,
        pb.review_points,
        pb.midterm_project_points,
        pb.final_project_points,
        pb.project_notes_points,
        pb.voting_points,
        pb.quiz_points,
        pb.bonus_points,
        ROW_NUMBER() OVER (ORDER BY pb.total_points DESC, s.created_at ASC) as rank_position
    FROM students s
    CROSS JOIN LATERAL get_student_points_breakdown(s.student_id, v_semester_id) pb
    ORDER BY pb.total_points DESC, s.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- PART 9: ADD COMMENTS
-- ================================

-- Add comments
COMMENT ON TABLE semesters IS 'Stores semester information with date ranges and current semester tracking';
COMMENT ON TABLE semester_scoring_config IS 'Configurable point values per semester for different activities';
COMMENT ON FUNCTION get_current_semester() IS 'Returns the UUID of the current active semester';
COMMENT ON FUNCTION get_semester_by_code(TEXT) IS 'Returns the UUID of a semester by its code';
COMMENT ON FUNCTION get_student_points_breakdown(text, uuid) IS 'Gets student points breakdown for a specific semester (defaults to current)';
COMMENT ON FUNCTION award_vote_winner_bonus(text, uuid) IS 'Awards bonus points to vote winner for specific semester and project type';
COMMENT ON FUNCTION get_semester_leaderboard(uuid) IS 'Gets leaderboard for a specific semester (defaults to current)';

-- ================================
-- PART 10: UPDATE PROJECT CONSTRAINTS
-- ================================

-- Drop the old constraint that only considered student_id and project_type
DROP INDEX IF EXISTS idx_unique_student_project_type;

-- Create new constraint that includes semester_id
-- This allows each student to submit one midterm and one final project PER SEMESTER
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_project_type_per_semester 
ON submissions(student_id, project_type, semester_id) 
WHERE submission_type = 'project' AND project_type IS NOT NULL;

-- Add comment to document the updated constraint purpose
COMMENT ON INDEX idx_unique_student_project_type_per_semester IS 
'Ensures each student can only submit one midterm and one final project per semester';

-- Migration completed successfully
SELECT 'Complete semester support migration completed successfully!' as migration_status;