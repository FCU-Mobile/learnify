-- Migration: Add semester_id support to quiz_questions and fix student_quiz_attempts
-- Date: 2025-12-28
-- Purpose: Enable semester-specific quiz questions

-- Step 1: Add semester_id column to quiz_questions table
ALTER TABLE quiz_questions
ADD COLUMN semester_id UUID REFERENCES semesters(id);

CREATE INDEX idx_quiz_questions_semester_id ON quiz_questions(semester_id);

-- Step 2: Migrate existing 20 questions to Summer 2025 semester
DO $$
DECLARE
    summer_semester_id UUID;
BEGIN
    SELECT id INTO summer_semester_id FROM semesters WHERE code = 'summer_2025';

    IF summer_semester_id IS NOT NULL THEN
        UPDATE quiz_questions SET semester_id = summer_semester_id WHERE semester_id IS NULL;
        RAISE NOTICE '✅ Migrated % questions to Summer 2025', (SELECT COUNT(*) FROM quiz_questions WHERE semester_id = summer_semester_id);
    ELSE
        RAISE WARNING '⚠️ Summer 2025 semester not found';
    END IF;
END $$;

-- Step 3: Set NOT NULL constraint on semester_id
ALTER TABLE quiz_questions ALTER COLUMN semester_id SET NOT NULL;

-- Step 4: Fix migration bug - add semester_id to student_quiz_attempts table
-- The 20250909_complete_semester_support.sql migration tried to add this to wrong table name
ALTER TABLE student_quiz_attempts
ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id);

CREATE INDEX IF NOT EXISTS idx_student_quiz_attempts_semester_id ON student_quiz_attempts(semester_id);

-- Step 5: Migrate student_quiz_attempts to correct semester based on their question's semester
DO $$
BEGIN
    UPDATE student_quiz_attempts sqa
    SET semester_id = qq.semester_id
    FROM quiz_questions qq
    WHERE sqa.question_id = qq.id AND sqa.semester_id IS NULL;

    RAISE NOTICE '✅ Updated student_quiz_attempts with semester_id based on question semester';
END $$;

-- Step 6: Set NOT NULL constraint on student_quiz_attempts.semester_id
ALTER TABLE student_quiz_attempts ALTER COLUMN semester_id SET NOT NULL;

-- Step 7: Update the trigger function to handle semester_id in scoring
DROP TRIGGER IF EXISTS trigger_update_student_quiz_scores ON student_quiz_attempts;
DROP FUNCTION IF EXISTS update_student_quiz_scores();

CREATE OR REPLACE FUNCTION update_student_quiz_scores()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO student_quiz_scores (
        student_id, student_uuid, semester_id,
        total_questions_attempted, total_correct_answers, total_points, last_quiz_date
    ) VALUES (
        NEW.student_id, NEW.student_uuid, NEW.semester_id,
        1, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END, NEW.points_earned, NEW.created_at
    )
    ON CONFLICT (student_id, semester_id)
    DO UPDATE SET
        total_questions_attempted = student_quiz_scores.total_questions_attempted + 1,
        total_correct_answers = student_quiz_scores.total_correct_answers +
            CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        total_points = student_quiz_scores.total_points + NEW.points_earned,
        last_quiz_date = NEW.created_at,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_quiz_scores
    AFTER INSERT ON student_quiz_attempts
    FOR EACH ROW EXECUTE FUNCTION update_student_quiz_scores();

-- Step 8: Update unique constraint on student_quiz_scores to include semester_id
ALTER TABLE student_quiz_scores DROP CONSTRAINT IF EXISTS student_quiz_scores_student_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'student_quiz_scores'
        AND constraint_name LIKE 'idx_student_quiz_scores_student_semester%'
    ) THEN
        CREATE UNIQUE INDEX idx_student_quiz_scores_student_semester
        ON student_quiz_scores(student_id, semester_id);
    END IF;
END $$;

-- Summary of changes (logged via migration system)
