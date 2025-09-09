-- Consolidated Fall 2025 Semester Setup
-- Migration: 20250916_consolidated_fall_semester_setup.sql
-- Description: Complete Fall 2025 semester configuration including scoring, lessons support, and updated lesson plan
-- Merged from: 20250913_fall_semester_complete_setup.sql, 20250914_add_semester_support_to_lessons.sql, 20250915_update_fall_lesson_plan.sql

-- ============================================================================
-- PART 1: Fall 2025 Semester Scoring Configuration
-- ============================================================================

-- Update Fall 2025 semester scoring configuration
-- New scoring: 10% Quiz, 30% for each of 3 projects (90% total)
UPDATE semester_scoring_config 
SET 
    check_in_points = 0,        -- No check-in points for Fall
    review_points = 0,          -- No review points for Fall  
    midterm_project_points = 30, -- First project: 30%
    final_project_points = 30,   -- Second project: 30%
    note_points = 30,           -- Third project: 30% (reusing note_points for third project)
    vote_points = 0,            -- No voting points for Fall
    bonus_points = 0,           -- No bonus points for Fall
    -- Quiz points will be calculated as 10% (handled in application logic)
    updated_at = NOW()
WHERE semester_id = (
    SELECT id FROM semesters WHERE code = 'fall_2025'
);

-- ============================================================================
-- PART 2: Project 3 Support
-- ============================================================================

-- Update the existing constraint to also allow 'project3' type for Fall semester
DROP INDEX IF EXISTS idx_unique_student_project_type_per_semester;

-- Create updated constraint that allows midterm, final, and project3 types per semester
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_project_type_per_semester 
ON submissions(student_id, project_type, semester_id) 
WHERE submission_type = 'project' AND project_type IS NOT NULL;

-- ============================================================================
-- PART 3: Update Points Calculation Function
-- ============================================================================

-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS get_student_points_breakdown(text);
DROP FUNCTION IF EXISTS get_student_points_breakdown(text, uuid);

-- Update the points breakdown function to handle project3 submissions
-- project3 submissions will contribute to the note_points field (30% for Fall semester)
CREATE OR REPLACE FUNCTION get_student_points_breakdown(
    p_student_id text,
    p_semester_id uuid DEFAULT NULL
)
RETURNS TABLE(
    student_id text,
    check_ins integer,
    reviews integer,
    quiz_attempts integer,
    quiz_points numeric,
    midterm_submissions integer,
    midterm_points numeric,
    final_submissions integer,
    final_points numeric,
    note_submissions integer,
    note_points numeric,
    vote_submissions integer,
    vote_points numeric,
    bonus_points numeric,
    total_points numeric,
    semester_code text,
    semester_name text
) 
LANGUAGE plpgsql 
AS $$
DECLARE
    current_semester_id uuid;
    scoring_config record;
BEGIN
    -- Determine which semester to use
    IF p_semester_id IS NOT NULL THEN
        current_semester_id := p_semester_id;
    ELSE
        -- Get current active semester (default to Summer 2025 for backward compatibility)
        SELECT id INTO current_semester_id 
        FROM semesters 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Fallback to Summer 2025 if no active semester
        IF current_semester_id IS NULL THEN
            SELECT id INTO current_semester_id 
            FROM semesters 
            WHERE code = 'summer_2025'
            LIMIT 1;
        END IF;
    END IF;

    -- Get semester scoring configuration
    SELECT * INTO scoring_config
    FROM semester_scoring_config ssc
    JOIN semesters s ON s.id = ssc.semester_id
    WHERE ssc.semester_id = current_semester_id;

    -- If no scoring config found, use default Summer 2025 config
    IF scoring_config IS NULL THEN
        SELECT ssc.*, s.code, s.name INTO scoring_config
        FROM semester_scoring_config ssc
        JOIN semesters s ON s.id = ssc.semester_id
        WHERE s.code = 'summer_2025'
        LIMIT 1;
    END IF;

    RETURN QUERY
    WITH student_stats AS (
        SELECT
            -- Check-ins
            (SELECT COUNT(*) 
             FROM student_check_ins sci 
             WHERE sci.student_id = p_student_id 
             AND sci.semester_id = current_semester_id
            )::integer as check_in_count,
            
            -- Reviews  
            (SELECT COUNT(*) 
             FROM reviews r 
             WHERE r.student_id = p_student_id 
             AND r.semester_id = current_semester_id
            )::integer as review_count,
            
            -- Quiz attempts and points
            (SELECT COUNT(*) 
             FROM quiz_attempts qa 
             WHERE qa.student_id = p_student_id 
             AND qa.semester_id = current_semester_id
            )::integer as quiz_attempt_count,
            
            (SELECT COALESCE(SUM(qa.points_earned), 0) 
             FROM quiz_attempts qa 
             WHERE qa.student_id = p_student_id 
             AND qa.semester_id = current_semester_id
            )::numeric as quiz_total_points,
            
            -- Midterm project submissions
            (SELECT COUNT(*) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND s.submission_type = 'project' 
             AND s.project_type = 'midterm'
             AND s.semester_id = current_semester_id
            )::integer as midterm_count,
            
            (SELECT COALESCE(SUM(s.points), 0) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND s.submission_type = 'project' 
             AND s.project_type = 'midterm'
             AND s.semester_id = current_semester_id
            )::numeric as midterm_total_points,
            
            -- Final project submissions
            (SELECT COUNT(*) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND s.submission_type = 'project' 
             AND s.project_type = 'final'
             AND s.semester_id = current_semester_id
            )::integer as final_count,
            
            (SELECT COALESCE(SUM(s.points), 0) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND s.submission_type = 'project' 
             AND s.project_type = 'final'
             AND s.semester_id = current_semester_id
            )::numeric as final_total_points,
            
            -- Note submissions (Project 3 for Fall semester)
            (SELECT COUNT(*) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND (
                 (s.submission_type = 'note' AND scoring_config.code = 'summer_2025') OR
                 (s.submission_type = 'project' AND s.project_type = 'project3' AND scoring_config.code = 'fall_2025')
             )
             AND s.semester_id = current_semester_id
            )::integer as note_count,
            
            (SELECT COALESCE(SUM(s.points), 0) 
             FROM submissions s 
             WHERE s.student_id = p_student_id 
             AND (
                 (s.submission_type = 'note' AND scoring_config.code = 'summer_2025') OR
                 (s.submission_type = 'project' AND s.project_type = 'project3' AND scoring_config.code = 'fall_2025')
             )
             AND s.semester_id = current_semester_id
            )::numeric as note_total_points,
            
            -- Vote submissions
            (SELECT COUNT(*) 
             FROM project_votes pv 
             WHERE pv.voter_student_id = p_student_id 
             AND pv.semester_id = current_semester_id
            )::integer as vote_count,
            
            (SELECT COALESCE(SUM(pv.points), 0) 
             FROM project_votes pv 
             WHERE pv.voter_student_id = p_student_id 
             AND pv.semester_id = current_semester_id
            )::numeric as vote_total_points,
            
            -- Bonus points
            (SELECT COALESCE(SUM(a.points), 0) 
             FROM awards a 
             WHERE a.student_id = p_student_id 
             AND a.semester_id = current_semester_id
            )::numeric as bonus_total_points
    )
    SELECT 
        p_student_id,
        ss.check_in_count,
        ss.review_count,
        ss.quiz_attempt_count,
        ss.quiz_total_points,
        ss.midterm_count,
        ss.midterm_total_points,
        ss.final_count,
        ss.final_total_points,
        ss.note_count,
        ss.note_total_points,
        ss.vote_count,
        ss.vote_total_points,
        ss.bonus_total_points,
        (
            (ss.check_in_count * scoring_config.check_in_points) +
            (ss.review_count * scoring_config.review_points) +
            ss.quiz_total_points +
            ss.midterm_total_points +
            ss.final_total_points +
            ss.note_total_points +
            ss.vote_total_points +
            ss.bonus_total_points
        )::numeric as calculated_total_points,
        scoring_config.code,
        scoring_config.name
    FROM student_stats ss;
END;
$$;

-- ============================================================================
-- PART 4: Semester Support for Lessons
-- ============================================================================

-- Add semester_id column to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES semesters(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lessons_semester_id ON lessons(semester_id);

-- Set existing lessons to Summer 2025 semester (backward compatibility)
UPDATE lessons 
SET semester_id = (
    SELECT id FROM semesters WHERE code = 'summer_2025' LIMIT 1
)
WHERE semester_id IS NULL;

-- Add comment to document semester-specific lessons
COMMENT ON COLUMN lessons.semester_id IS 
'Foreign key to semesters table. Lessons can be semester-specific for different curricula.';

-- ============================================================================
-- PART 5: Fall 2025 Lesson Plan (Sep 9, 2025 - Jan 6, 2026)
-- ============================================================================

DO $$
DECLARE
    fall_semester_id uuid;
BEGIN
    -- Get Fall 2025 semester ID
    SELECT id INTO fall_semester_id FROM semesters WHERE code = 'fall_2025';
    
    IF fall_semester_id IS NOT NULL THEN
        -- Clear existing Fall semester lessons
        DELETE FROM lesson_plan_items WHERE lesson_id IN (
            SELECT id FROM lessons WHERE semester_id = fall_semester_id
        );
        DELETE FROM lessons WHERE semester_id = fall_semester_id;
        
        -- Insert new Fall semester lessons with complete schedule
        INSERT INTO lessons (
            lesson_number, 
            name, 
            description, 
            scheduled_date, 
            status, 
            topic_name, 
            icon, 
            color, 
            button_color, 
            semester_id,
            lesson_content
        ) VALUES 
        
        -- Session 1: NameCard
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 1 FROM lessons), 
            'Session 1: NameCard - Layout & GitFlow',
            'Introduction to advanced SwiftUI layout techniques and Git workflow management for professional development.',
            '2025-09-09',
            'normal',
            'NameCard Development',
            'fas fa-id-card',
            'from-blue-500 to-indigo-600',
            'text-blue-600 hover:text-blue-700',
            fall_semester_id,
            ARRAY[
                'Advanced Layout Techniques',
                'GitFlow Best Practices',
                'Complex Component Architecture',
                'Professional Development Workflow'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 2 FROM lessons), 
            'Session 1 (cont): SwiftData & SwiftCharts',
            'Deep dive into SwiftData for persistent storage and SwiftCharts for data visualization.',
            '2025-09-16',
            'normal',
            'Data & Visualization',
            'fas fa-database',
            'from-green-500 to-teal-600',
            'text-green-600 hover:text-green-700',
            fall_semester_id,
            ARRAY[
                'SwiftData Implementation',
                'SwiftCharts Integration',
                'Data Persistence Patterns',
                'Visual Data Representation'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 3 FROM lessons), 
            'Session 1 (cont): Widgets & UIViewRepresentable',
            'Creating home screen widgets and integrating UIKit components through UIViewRepresentable.',
            '2025-09-23',
            'normal',
            'Widgets & UIKit Integration',
            'fas fa-puzzle-piece',
            'from-purple-500 to-pink-600',
            'text-purple-600 hover:text-purple-700',
            fall_semester_id,
            ARRAY[
                'Home Screen Widgets',
                'UIViewRepresentable Bridge',
                'UIKit Integration Patterns',
                'Cross-Platform Components'
            ]
        ),
        
        -- Session 2: IdeaBox
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 4 FROM lessons), 
            'Session 2: IdeaBox - CloudKit & SPM',
            'Building cloud-synchronized applications with CloudKit and managing dependencies through Swift Package Manager.',
            '2025-09-30',
            'normal',
            'IdeaBox Development',
            'fas fa-cloud',
            'from-cyan-500 to-blue-600',
            'text-cyan-600 hover:text-cyan-700',
            fall_semester_id,
            ARRAY[
                'CloudKit Integration',
                'Swift Package Manager',
                'Cloud Data Synchronization',
                'Dependency Management'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 5 FROM lessons), 
            'Session 2 (cont): Pointfree Dependencies & Navigation',
            'Advanced dependency injection and navigation patterns using Pointfree libraries.',
            '2025-10-07',
            'normal',
            'Architecture & Navigation',
            'fas fa-sitemap',
            'from-orange-500 to-red-600',
            'text-orange-600 hover:text-orange-700',
            fall_semester_id,
            ARRAY[
                'Pointfree Dependencies',
                'Pointfree Navigation',
                'Advanced Architecture Patterns',
                'Dependency Injection'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 6 FROM lessons), 
            'Session 2 (cont): FocusState & Notifications',
            'Managing focus states for accessibility and implementing local and push notifications.',
            '2025-10-14',
            'normal',
            'Focus & Notifications',
            'fas fa-bell',
            'from-yellow-500 to-orange-600',
            'text-yellow-600 hover:text-yellow-700',
            fall_semester_id,
            ARRAY[
                'FocusState Management',
                'Local Notifications',
                'Push Notifications',
                'Accessibility Focus'
            ]
        ),
        
        -- Session 3: Expenses
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 7 FROM lessons), 
            'Session 3: Expenses - Architecture & TCA',
            'Building scalable applications with The Composable Architecture (TCA) pattern.',
            '2025-10-21',
            'normal',
            'Expenses Development',
            'fas fa-coins',
            'from-emerald-500 to-green-600',
            'text-emerald-600 hover:text-emerald-700',
            fall_semester_id,
            ARRAY[
                'Application Architecture',
                'The Composable Architecture',
                'State Management',
                'Scalable App Design'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 8 FROM lessons), 
            'Session 3 (cont): Foundation Models & TextEditor',
            'Integrating AI foundation models and advanced text editing capabilities.',
            '2025-10-28',
            'normal',
            'AI & Text Processing',
            'fas fa-robot',
            'from-indigo-500 to-purple-600',
            'text-indigo-600 hover:text-indigo-700',
            fall_semester_id,
            ARRAY[
                'Foundation Models Integration',
                'Advanced TextEditor',
                'AI-Powered Features',
                'Natural Language Processing'
            ]
        ),
        
        -- Additional sessions to complete the semester
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 9 FROM lessons), 
            'Advanced SwiftUI Animations',
            'Creating sophisticated animations and transitions for professional user experiences.',
            '2025-11-04',
            'normal',
            'Advanced Animations',
            'fas fa-magic',
            'from-pink-500 to-purple-600',
            'text-pink-600 hover:text-pink-700',
            fall_semester_id,
            ARRAY[
                'Complex Animation Sequences',
                'Custom Transitions',
                'Interactive Animations',
                'Performance Optimization'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 10 FROM lessons), 
            'Testing & Quality Assurance',
            'Comprehensive testing strategies including unit tests, UI tests, and continuous integration.',
            '2025-11-11',
            'normal',
            'Testing & QA',
            'fas fa-vial',
            'from-teal-500 to-cyan-600',
            'text-teal-600 hover:text-teal-700',
            fall_semester_id,
            ARRAY[
                'Unit Testing Strategies',
                'UI Testing with XCTest',
                'Continuous Integration',
                'Code Quality Metrics'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 11 FROM lessons), 
            'Performance Optimization',
            'Advanced techniques for optimizing app performance, memory management, and battery usage.',
            '2025-11-18',
            'normal',
            'Performance & Optimization',
            'fas fa-tachometer-alt',
            'from-red-500 to-pink-600',
            'text-red-600 hover:text-red-700',
            fall_semester_id,
            ARRAY[
                'Memory Management',
                'CPU Optimization',
                'Battery Usage Optimization',
                'Performance Profiling'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 12 FROM lessons), 
            'Security & Privacy',
            'Implementing security best practices, data protection, and privacy compliance.',
            '2025-11-25',
            'normal',
            'Security & Privacy',
            'fas fa-shield-alt',
            'from-gray-600 to-gray-800',
            'text-gray-600 hover:text-gray-700',
            fall_semester_id,
            ARRAY[
                'Data Encryption',
                'Keychain Services',
                'Privacy Compliance',
                'Security Best Practices'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 13 FROM lessons), 
            'App Store Optimization',
            'Preparing apps for App Store submission, metadata optimization, and marketing strategies.',
            '2025-12-02',
            'normal',
            'App Store & Marketing',
            'fas fa-store',
            'from-blue-600 to-indigo-700',
            'text-blue-600 hover:text-blue-700',
            fall_semester_id,
            ARRAY[
                'App Store Guidelines',
                'Metadata Optimization',
                'Screenshot Design',
                'Marketing Strategies'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 14 FROM lessons), 
            'Advanced Architecture Patterns',
            'Exploring MVVM, VIPER, and other advanced architectural patterns for complex applications.',
            '2025-12-09',
            'normal',
            'Advanced Architecture',
            'fas fa-building',
            'from-purple-600 to-indigo-700',
            'text-purple-600 hover:text-purple-700',
            fall_semester_id,
            ARRAY[
                'MVVM Pattern',
                'VIPER Architecture',
                'Clean Architecture',
                'Modular Design'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 15 FROM lessons), 
            'Final Project Preparation',
            'Project planning, requirements analysis, and development roadmap for capstone projects.',
            '2025-12-16',
            'normal',
            'Project Planning',
            'fas fa-project-diagram',
            'from-green-600 to-teal-700',
            'text-green-600 hover:text-green-700',
            fall_semester_id,
            ARRAY[
                'Project Requirements',
                'Development Timeline',
                'Technical Architecture',
                'Team Collaboration'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 16 FROM lessons), 
            'Final Project Development',
            'Intensive development session with instructor guidance and peer collaboration.',
            '2025-12-23',
            'normal',
            'Project Development',
            'fas fa-code',
            'from-orange-600 to-red-700',
            'text-orange-600 hover:text-orange-700',
            fall_semester_id,
            ARRAY[
                'Implementation Phase',
                'Code Reviews',
                'Problem Solving',
                'Feature Integration'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 17 FROM lessons), 
            'Final Project Presentations',
            'Student presentations of final projects with peer evaluation and feedback.',
            '2025-12-30',
            'normal',
            'Final Presentations',
            'fas fa-presentation',
            'from-yellow-600 to-orange-700',
            'text-yellow-600 hover:text-yellow-700',
            fall_semester_id,
            ARRAY[
                'Project Demonstrations',
                'Peer Evaluations',
                'Technical Q&A',
                'Portfolio Development'
            ]
        ),
        (
            (SELECT COALESCE(MAX(lesson_number), 0) + 18 FROM lessons), 
            'Course Wrap-up & Industry Insights',
            'Course reflection, industry trends, and career guidance for iOS development.',
            '2026-01-06',
            'normal',
            'Wrap-up & Career',
            'fas fa-graduation-cap',
            'from-indigo-600 to-purple-700',
            'text-indigo-600 hover:text-indigo-700',
            fall_semester_id,
            ARRAY[
                'Industry Trends',
                'Career Pathways',
                'Continuous Learning',
                'Professional Network'
            ]
        );

        -- Add lesson plan items for key lessons
        INSERT INTO lesson_plan_items (lesson_id, title, is_required, sort_order)
        SELECT 
            l.id,
            item_title,
            item_required,
            item_order
        FROM lessons l,
        (VALUES 
            ('Complete NameCard app layout', true, 0),
            ('Implement GitFlow workflow', true, 1),
            ('Set up project repository', true, 2),
            ('Review layout best practices', false, 3)
        ) AS items(item_title, item_required, item_order)
        WHERE l.name = 'Session 1: NameCard - Layout & GitFlow' AND l.semester_id = fall_semester_id;

        INSERT INTO lesson_plan_items (lesson_id, title, is_required, sort_order)
        SELECT 
            l.id,
            item_title,
            item_required,
            item_order
        FROM lessons l,
        (VALUES 
            ('Integrate SwiftData models', true, 0),
            ('Create data visualization with SwiftCharts', true, 1),
            ('Implement data persistence', true, 2),
            ('Test data synchronization', false, 3)
        ) AS items(item_title, item_required, item_order)
        WHERE l.name = 'Session 1 (cont): SwiftData & SwiftCharts' AND l.semester_id = fall_semester_id;

        INSERT INTO lesson_plan_items (lesson_id, title, is_required, sort_order)
        SELECT 
            l.id,
            item_title,
            item_required,
            item_order
        FROM lessons l,
        (VALUES 
            ('Build CloudKit integration', true, 0),
            ('Set up Swift Package Manager dependencies', true, 1),
            ('Implement cloud data sync', true, 2),
            ('Test offline functionality', false, 3)
        ) AS items(item_title, item_required, item_order)
        WHERE l.name = 'Session 2: IdeaBox - CloudKit & SPM' AND l.semester_id = fall_semester_id;

    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

-- Migration completed
SELECT 'Consolidated Fall 2025 semester setup completed successfully!' as migration_status;

-- Show the updated Fall semester configuration
SELECT 
    'Fall Semester Lessons: ' || COUNT(*) || ' lessons created' as lesson_summary
FROM lessons l
JOIN semesters s ON l.semester_id = s.id
WHERE s.code = 'fall_2025';

-- Show semester scoring configuration
SELECT 
    s.code,
    s.name,
    ssc.check_in_points,
    ssc.review_points,
    ssc.midterm_project_points,
    ssc.final_project_points,
    ssc.note_points as project3_points,
    ssc.vote_points,
    ssc.bonus_points
FROM semester_scoring_config ssc
JOIN semesters s ON s.id = ssc.semester_id
WHERE s.code IN ('summer_2025', 'fall_2025')
ORDER BY s.code;