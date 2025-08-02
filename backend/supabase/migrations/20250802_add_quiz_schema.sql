-- Quiz System Schema for Learnify
-- Implements quiz functionality as described in PRD.md

-- Quizzes table
CREATE TABLE quizzes (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL,
    description text,
    time_limit_minutes integer DEFAULT 25,
    total_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Questions table
CREATE TABLE questions (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    quiz_id bigint REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type text DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'code')),
    code_snippet text, -- For code-based questions
    correct_answer integer NOT NULL, -- Index of correct answer (0-based)
    points integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Question options/choices table
CREATE TABLE question_options (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    question_id bigint REFERENCES questions(id) ON DELETE CASCADE,
    option_text text NOT NULL,
    option_index integer NOT NULL, -- 0-based index for the option
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    quiz_id bigint REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id text NOT NULL, -- References students.student_id
    student_uuid uuid REFERENCES students(id),
    score integer DEFAULT 0,
    total_possible_points integer DEFAULT 0,
    percentage decimal(5,2) DEFAULT 0.00,
    time_taken_minutes integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    is_completed boolean DEFAULT false
);

-- Student answers table
CREATE TABLE quiz_answers (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    attempt_id bigint REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id bigint REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer integer NOT NULL, -- Index of selected answer (0-based)
    is_correct boolean DEFAULT false,
    points_earned integer DEFAULT 0,
    answered_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id, sort_order);
CREATE INDEX idx_question_options_question_id ON question_options(question_id, option_index);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id, created_at DESC);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id, created_at DESC);
CREATE INDEX idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);

-- Update quiz total_points when questions are added/updated
CREATE OR REPLACE FUNCTION update_quiz_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quizzes 
    SET total_points = (
        SELECT COALESCE(SUM(points), 0) 
        FROM questions 
        WHERE quiz_id = COALESCE(NEW.quiz_id, OLD.quiz_id)
    ),
    updated_at = now()
    WHERE id = COALESCE(NEW.quiz_id, OLD.quiz_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quiz total points
CREATE TRIGGER trigger_update_quiz_total_points
    AFTER INSERT OR UPDATE OR DELETE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_total_points();

-- Function to calculate quiz attempt percentage and completion
CREATE OR REPLACE FUNCTION update_quiz_attempt_results()
RETURNS TRIGGER AS $$
DECLARE
    total_points_earned integer;
    total_possible integer;
    calculated_percentage decimal(5,2);
BEGIN
    -- Calculate total points earned
    SELECT COALESCE(SUM(points_earned), 0) INTO total_points_earned
    FROM quiz_answers
    WHERE attempt_id = NEW.attempt_id;
    
    -- Get total possible points
    SELECT COALESCE(total_points, 0) INTO total_possible
    FROM quizzes q
    JOIN quiz_attempts qa ON qa.quiz_id = q.id
    WHERE qa.id = NEW.attempt_id;
    
    -- Calculate percentage
    IF total_possible > 0 THEN
        calculated_percentage := (total_points_earned::decimal / total_possible::decimal) * 100;
    ELSE
        calculated_percentage := 0;
    END IF;
    
    -- Update the quiz attempt
    UPDATE quiz_attempts
    SET 
        score = total_points_earned,
        total_possible_points = total_possible,
        percentage = calculated_percentage
    WHERE id = NEW.attempt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quiz attempt results when answers are inserted/updated
CREATE TRIGGER trigger_update_quiz_attempt_results
    AFTER INSERT OR UPDATE ON quiz_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_attempt_results();