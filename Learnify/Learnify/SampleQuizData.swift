//
//  SampleQuizData.swift
//  Learnify
//
//  Created by Claude on 2025/8/2.
//

import Foundation

func createSampleSwiftUIQuiz() -> Quiz {
    let questions = [
        Question(
            id: 1,
            quiz_id: 1,
            question_text: "What is the correct way to create a state variable in SwiftUI?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 0,
            points: 1,
            sort_order: 0,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 1, question_id: 1, option_text: "@State private var count = 0", option_index: 0, created_at: ""),
                QuestionOption(id: 2, question_id: 1, option_text: "@Binding var count = 0", option_index: 1, created_at: ""),
                QuestionOption(id: 3, question_id: 1, option_text: "@Observable var count = 0", option_index: 2, created_at: ""),
                QuestionOption(id: 4, question_id: 1, option_text: "var count = 0", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 2,
            quiz_id: 1,
            question_text: "Which modifier is used to add padding around a SwiftUI view?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 1,
            points: 1,
            sort_order: 1,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 5, question_id: 2, option_text: ".margin()", option_index: 0, created_at: ""),
                QuestionOption(id: 6, question_id: 2, option_text: ".padding()", option_index: 1, created_at: ""),
                QuestionOption(id: 7, question_id: 2, option_text: ".spacing()", option_index: 2, created_at: ""),
                QuestionOption(id: 8, question_id: 2, option_text: ".frame()", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 3,
            quiz_id: 1,
            question_text: "What will this SwiftUI code display?",
            question_type: "code",
            code_snippet: """
VStack {
    Text("Hello")
    Text("World")
}
.padding()
""",
            correct_answer: 2,
            points: 1,
            sort_order: 2,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 9, question_id: 3, option_text: "Two texts side by side", option_index: 0, created_at: ""),
                QuestionOption(id: 10, question_id: 3, option_text: "One text overlapping another", option_index: 1, created_at: ""),
                QuestionOption(id: 11, question_id: 3, option_text: "Two texts stacked vertically with padding", option_index: 2, created_at: ""),
                QuestionOption(id: 12, question_id: 3, option_text: "Nothing will be displayed", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 4,
            quiz_id: 1,
            question_text: "Which property wrapper is used to observe changes in an external object?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 1,
            points: 1,
            sort_order: 3,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 13, question_id: 4, option_text: "@State", option_index: 0, created_at: ""),
                QuestionOption(id: 14, question_id: 4, option_text: "@ObservedObject", option_index: 1, created_at: ""),
                QuestionOption(id: 15, question_id: 4, option_text: "@Binding", option_index: 2, created_at: ""),
                QuestionOption(id: 16, question_id: 4, option_text: "@Environment", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 5,
            quiz_id: 1,
            question_text: "What does NavigationStack do in SwiftUI?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 0,
            points: 1,
            sort_order: 4,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 17, question_id: 5, option_text: "Provides navigation capabilities for an app", option_index: 0, created_at: ""),
                QuestionOption(id: 18, question_id: 5, option_text: "Stacks views horizontally", option_index: 1, created_at: ""),
                QuestionOption(id: 19, question_id: 5, option_text: "Creates a navigation bar only", option_index: 2, created_at: ""),
                QuestionOption(id: 20, question_id: 5, option_text: "Manages app state", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 6,
            quiz_id: 1,
            question_text: "Which is the correct way to create a button in SwiftUI?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 2,
            points: 1,
            sort_order: 5,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 21, question_id: 6, option_text: "Button(\"Tap me\") { }", option_index: 0, created_at: ""),
                QuestionOption(id: 22, question_id: 6, option_text: "Button { } label: { Text(\"Tap me\") }", option_index: 1, created_at: ""),
                QuestionOption(id: 23, question_id: 6, option_text: "Both A and B are correct", option_index: 2, created_at: ""),
                QuestionOption(id: 24, question_id: 6, option_text: "Button(action: { }, text: \"Tap me\")", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 7,
            quiz_id: 1,
            question_text: "What is the purpose of @Binding in SwiftUI?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 1,
            points: 1,
            sort_order: 6,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 25, question_id: 7, option_text: "To create a new state variable", option_index: 0, created_at: ""),
                QuestionOption(id: 26, question_id: 7, option_text: "To create a two-way connection between a child and parent view", option_index: 1, created_at: ""),
                QuestionOption(id: 27, question_id: 7, option_text: "To observe an external object", option_index: 2, created_at: ""),
                QuestionOption(id: 28, question_id: 7, option_text: "To bind data to a network call", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 8,
            quiz_id: 1,
            question_text: "Which layout container arranges views horizontally?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 0,
            points: 1,
            sort_order: 7,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 29, question_id: 8, option_text: "HStack", option_index: 0, created_at: ""),
                QuestionOption(id: 30, question_id: 8, option_text: "VStack", option_index: 1, created_at: ""),
                QuestionOption(id: 31, question_id: 8, option_text: "ZStack", option_index: 2, created_at: ""),
                QuestionOption(id: 32, question_id: 8, option_text: "LazyHGrid", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 9,
            quiz_id: 1,
            question_text: "What does this modifier do?",
            question_type: "code",
            code_snippet: ".foregroundColor(.blue)",
            correct_answer: 1,
            points: 1,
            sort_order: 8,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 33, question_id: 9, option_text: "Changes the background color to blue", option_index: 0, created_at: ""),
                QuestionOption(id: 34, question_id: 9, option_text: "Changes the text color to blue", option_index: 1, created_at: ""),
                QuestionOption(id: 35, question_id: 9, option_text: "Changes the border color to blue", option_index: 2, created_at: ""),
                QuestionOption(id: 36, question_id: 9, option_text: "Does nothing", option_index: 3, created_at: "")
            ]
        ),
        
        Question(
            id: 10,
            quiz_id: 1,
            question_text: "Which is the modern way to handle navigation in SwiftUI?",
            question_type: "multiple_choice",
            code_snippet: nil,
            correct_answer: 0,
            points: 1,
            sort_order: 9,
            created_at: "",
            updated_at: "",
            options: [
                QuestionOption(id: 37, question_id: 10, option_text: "NavigationStack", option_index: 0, created_at: ""),
                QuestionOption(id: 38, question_id: 10, option_text: "NavigationView", option_index: 1, created_at: ""),
                QuestionOption(id: 39, question_id: 10, option_text: "NavigationController", option_index: 2, created_at: ""),
                QuestionOption(id: 40, question_id: 10, option_text: "NavigationBar", option_index: 3, created_at: "")
            ]
        )
    ]
    
    return Quiz(
        id: 1,
        title: "SwiftUI Fundamentals",
        description: "Test your knowledge of SwiftUI basics including views, state management, and navigation",
        time_limit_minutes: 25,
        total_points: 10,
        is_active: true,
        created_at: "",
        updated_at: "",
        questions: questions
    )
}