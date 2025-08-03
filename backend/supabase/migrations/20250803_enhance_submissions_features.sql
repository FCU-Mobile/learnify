-- Enhance submissions table with project tags and additional features
-- Support for midterm/final project submissions, feedback system, and voting

-- Add project tags to submissions table
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS project_type text CHECK (project_type IN ('midterm', 'final', 'regular')) DEFAULT 'regular');
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_project boolean DEFAULT false;

-- Create submission_feedback table for private feedback after presentations
CREATE TABLE IF NOT EXISTS submission_feedback (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    submission_id bigint NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    reviewer_student_id text NOT NULL,
    reviewer_student_uuid uuid REFERENCES students(id),
    feedback_text text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    is_private boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create submission_votes table for voting on best projects
CREATE TABLE IF NOT EXISTS submission_votes (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    submission_id bigint NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    voter_student_id text NOT NULL,
    voter_student_uuid uuid REFERENCES students(id),
    vote_type text NOT NULL CHECK (vote_type IN ('best_project', 'most_creative', 'best_presentation')) DEFAULT 'best_project',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- Ensure one vote per student per submission per vote type
    UNIQUE(submission_id, voter_student_id, vote_type)
);

-- Create submission_scores table for tracking vote-based scoring
CREATE TABLE IF NOT EXISTS submission_scores (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    submission_id bigint NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    student_id text NOT NULL,
    student_uuid uuid REFERENCES students(id),
    vote_score integer DEFAULT 0, -- Points from winning votes
    feedback_count integer DEFAULT 0,
    average_rating decimal(3,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- Ensure one score record per submission
    UNIQUE(submission_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_tags ON submissions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_submissions_project_type ON submissions(project_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_is_project ON submissions(is_project, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_feedback_submission_id ON submission_feedback(submission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_feedback_reviewer ON submission_feedback(reviewer_student_id);

CREATE INDEX IF NOT EXISTS idx_submission_votes_submission_id ON submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_votes_voter ON submission_votes(voter_student_id);
CREATE INDEX IF NOT EXISTS idx_submission_votes_type ON submission_votes(vote_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_scores_student ON submission_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_submission_scores_vote_score ON submission_scores(vote_score DESC);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_submission_feedback_updated_at
    BEFORE UPDATE ON submission_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_votes_updated_at
    BEFORE UPDATE ON submission_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_scores_updated_at
    BEFORE UPDATE ON submission_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update submission scores based on votes and feedback
CREATE OR REPLACE FUNCTION update_submission_scores(submission_id_param bigint)
RETURNS void AS $$
DECLARE
    vote_count integer;
    feedback_avg decimal(3,2);
    feedback_cnt integer;
    target_student_id text;
    target_student_uuid uuid;
BEGIN
    -- Get submission owner
    SELECT student_id, student_uuid INTO target_student_id, target_student_uuid
    FROM submissions 
    WHERE id = submission_id_param;
    
    -- Count votes for this submission
    SELECT COUNT(*) INTO vote_count 
    FROM submission_votes 
    WHERE submission_id = submission_id_param;
    
    -- Calculate average rating and feedback count
    SELECT COALESCE(AVG(rating), 0), COUNT(*) INTO feedback_avg, feedback_cnt
    FROM submission_feedback 
    WHERE submission_id = submission_id_param AND rating IS NOT NULL;
    
    -- Upsert submission score
    INSERT INTO submission_scores (submission_id, student_id, student_uuid, vote_score, feedback_count, average_rating)
    VALUES (submission_id_param, target_student_id, target_student_uuid, vote_count * 10, feedback_cnt, feedback_avg)
    ON CONFLICT (submission_id)
    DO UPDATE SET
        vote_score = vote_count * 10,
        feedback_count = feedback_cnt,
        average_rating = feedback_avg,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update scores when votes change
CREATE OR REPLACE FUNCTION trigger_update_submission_scores()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_submission_scores(NEW.submission_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_submission_scores(OLD.submission_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic score updates
CREATE TRIGGER trigger_votes_update_scores
    AFTER INSERT OR UPDATE OR DELETE ON submission_votes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_submission_scores();

CREATE TRIGGER trigger_feedback_update_scores
    AFTER INSERT OR UPDATE OR DELETE ON submission_feedback
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_submission_scores();

-- Create views for easy querying
CREATE OR REPLACE VIEW submission_with_scores AS
SELECT 
    s.*,
    st.full_name as student_name,
    COALESCE(ss.vote_score, 0) as vote_score,
    COALESCE(ss.feedback_count, 0) as feedback_count,
    COALESCE(ss.average_rating, 0) as average_rating,
    (SELECT COUNT(*) FROM submission_votes sv WHERE sv.submission_id = s.id) as total_votes
FROM submissions s
LEFT JOIN students st ON s.student_uuid = st.id
LEFT JOIN submission_scores ss ON s.id = ss.submission_id;

-- View for project submissions only (midterm/final)
CREATE OR REPLACE VIEW project_submissions AS 
SELECT * FROM submission_with_scores 
WHERE is_project = true 
ORDER BY created_at DESC;

-- View for leaderboard based on submission scores
CREATE OR REPLACE VIEW submission_leaderboard AS
SELECT 
    student_id,
    student_name,
    SUM(vote_score) as total_vote_score,
    SUM(feedback_count) as total_feedback_received,
    AVG(average_rating) as overall_rating,
    COUNT(*) as total_submissions
FROM submission_with_scores
WHERE is_project = true
GROUP BY student_id, student_name
ORDER BY total_vote_score DESC, overall_rating DESC;