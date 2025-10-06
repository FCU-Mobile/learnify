-- Fix teacher rating constraint to allow up to 50 for Project 2 (Final)
-- Project 1 (Midterm): 0-40
-- Project 2 (Final): 0-50

-- Drop old constraint
ALTER TABLE project_ratings
DROP CONSTRAINT IF EXISTS project_ratings_teacher_rating_check;

-- Add new constraint that allows 0-50
ALTER TABLE project_ratings
ADD CONSTRAINT project_ratings_teacher_rating_check
CHECK (teacher_rating >= 0 AND teacher_rating <= 50);

COMMENT ON CONSTRAINT project_ratings_teacher_rating_check ON project_ratings IS 'Teacher rating: 0-40 for Project 1 (Midterm), 0-50 for Project 2 (Final)';
