-- Migration: Insert Fall 2025 quiz questions
-- Date: 2025-12-28
-- Content: 20 modern iOS 17+ SwiftUI questions
-- Structure: 5 Beginner, 10 Intermediate, 5 Advanced

DO $$
DECLARE
    fall_semester_id UUID;
    question_count INT := 0;
BEGIN
    SELECT id INTO fall_semester_id FROM semesters WHERE code = 'fall_2025';

    IF fall_semester_id IS NULL THEN
        RAISE EXCEPTION 'Fall 2025 semester not found. Please ensure semester exists before running this migration.';
    END IF;

    -- ============================================================================
    -- BEGINNER QUESTIONS (Level 1) - 5 questions
    -- ============================================================================

    INSERT INTO quiz_questions (question_text, difficulty_level, option_a, option_b, option_c, option_d, correct_answer, explanation, is_active, semester_id)
    VALUES
    ('What is the correct syntax for declaring an @Observable class in iOS 17+?', 1,
     '@Observable class MyModel { }',
     '@ObservableObject class MyModel { }',
     'class MyModel: ObservableObject { }',
     '@StateObject class MyModel { }',
     'A',
     'iOS 17+ uses the @Observable macro directly on the class declaration. This replaces the older @ObservableObject pattern.',
     true, fall_semester_id),

    ('Which modifier should you use to change text color in modern SwiftUI?', 1,
     '.foregroundStyle(Color.red)',
     '.foregroundColor(Color.red)',
     '.textColor(Color.red)',
     '.color(Color.red)',
     'A',
     '.foregroundStyle() is the modern replacement for .foregroundColor() as of iOS 15+.',
     true, fall_semester_id),

    ('How do you properly use the modern onChange(of:) modifier syntax?', 1,
     'onChange(of: myState) { oldValue, newValue in ... }',
     'onChange(myState) { ... }',
     '.onStateChange(myState) { ... }',
     '@State onChange myState { ... }',
     'A',
     'The modern onChange(of:) takes the state variable and provides both old and new values in the closure.',
     true, fall_semester_id),

    ('What is the primary purpose of @State in SwiftUI?', 1,
     'To manage simple local state within a view',
     'To share state across multiple app screens',
     'To persist data to UserDefaults',
     'To manage Core Data objects',
     'A',
     '@State is designed for simple local state management within a single view. For shared state, use @Observable or @Environment.',
     true, fall_semester_id),

    ('How do you create a simple VStack with spacing in SwiftUI?', 1,
     'VStack(spacing: 10) { ... }',
     'VStack { }.spacing(10)',
     'VStack(gap: 10) { ... }',
     'VStack(padding: 10) { ... }',
     'A',
     'VStack uses the spacing parameter in its initializer to control vertical spacing between views.',
     true, fall_semester_id),

    -- ============================================================================
    -- INTERMEDIATE QUESTIONS (Level 2) - 10 questions
    -- ============================================================================

    ('What is the key difference between @State and @Bindable?', 2,
     '@State is for simple values, @Bindable creates bindings to @Observable objects',
     '@State is deprecated, @Bindable is the new standard',
     'They are identical and interchangeable',
     '@State is for iOS 16, @Bindable is for iOS 17+',
     'A',
     '@State manages local state directly, while @Bindable creates bindings to properties of @Observable objects.',
     true, fall_semester_id),

    ('When using @Observable objects, how should you store them in a view?', 2,
     'In a @State variable',
     'In @StateObject (legacy approach)',
     'In @EnvironmentObject',
     'Both A and B are equally recommended',
     'A',
     'iOS 17+ recommends storing @Observable objects in @State rather than using the legacy @StateObject pattern.',
     true, fall_semester_id),

    ('Which view container should replace NavigationView for iOS 16+?', 2,
     'NavigationStack',
     'NavigationController',
     'NavigationView is still recommended',
     'StackNavigation',
     'A',
     'NavigationStack is the modern replacement for NavigationView, providing better programmatic control.',
     true, fall_semester_id),

    ('How do you properly implement a custom ViewModifier?', 2,
     'Create a struct conforming to ViewModifier with a body property',
     'Create a function that takes a View and returns a View',
     'Extend View with a custom property',
     'Both A and B are valid approaches',
     'D',
     'Both approaches work: creating a ViewModifier struct or extending View with a function. Both are equally valid.',
     true, fall_semester_id),

    ('What does the .task modifier do in SwiftUI?', 2,
     'Runs async code when the view appears, and keeps running',
     'Schedules a task for background execution',
     'Executes code on a background thread',
     'Similar to onAppear but with automatic cancellation',
     'D',
     '.task() is perfect for async operations like API calls. It automatically handles cancellation when the view disappears.',
     true, fall_semester_id),

    ('How do you create a List that shows different row types?', 2,
     'Using ForEach with different views based on data type',
     'List only supports uniform row types',
     'Use a custom ViewBuilder',
     'Both A and C are valid',
     'D',
     'You can use ForEach with conditional logic or custom ViewBuilders to show different row types in a List.',
     true, fall_semester_id),

    ('What is the purpose of @Binding in SwiftUI?', 2,
     'Creates a two-way connection to state from a parent view',
     'Creates a one-way connection (read-only)',
     'Stores state locally in a child view',
     'Persists data across app launches',
     'A',
     '@Binding creates a two-way connection, allowing child views to read and modify parent state.',
     true, fall_semester_id),

    ('How do you use @Environment to pass data in SwiftUI?', 2,
     'Define a custom EnvironmentKey and use @Environment in child views',
     '@Environment only works with system properties',
     'Use @EnvironmentObject instead for custom data',
     'Environment values must be passed through NavigationStack',
     'A',
     'Create a custom EnvironmentKey and apply it with .environment(), then read it with @Environment in child views.',
     true, fall_semester_id),

    ('When should you use @StateObject vs storing in @State?', 2,
     'Store @Observable objects in @State, use @StateObject only for backward compatibility',
     '@StateObject is the modern way to manage objects',
     'Use @StateObject for all views',
     'They are interchangeable',
     'A',
     'iOS 17+ best practice: use @State with @Observable classes instead of @StateObject with @ObservableObject.',
     true, fall_semester_id),

    ('How do you make a view accessible to users with disabilities?', 2,
     'Use .accessibilityLabel() and .accessibilityHint() modifiers',
     'Create alternative views for accessibility',
     'Accessibility is automatic in SwiftUI',
     'Use VoiceOver specific code',
     'A',
     '.accessibilityLabel() and .accessibilityHint() provide context for accessibility tools like VoiceOver.',
     true, fall_semester_id),

    -- ============================================================================
    -- ADVANCED QUESTIONS (Level 3) - 5 questions
    -- ============================================================================

    ('How do you properly implement dependency injection with @Observable objects?', 3,
     'Pass objects through initializers or @Environment, store in @State',
     'Always use @EnvironmentObject for DI',
     'Use singletons to manage dependencies',
     'Pass data through NavigationStack parameters',
     'A',
     'Best practice: use initializers for tight coupling, @Environment for loose coupling, store in @State.',
     true, fall_semester_id),

    ('What is the difference between withAnimation and .animation() modifier?', 3,
     'withAnimation() explicitly animates state changes, .animation() binds to specific value changes',
     'They produce identical results',
     '.animation() is deprecated',
     'withAnimation() only works with geometry changes',
     'A',
     'withAnimation({...}) explicitly wraps state changes, while .animation(_:value:) automatically animates specific value changes.',
     true, fall_semester_id),

    ('How do you use NavigationStack with programmatic navigation?', 3,
     'Use @State for a binding to a path array that controls navigation',
     'NavigationStack only supports link-based navigation',
     'Use NavigationLink for all navigation control',
     'Path binding is not supported',
     'A',
     'Create a @State path binding to control navigation programmatically with NavigationStack(path:, root:).',
     true, fall_semester_id),

    ('What is @MainActor and when should you use it?', 3,
     'Ensures code runs on the main thread, use for UI updates from async code',
     'Improves app performance by running on background threads',
     'Required for all SwiftUI views',
     'Only needed in iOS 13 and earlier',
     'A',
     '@MainActor ensures UI updates happen on the main thread. Apply it to async functions that update views.',
     true, fall_semester_id),

    ('How do you define a one-to-many relationship in SwiftData and sync with CloudKit?', 3,
     'Use @Relationship macro and cloudSyncContainers() modifier on ModelContainer',
     'SwiftData does not support relationships',
     'Manually manage relationships with custom code',
     'Use Core Data instead of SwiftData for CloudKit sync',
     'A',
     '@Relationship defines relationships between SwiftData models. Enable CloudKit sync by configuring cloudSyncContainers([.default]) on the ModelContainer initialization.',
     true, fall_semester_id);

    question_count := (SELECT COUNT(*) FROM quiz_questions WHERE semester_id = fall_semester_id);

    RAISE NOTICE 'Fall 2025 quiz questions inserted: % total', question_count;

END $$;
