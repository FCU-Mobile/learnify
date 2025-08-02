//
//  QuizView.swift
//  Learnify
//
//  Created by Claude on 2025/8/2.
//

import SwiftUI

struct QuizView: View {
    // MARK: - Constants
    private static let quizDurationSeconds = 1500 // 25 minutes in seconds
    
    // MARK: - State Variables
    @State private var selectedQuiz: Quiz?
    @State private var currentQuestionIndex = 0
    @State private var selectedAnswer: Int? = nil
    @State private var answers: [Int?] = []
    @State private var timeRemaining = QuizView.quizDurationSeconds
    @State private var timer: Timer?
    @State private var showResults = false
    @State private var quizAttempt: QuizAttempt?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var availableQuizzes: [Quiz] = []
    
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    
    let studentId: String
    let studentName: String
    
    var body: some View {
        NavigationStack {
            Group {
                if let quiz = selectedQuiz {
                    quizContentView(quiz: quiz)
                } else {
                    quizSelectionView
                }
            }
            .navigationTitle("SwiftUI Quiz")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        stopTimer()
                        dismiss()
                    }
                }
                
                if selectedQuiz != nil && !showResults {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Text(timeRemainingString)
                            .font(.headline)
                            .foregroundColor(timeRemaining < 300 ? .red : .primary)
                    }
                }
            }
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            handleScenePhaseChange(newPhase)
        }
        .alert("Quiz Complete", isPresented: $showResults) {
            Button("Review Answers") {
                // TODO: Implement review mode
            }
            Button("New Quiz") {
                resetQuiz()
            }
            Button("Close") {
                dismiss()
            }
        } message: {
            if let attempt = quizAttempt {
                Text("Score: \(attempt.score)/\(attempt.total_possible_points) (\(String(format: "%.1f", attempt.percentage))%)")
            }
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") {
                errorMessage = nil
            }
        } message: {
            if let error = errorMessage {
                Text(error)
            }
        }
    }
    
    private var quizSelectionView: some View {
        VStack(spacing: 20) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("SwiftUI Knowledge Quiz")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Test your understanding of SwiftUI concepts")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: startQuiz) {
                Label("Start Quiz", systemImage: "play.fill")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .disabled(isLoading)
            
            if isLoading {
                ProgressView("Loading quiz...")
                    .padding()
            }
        }
        .padding()
        .frame(maxWidth: 400)
    }
    
    private func quizContentView(quiz: Quiz) -> some View {
        VStack(spacing: 20) {
            // Progress bar
            ProgressView(value: Double(currentQuestionIndex + 1), total: Double(quiz.questions.count))
                .progressViewStyle(LinearProgressViewStyle())
                .padding(.horizontal)
            
            HStack {
                Text("Question \(currentQuestionIndex + 1) of \(quiz.questions.count)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text(timeRemainingString)
                    .font(.caption)
                    .foregroundColor(timeRemaining < 300 ? .red : .secondary)
            }
            .padding(.horizontal)
            
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Question
                    let question = quiz.questions[currentQuestionIndex]
                    
                    VStack(alignment: .leading, spacing: 15) {
                        Text(question.question_text)
                            .font(.title2)
                            .fontWeight(.medium)
                        
                        // Code snippet if present
                        if let code = question.code_snippet, !code.isEmpty {
                            Text(code)
                                .font(.system(.body, design: .monospaced))
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)
                    
                    // Answer options
                    VStack(spacing: 12) {
                        ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                            Button(action: {
                                selectedAnswer = index
                            }) {
                                HStack {
                                    Image(systemName: selectedAnswer == index ? "checkmark.circle.fill" : "circle")
                                        .foregroundColor(selectedAnswer == index ? .blue : .gray)
                                    
                                    Text("\(optionLabel(for: index)). \(option.option_text)")
                                        .multilineTextAlignment(.leading)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                }
                                .padding()
                                .background(selectedAnswer == index ? Color.blue.opacity(0.1) : Color(.systemGray6))
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(selectedAnswer == index ? Color.blue : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding()
            }
            
            // Navigation buttons
            HStack {
                Button("Previous") {
                    previousQuestion()
                }
                .disabled(currentQuestionIndex == 0)
                
                Spacer()
                
                Button(currentQuestionIndex == quiz.questions.count - 1 ? "Submit Quiz" : "Next") {
                    if currentQuestionIndex == quiz.questions.count - 1 {
                        submitQuiz()
                    } else {
                        nextQuestion()
                    }
                }
                .disabled(selectedAnswer == nil)
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }
    
    private var timeRemainingString: String {
        let minutes = timeRemaining / 60
        let seconds = timeRemaining % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func startQuiz() {
        isLoading = true
        
        Task {
            do {
                // Load available quizzes from API
                if availableQuizzes.isEmpty {
                    availableQuizzes = try await APIService.shared.getAvailableQuizzes()
                }
                
                // For now, use the first available quiz or fall back to sample data
                let quiz: Quiz
                if let firstQuiz = availableQuizzes.first {
                    quiz = try await APIService.shared.getQuiz(id: firstQuiz.id)
                } else {
                    // Fallback to sample quiz if no API quizzes available
                    quiz = createSampleSwiftUIQuiz()
                }
                
                await MainActor.run {
                    selectedQuiz = quiz
                    answers = Array(repeating: nil, count: quiz.questions.count)
                    startTimer()
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to load quiz: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if timeRemaining > 0 {
                timeRemaining -= 1
            } else {
                submitQuiz()
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func nextQuestion() {
        guard let answer = selectedAnswer else { return }
        answers[currentQuestionIndex] = answer
        
        if currentQuestionIndex < (selectedQuiz?.questions.count ?? 0) - 1 {
            currentQuestionIndex += 1
            selectedAnswer = answers[currentQuestionIndex]
        }
    }
    
    private func previousQuestion() {
        if let answer = selectedAnswer {
            answers[currentQuestionIndex] = answer
        }
        
        if currentQuestionIndex > 0 {
            currentQuestionIndex -= 1
            selectedAnswer = answers[currentQuestionIndex]
        }
    }
    
    private func submitQuiz() {
        guard let quiz = selectedQuiz else { return }
        
        // Save current answer
        if let answer = selectedAnswer {
            answers[currentQuestionIndex] = answer
        }
        
        stopTimer()
        
        // Calculate results
        var correctCount = 0
        var totalPoints = 0
        
        for (index, question) in quiz.questions.enumerated() {
            if let userAnswer = answers[index] {
                if userAnswer == question.correct_answer {
                    correctCount += 1
                    totalPoints += question.points
                }
            }
        }
        
        let totalPossible = quiz.questions.reduce(0) { $0 + $1.points }
        let timeTakenMinutes = (QuizView.quizDurationSeconds - timeRemaining) / 60
        
        // Submit quiz attempt to API
        Task {
            do {
                let attempt = try await APIService.shared.submitQuizAttempt(
                    quiz: quiz,
                    studentId: studentId,
                    answers: answers,
                    timeTakenMinutes: timeTakenMinutes
                )
                
                await MainActor.run {
                    quizAttempt = attempt
                    showResults = true
                }
            } catch {
                // Fallback to local calculation if API fails
                let percentage = totalPossible > 0 ? Double(totalPoints) / Double(totalPossible) * 100 : 0
                
                await MainActor.run {
                    quizAttempt = QuizAttempt(
                        id: 0,
                        quiz_id: quiz.id,
                        student_id: studentId,
                        student_uuid: nil,
                        score: totalPoints,
                        total_possible_points: totalPossible,
                        percentage: percentage,
                        time_taken_minutes: timeTakenMinutes,
                        started_at: "",
                        completed_at: nil,
                        is_completed: true
                    )
                    
                    errorMessage = "Quiz completed locally. Could not sync with server: \(error.localizedDescription)"
                    showResults = true
                }
            }
        }
    }
    
    private func resetQuiz() {
        selectedQuiz = nil
        currentQuestionIndex = 0
        selectedAnswer = nil
        answers = []
        timeRemaining = QuizView.quizDurationSeconds
        showResults = false
        quizAttempt = nil
        stopTimer()
    }
    
    // MARK: - Helper Functions
    
    private func optionLabel(for index: Int) -> String {
        // Safely create option labels (A, B, C, D, etc.)
        guard index >= 0 && index < 26 else { return "?" }
        return String(Character(UnicodeScalar(65 + index)!))
    }
    
    private func handleScenePhaseChange(_ newPhase: ScenePhase) {
        switch newPhase {
        case .background, .inactive:
            // Pause timer when app goes to background
            timer?.invalidate()
        case .active:
            // Resume timer when app becomes active (only if quiz is in progress)
            if selectedQuiz != nil && !showResults && timeRemaining > 0 {
                startTimer()
            }
        @unknown default:
            break
        }
    }
}

#Preview {
    QuizView(studentId: "D0123456", studentName: "Test Student")
}