//
//  ProjectDetailView.swift
//  Learnify
//
//  Created by Claude on 2025/8/3.
//

import SwiftUI

struct ProjectDetailView: View {
    let project: Submission
    let studentId: String
    let studentName: String
    
    @State private var feedback: [SubmissionFeedback] = []
    @State private var votes: [SubmissionVote] = []
    @State private var voteSummary: [String: Int] = [:]
    @State private var isLoadingFeedback = false
    @State private var isLoadingVotes = false
    @State private var showingFeedbackForm = false
    @State private var showingVoteOptions = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var successMessage = ""
    @State private var showSuccess = false
    @State private var hasVoted = false
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Project Header
                    projectHeader
                    
                    // Project Content
                    projectContent
                    
                    // Action Buttons
                    if !isOwnProject {
                        actionButtons
                    }
                    
                    // Voting Summary
                    votingSummary
                    
                    // Feedback Section
                    feedbackSection
                }
                .padding()
            }
            .navigationTitle("Project Details")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
                
                if !isOwnProject {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Menu {
                            Button("Give Feedback") {
                                showingFeedbackForm = true
                            }
                            
                            if !hasVoted {
                                Button("Vote") {
                                    showingVoteOptions = true
                                }
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }
            }
            .onAppear {
                loadProjectData()
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") { }
            } message: {
                Text(successMessage)
            }
            .sheet(isPresented: $showingFeedbackForm) {
                FeedbackFormView(
                    submissionId: project.id,
                    reviewerStudentId: studentId,
                    reviewerStudentName: studentName
                ) {
                    loadFeedback()
                }
            }
            .sheet(isPresented: $showingVoteOptions) {
                VoteFormView(
                    submissionId: project.id,
                    voterStudentId: studentId,
                    voterStudentName: studentName
                ) {
                    loadVotes()
                    hasVoted = true
                }
            }
        }
    }
    
    // MARK: - Project Header
    private var projectHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Project type and status
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: projectTypeIcon)
                        .font(.caption)
                        .foregroundColor(.blue)
                    Text(project.project_type?.capitalized ?? "Regular")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(6)
                
                Spacer()
                
                if isOwnProject {
                    Text("Your Project")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.green)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(6)
                }
            }
            
            // Title
            Text(project.title)
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            // Student info
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
                
                VStack(alignment: .leading) {
                    Text(project.student_name ?? project.student_id)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("Student ID: \(project.student_id)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            
            // Stats
            HStack(spacing: 20) {
                StatItem(icon: "heart.fill", value: "\(project.total_votes ?? 0)", label: "Votes", color: .red)
                StatItem(icon: "message", value: "\(project.feedback_count ?? 0)", label: "Feedback", color: .blue)
                
                if let rating = project.average_rating, rating > 0 {
                    StatItem(icon: "star.fill", value: String(format: "%.1f", rating), label: "Rating", color: .yellow)
                }
            }
        }
    }
    
    // MARK: - Project Content
    private var projectContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Description
            if let description = project.description, !description.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Description")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(description)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
            
            // GitHub URL
            if let githubURL = project.github_url, !githubURL.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Repository")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Link(githubURL, destination: URL(string: githubURL) ?? URL(string: "https://github.com")!)
                        .font(.body)
                        .foregroundColor(.blue)
                        .underline()
                }
            }
            
            // Screenshot
            if let fileURL = project.file_url, !fileURL.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Screenshot")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    AsyncImage(url: URL(string: fileURL)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .cornerRadius(12)
                    } placeholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 200)
                            .cornerRadius(12)
                            .overlay(
                                ProgressView()
                            )
                    }
                    .frame(maxHeight: 300)
                }
            }
            
            // Tags
            if let tags = project.tags, !tags.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Tags")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                        ForEach(tags, id: \.self) { tag in
                            Text("#\(tag)")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button(action: {
                showingFeedbackForm = true
            }) {
                HStack {
                    Image(systemName: "message")
                    Text("Give Feedback")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            
            if !hasVoted {
                Button(action: {
                    showingVoteOptions = true
                }) {
                    HStack {
                        Image(systemName: "heart")
                        Text("Vote")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
            } else {
                Text("Voted")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
    }
    
    // MARK: - Voting Summary
    private var votingSummary: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Voting Summary")
                .font(.headline)
                .foregroundColor(.primary)
            
            if voteSummary.isEmpty {
                Text("No votes yet")
                    .font(.body)
                    .foregroundColor(.secondary)
            } else {
                ForEach(voteSummary.sorted(by: { $0.value > $1.value }), id: \.key) { key, value in
                    HStack {
                        Text(formatVoteType(key))
                            .font(.body)
                        Spacer()
                        Text("\(value)")
                            .font(.body)
                            .fontWeight(.medium)
                    }
                }
            }
        }
    }
    
    // MARK: - Feedback Section
    private var feedbackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Feedback (\(feedback.count))")
                .font(.headline)
                .foregroundColor(.primary)
            
            if isLoadingFeedback {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else if feedback.isEmpty {
                Text("No feedback yet")
                    .font(.body)
                    .foregroundColor(.secondary)
            } else {
                ForEach(feedback) { fb in
                    FeedbackCard(feedback: fb)
                }
            }
        }
    }
    
    // MARK: - Computed Properties
    private var isOwnProject: Bool {
        project.student_id == studentId
    }
    
    private var projectTypeIcon: String {
        switch project.project_type {
        case "midterm": return "star.fill"
        case "final": return "crown.fill"
        default: return "doc"
        }
    }
    
    // MARK: - Methods
    private func loadProjectData() {
        loadFeedback()
        loadVotes()
    }
    
    private func loadFeedback() {
        isLoadingFeedback = true
        
        Task {
            do {
                let response = try await APIService.shared.getSubmissionFeedback(
                    submissionId: project.id,
                    includePrivate: false
                )
                
                await MainActor.run {
                    self.feedback = response.data.feedback
                    self.isLoadingFeedback = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load feedback: \(error.localizedDescription)"
                    self.showError = true
                    self.isLoadingFeedback = false
                }
            }
        }
    }
    
    private func loadVotes() {
        isLoadingVotes = true
        
        Task {
            do {
                let response = try await APIService.shared.getSubmissionVotes(submissionId: project.id)
                
                await MainActor.run {
                    self.votes = response.data.votes
                    self.voteSummary = response.data.summary
                    self.hasVoted = self.votes.contains { $0.voter_student_id == self.studentId }
                    self.isLoadingVotes = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to load votes: \(error.localizedDescription)"
                    self.showError = true
                    self.isLoadingVotes = false
                }
            }
        }
    }
    
    private func formatVoteType(_ voteType: String) -> String {
        switch voteType {
        case "best_project": return "Best Project"
        case "most_creative": return "Most Creative"
        case "best_presentation": return "Best Presentation"
        default: return voteType.capitalized
        }
    }
}

// MARK: - Supporting Views

struct StatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct FeedbackCard: View {
    let feedback: SubmissionFeedback
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(feedback.reviewer_name ?? "Anonymous")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                if let rating = feedback.rating {
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.caption)
                                .foregroundColor(.yellow)
                        }
                    }
                }
            }
            
            Text(feedback.feedback_text)
                .font(.body)
                .foregroundColor(.primary)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}

#Preview {
    ProjectDetailView(
        project: Submission(
            id: 1,
            student_id: "D123456789",
            submission_type: "github_repo",
            title: "Mobile Weather App",
            description: "A SwiftUI weather application with CoreLocation integration",
            file_path: nil,
            file_name: nil,
            file_size: nil,
            mime_type: nil,
            github_url: "https://github.com/example/weather-app",
            lesson_id: nil,
            file_url: nil,
            student_name: "John Doe",
            created_at: "2024-03-15T10:30:00Z",
            updated_at: "2024-03-15T10:30:00Z",
            tags: ["midterm", "weather", "swiftui"],
            project_type: "midterm",
            is_project: true,
            vote_score: 15,
            feedback_count: 3,
            average_rating: 4.2,
            total_votes: 5
        ),
        studentId: "D987654321",
        studentName: "Jane Smith"
    )
}