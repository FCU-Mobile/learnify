-- Update Fall 2025 lessons to new structure
-- 3 sections, 6 lessons each (18 total lessons)
-- Tuesdays from Sep 9 2025 to Jan 6 2026
-- This migration runs after 20250917_consolidated_fall_semester_setup.sql

DO $$
DECLARE
    fall_semester_id UUID;
BEGIN
    -- Get the fall semester ID
    SELECT id INTO fall_semester_id FROM semesters WHERE code = 'fall_2025';

    IF fall_semester_id IS NULL THEN
        RAISE EXCEPTION 'Fall 2025 semester not found';
    END IF;

    -- Delete existing lesson plan items first
    DELETE FROM lesson_plan_items WHERE lesson_id IN (
        SELECT id FROM lessons WHERE semester_id = fall_semester_id
    );

    -- Then delete existing fall semester lessons
    DELETE FROM lessons WHERE semester_id = fall_semester_id;

    -- Insert the new structured lessons
    INSERT INTO lessons (
      id, lesson_number, name, description, scheduled_date, status, topic_name, icon, color, button_color, semester_id
    ) VALUES
    -- Session 1: SwiftUI Foundations & Team Development (6 lessons)
    (
      gen_random_uuid(), 101,
      'Session 1.1: SwiftUI Foundations & Team Development - NameCard',
      'Review SwiftUI layout fundamentals, Git workflow, and team collaboration strategies',
      '2025-09-09', 'normal', 'SwiftUI & Team Development',
      'fas fa-users-cog', 'from-blue-500 to-indigo-600', 'text-blue-600 hover:text-blue-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 102,
      'Session 1.2: SwiftData @Relationship',
      'Master SwiftData relationships and data modeling',
      '2025-09-16', 'normal', 'SwiftData Relationships',
      'fas fa-database', 'from-purple-500 to-pink-600', 'text-purple-600 hover:text-purple-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 103,
      'Session 1.3: Swift Charts Basics',
      'Introduction to Swift Charts for data visualization',
      '2025-09-23', 'normal', 'Swift Charts',
      'fas fa-chart-line', 'from-orange-500 to-red-600', 'text-orange-600 hover:text-orange-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 104,
      'Session 1.4: WidgetKit Development',
      'Learn to create home screen widgets with timeline providers',
      '2025-09-30', 'normal', 'WidgetKit',
      'fas fa-mobile-alt', 'from-emerald-500 to-green-600', 'text-emerald-600 hover:text-emerald-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 105,
      'Session 1.5: SwiftUI Advanced Tips - FocusState & UIViewRepresentable',
      'Master FocusState management and UIKit integration with UIViewRepresentable',
      '2025-10-07', 'normal', 'SwiftUI Advanced Tips',
      'fas fa-magic', 'from-cyan-500 to-blue-600', 'text-cyan-600 hover:text-cyan-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 106,
      'Session 1.6: Project Presentations',
      'Present Session 1 projects and demonstrate learned concepts',
      '2025-10-14', 'normal', 'Session 1 Presentations',
      'fas fa-presentation', 'from-emerald-500 to-green-600', 'text-emerald-600 hover:text-emerald-700',
      fall_semester_id
    ),

    -- Session 2: Cloud & Architecture (6 lessons)
    (
      gen_random_uuid(), 107,
      'Session 2.1: Industry Practices (Guest Speaker) - IdeaBox',
      'Industry expert shares real-world mobile development practices',
      '2025-10-21', 'normal', 'Industry Practices',
      'fas fa-industry', 'from-yellow-500 to-orange-600', 'text-yellow-600 hover:text-yellow-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 108,
      'Session 2.2: SwiftData with CloudKit',
      'Integrate SwiftData with CloudKit for cloud synchronization',
      '2025-10-28', 'normal', 'CloudKit Integration',
      'fas fa-cloud', 'from-blue-500 to-purple-600', 'text-blue-600 hover:text-blue-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 109,
      'Session 2.3: SPM & Dependencies Management',
      'Learn Swift Package Manager and dependency injection patterns',
      '2025-11-04', 'normal', 'SPM & Dependencies',
      'fas fa-box', 'from-indigo-500 to-blue-600', 'text-indigo-600 hover:text-indigo-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 110,
      'Session 2.4: SwiftUI Navigation Patterns',
      'Master advanced navigation patterns and routing strategies',
      '2025-11-11', 'normal', 'Navigation Patterns',
      'fas fa-route', 'from-green-500 to-teal-600', 'text-green-600 hover:text-green-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 111,
      'Session 2.5: Notifications & Push Services',
      'Master local and push notification systems for enhanced user engagement',
      '2025-11-18', 'normal', 'Notifications',
      'fas fa-bell', 'from-purple-500 to-pink-600', 'text-purple-600 hover:text-purple-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 112,
      'Session 2.6: Project Presentations',
      'Present Session 2 projects showcasing cloud and architecture concepts',
      '2025-11-25', 'normal', 'Session 2 Presentations',
      'fas fa-presentation', 'from-emerald-500 to-green-600', 'text-emerald-600 hover:text-emerald-700',
      fall_semester_id
    ),

    -- Session 3: Advanced Architecture & AI (5 lessons + wrap-up)
    (
      gen_random_uuid(), 113,
      'Session 3.1: Architecture Introduction & MVVM - Expenses',
      'Introduction to iOS architecture patterns with MVVM implementation',
      '2025-12-02', 'normal', 'Architecture & MVVM',
      'fas fa-sitemap', 'from-orange-500 to-red-600', 'text-orange-600 hover:text-orange-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 114,
      'Session 3.2: The Composable Architecture (TCA)',
      'Learn TCA for scalable app architecture',
      '2025-12-09', 'normal', 'Composable Architecture',
      'fas fa-layer-group', 'from-cyan-500 to-blue-600', 'text-cyan-600 hover:text-cyan-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 115,
      'Session 3.3: TDD with Swift Testing & Xcode Cloud',
      'Master TDD practices using Swift Testing framework and Xcode Cloud CI/CD',
      '2025-12-16', 'normal', 'TDD & Xcode Cloud',
      'fas fa-vial', 'from-blue-500 to-indigo-600', 'text-blue-600 hover:text-blue-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 116,
      'Session 3.4: Liquid Glass UI & Foundation Models',
      'Explore advanced SwiftUI components and AI integration',
      '2025-12-23', 'normal', 'Liquid Glass & AI',
      'fas fa-magic', 'from-purple-500 to-pink-600', 'text-purple-600 hover:text-purple-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 117,
      'Session 3.5: Advanced Text Editor & Rich Text',
      'Master advanced TextEditor features and rich text formatting',
      '2025-12-30', 'normal', 'Advanced Text Editor',
      'fas fa-edit', 'from-green-500 to-teal-600', 'text-green-600 hover:text-green-700',
      fall_semester_id
    ),
    (
      gen_random_uuid(), 118,
      'Session 3.6: Final Presentations & Course Wrap-up',
      'Final project presentations, course summary, and career guidance',
      '2026-01-06', 'normal', 'Final Presentations & Wrap-up',
      'fas fa-graduation-cap', 'from-yellow-500 to-orange-600', 'text-yellow-600 hover:text-yellow-700',
      fall_semester_id
    );


    -- Insert lesson plan items for each lesson
    -- Session 1 lesson plan items
    INSERT INTO lesson_plan_items (id, lesson_id, title, is_required, sort_order) VALUES
    -- Session 1.1: SwiftUI Foundations & Team Development
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 101 AND semester_id = fall_semester_id), 'Review SwiftUI layout fundamentals (VStack, HStack, ZStack)', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 101 AND semester_id = fall_semester_id), 'Learn Git workflow and branching strategies', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 101 AND semester_id = fall_semester_id), 'Agile development and Scrum basics', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 101 AND semester_id = fall_semester_id), 'Set up team repositories and collaboration tools', false, 3),

    -- Session 1.2: SwiftData @Relationship
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 102 AND semester_id = fall_semester_id), 'Team Formation for Project 1', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 102 AND semester_id = fall_semester_id), 'SwiftData model relationships overview', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 102 AND semester_id = fall_semester_id), '@Relationship attribute usage and configuration', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 102 AND semester_id = fall_semester_id), 'One-to-many and many-to-many relationships', true, 3),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 102 AND semester_id = fall_semester_id), 'Cascade deletion and inverse relationships', false, 4),

    -- Session 1.3: Swift Charts Basics
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 103 AND semester_id = fall_semester_id), 'Charts framework overview and setup', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 103 AND semester_id = fall_semester_id), 'Create bar and line charts', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 103 AND semester_id = fall_semester_id), 'Data visualization best practices', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 103 AND semester_id = fall_semester_id), 'Interactive chart features and animations', false, 3),

    -- Session 1.4: WidgetKit Development
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 104 AND semester_id = fall_semester_id), 'WidgetKit fundamentals and setup', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 104 AND semester_id = fall_semester_id), 'Widget configuration and timeline providers', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 104 AND semester_id = fall_semester_id), 'Widget families and sizes', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 104 AND semester_id = fall_semester_id), 'Deep linking and user interactions', false, 3),

    -- Session 1.5: SwiftUI Advanced Tips - FocusState & UIViewRepresentable
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 105 AND semester_id = fall_semester_id), 'FocusState management and keyboard navigation', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 105 AND semester_id = fall_semester_id), 'Advanced focus management patterns', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 105 AND semester_id = fall_semester_id), 'UIViewRepresentable protocol basics', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 105 AND semester_id = fall_semester_id), 'Integrating UIKit components in SwiftUI', false, 3),

    -- Session 1.6: Project Presentations
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 106 AND semester_id = fall_semester_id), 'Prepare project demos', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 106 AND semester_id = fall_semester_id), 'Present Session 1 projects', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 106 AND semester_id = fall_semester_id), 'Peer code reviews', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 106 AND semester_id = fall_semester_id), 'Project retrospective', false, 3),

    -- Session 2 lesson plan items
    -- Session 2.1: Industry Practices (Guest Speaker)
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 107 AND semester_id = fall_semester_id), 'Team Formation for Project 2', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 107 AND semester_id = fall_semester_id), 'Industry speaker presentation', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 107 AND semester_id = fall_semester_id), 'Real-world development practices', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 107 AND semester_id = fall_semester_id), 'Q&A with industry expert', true, 3),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 107 AND semester_id = fall_semester_id), 'Career insights and networking', false, 4),

    -- Session 2.2: SwiftData with CloudKit
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 108 AND semester_id = fall_semester_id), 'CloudKit integration setup', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 108 AND semester_id = fall_semester_id), 'SwiftData + CloudKit sync', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 108 AND semester_id = fall_semester_id), 'Handling sync conflicts', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 108 AND semester_id = fall_semester_id), 'CloudKit dashboard management', false, 3),

    -- Session 2.3: SPM & Dependencies Management
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 109 AND semester_id = fall_semester_id), 'SPM fundamentals and package creation', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 109 AND semester_id = fall_semester_id), 'Package dependencies management', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 109 AND semester_id = fall_semester_id), 'Pointfree Dependencies library introduction', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 109 AND semester_id = fall_semester_id), 'Dependency injection patterns', false, 3),

    -- Session 2.4: SwiftUI Navigation Patterns
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 110 AND semester_id = fall_semester_id), 'NavigationStack and modern navigation', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 110 AND semester_id = fall_semester_id), 'SwiftUI Navigation library patterns', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 110 AND semester_id = fall_semester_id), 'Type-safe routing strategies', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 110 AND semester_id = fall_semester_id), 'Deep linking and navigation flows', false, 3),

    -- Session 2.5: Notifications & Push Services
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 111 AND semester_id = fall_semester_id), 'Local notifications setup and scheduling', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 111 AND semester_id = fall_semester_id), 'Notification content and user interactions', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 111 AND semester_id = fall_semester_id), 'Brief introduction to remote push notifications', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 111 AND semester_id = fall_semester_id), 'Rich media notifications and extensions', false, 3),

    -- Session 2.6: Project Presentations
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 112 AND semester_id = fall_semester_id), 'Prepare project demos', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 112 AND semester_id = fall_semester_id), 'Present Session 2 projects', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 112 AND semester_id = fall_semester_id), 'Architecture reviews', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 112 AND semester_id = fall_semester_id), 'Cloud integration demos', false, 3),

    -- Session 3 lesson plan items
    -- Session 3.1: Architecture Introduction & MVVM
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 113 AND semester_id = fall_semester_id), 'Team Formation for Project 3', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 113 AND semester_id = fall_semester_id), 'iOS architecture patterns introduction', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 113 AND semester_id = fall_semester_id), 'MVVM pattern fundamentals', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 113 AND semester_id = fall_semester_id), 'Implementing MVVM in SwiftUI', true, 3),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 113 AND semester_id = fall_semester_id), 'MVVM vs other architectural patterns', false, 4),

    -- Session 3.2: The Composable Architecture (TCA)
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 114 AND semester_id = fall_semester_id), 'TCA fundamentals', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 114 AND semester_id = fall_semester_id), 'State, Action, Reducer pattern', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 114 AND semester_id = fall_semester_id), 'Effects and dependencies', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 114 AND semester_id = fall_semester_id), 'TCA testing strategies', false, 3),

    -- Session 3.3: TDD with Swift Testing & Xcode Cloud
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 115 AND semester_id = fall_semester_id), 'TDD principles and Swift Testing framework', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 115 AND semester_id = fall_semester_id), 'Writing tests with Swift Testing syntax', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 115 AND semester_id = fall_semester_id), 'Xcode Cloud setup and CI/CD workflows', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 115 AND semester_id = fall_semester_id), 'Automated testing and deployment strategies', false, 3),

    -- Session 3.4: Liquid Glass UI & Foundation Models
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'Sheet presentation and modal interactions', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'Search functionality and searchable modifier', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'Navigation, Toolbar, TabView components', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'Concentric API and advanced SwiftUI patterns', true, 3),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'Foundation Models overview and capabilities', true, 4),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 116 AND semester_id = fall_semester_id), 'AI integration patterns in iOS apps', false, 5),

    -- Session 3.5: Advanced Text Editor & Rich Text
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 117 AND semester_id = fall_semester_id), 'Advanced TextEditor implementation', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 117 AND semester_id = fall_semester_id), 'Rich text formatting and styling', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 117 AND semester_id = fall_semester_id), 'Custom text editing features', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 117 AND semester_id = fall_semester_id), 'Text manipulation and search', false, 3),

    -- Session 3.6: Final Presentations & Course Wrap-up
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 118 AND semester_id = fall_semester_id), 'Present final projects and demos', true, 0),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 118 AND semester_id = fall_semester_id), 'Course summary and reflection', true, 1),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 118 AND semester_id = fall_semester_id), 'iOS development career paths', true, 2),
    (gen_random_uuid(), (SELECT id FROM lessons WHERE lesson_number = 118 AND semester_id = fall_semester_id), 'Portfolio development and industry tips', false, 3);

    RAISE NOTICE 'Successfully updated Fall 2025 lessons with new structure (18 lessons in 3 sections) and lesson plan items';
END $$;