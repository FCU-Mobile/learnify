-- Add rating system tables for teacher and student ratings
-- Migration: 20251218_add_rating_system_tables.sql
-- Description: Create tables for teacher ratings, student star ratings, and voting results

-- ============================================================================
-- PART 1: Create project_ratings table for teacher ratings (0-20%)
-- ============================================================================

CREATE TABLE project_ratings (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    project_number INTEGER NOT NULL CHECK (project_number IN (1, 2, 3)),
    teacher_rating DECIMAL(4,2) CHECK (teacher_rating >= 0 AND teacher_rating <= 20),
    teacher_id TEXT NOT NULL,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one teacher rating per team per project per semester
    CONSTRAINT unique_teacher_rating_per_team_project 
        UNIQUE (team_id, project_number, semester_id)
);

-- Indexes for performance
CREATE INDEX idx_project_ratings_team_project ON project_ratings(team_id, project_number);
CREATE INDEX idx_project_ratings_semester ON project_ratings(semester_id);
CREATE INDEX idx_project_ratings_teacher ON project_ratings(teacher_id);

-- ============================================================================
-- PART 2: Create project_star_ratings table for student peer ratings (1-5 stars)
-- ============================================================================

CREATE TABLE project_star_ratings (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    project_number INTEGER NOT NULL CHECK (project_number IN (1, 2, 3)),
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    voter_id TEXT NOT NULL,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one vote per student per team per project per semester
    CONSTRAINT unique_vote_per_student_team_project
        UNIQUE (team_id, project_number, voter_id, semester_id)
);

-- Indexes for performance
CREATE INDEX idx_project_star_ratings_team_project ON project_star_ratings(team_id, project_number);
CREATE INDEX idx_project_star_ratings_semester ON project_star_ratings(semester_id);
CREATE INDEX idx_project_star_ratings_voter ON project_star_ratings(voter_id);

-- ============================================================================  
-- PART 3: Create project_voting_results table for calculated scores
-- ============================================================================

CREATE TABLE project_voting_results (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    project_number INTEGER NOT NULL CHECK (project_number IN (1, 2, 3)),
    total_stars INTEGER NOT NULL DEFAULT 0,
    voting_score DECIMAL(4,2) NOT NULL DEFAULT 0 CHECK (voting_score >= 0 AND voting_score <= 10),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    calculated_by TEXT NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure one result per team per project per semester
    CONSTRAINT unique_voting_result_per_team_project
        UNIQUE (team_id, project_number, semester_id)
);

-- Indexes for performance  
CREATE INDEX idx_project_voting_results_team_project ON project_voting_results(team_id, project_number);
CREATE INDEX idx_project_voting_results_semester ON project_voting_results(semester_id);
CREATE INDEX idx_project_voting_results_score ON project_voting_results(voting_score DESC);

-- ============================================================================
-- PART 4: Add RLS policies for security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE project_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_star_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_voting_results ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read ratings (for transparency)
CREATE POLICY "Allow authenticated users to view teacher ratings" ON project_ratings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to view star ratings" ON project_star_ratings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to view voting results" ON project_voting_results
    FOR SELECT USING (true);

-- Only allow admins to insert/update teacher ratings
CREATE POLICY "Allow admin to manage teacher ratings" ON project_ratings
    FOR ALL USING (true);

-- Allow students to insert their own star ratings (update handled by unique constraint)
CREATE POLICY "Allow students to submit star ratings" ON project_star_ratings
    FOR INSERT WITH CHECK (true);

-- Only allow admins to manage voting results
CREATE POLICY "Allow admin to manage voting results" ON project_voting_results
    FOR ALL USING (true);

-- ============================================================================
-- PART 5: Add triggers for updated_at timestamp
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for project_ratings
CREATE TRIGGER update_project_ratings_updated_at
    BEFORE UPDATE ON project_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant permissions to authenticated role
GRANT SELECT ON project_ratings TO authenticated;
GRANT SELECT ON project_star_ratings TO authenticated;
GRANT SELECT ON project_voting_results TO authenticated;

-- Grant full access for API operations (restrict in production)
GRANT ALL ON project_ratings TO authenticated;
GRANT ALL ON project_star_ratings TO authenticated;
GRANT ALL ON project_voting_results TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON SEQUENCE project_ratings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_star_ratings_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_voting_results_id_seq TO authenticated;

-- ============================================================================
-- PART 7: Comments for documentation
-- ============================================================================

COMMENT ON TABLE project_ratings IS 'Teacher ratings for team projects (0-20% scale)';
COMMENT ON TABLE project_star_ratings IS 'Student peer ratings for team projects (1-5 stars)';
COMMENT ON TABLE project_voting_results IS 'Calculated voting scores based on star ratings (1st=10%, 2nd=8%, 3rd=6%)';

COMMENT ON COLUMN project_ratings.teacher_rating IS 'Teacher rating from 0 to 20 percent';
COMMENT ON COLUMN project_star_ratings.stars IS 'Student star rating from 1 to 5 stars';
COMMENT ON COLUMN project_voting_results.voting_score IS 'Calculated voting score (1st=10%, 2nd=8%, 3rd=6%)';

DO $$
BEGIN
    RAISE NOTICE '✅ Rating system tables created successfully!';
    RAISE NOTICE 'Tables: project_ratings, project_star_ratings, project_voting_results';
    RAISE NOTICE 'Teacher ratings: 0-20%% scale with unique constraint per team/project';
    RAISE NOTICE 'Student ratings: 1-5 stars with unique constraint per voter/team/project';
    RAISE NOTICE 'Voting results: Calculated scores with ranking system (10%%, 8%%, 6%%)';
    RAISE NOTICE 'RLS policies: Read access for all, write access controlled by role';
END $$;