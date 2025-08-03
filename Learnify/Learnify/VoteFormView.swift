//
//  VoteFormView.swift
//  Learnify
//
//  Created by Claude on 2025/8/3.
//

import SwiftUI

struct VoteFormView: View {
    let submissionId: Int
    let voterStudentId: String
    let voterStudentName: String
    let onVoted: () -> Void
    
    @State private var selectedVoteType: VoteType = .bestProject
    @State private var isSubmitting = false
    @State private var errorMessage = ""
    @State private var showError = false
    
    @Environment(\.dismiss) private var dismiss
    
    enum VoteType: String, CaseIterable {
        case bestProject = "best_project"
        case mostCreative = "most_creative"
        case bestPresentation = "best_presentation"
        
        var displayName: String {
            switch self {
            case .bestProject: return "Best Project"
            case .mostCreative: return "Most Creative"
            case .bestPresentation: return "Best Presentation"
            }
        }
        
        var icon: String {
            switch self {
            case .bestProject: return "trophy.fill"
            case .mostCreative: return "lightbulb.fill"
            case .bestPresentation: return "person.badge.plus.fill"
            }
        }
        
        var description: String {
            switch self {
            case .bestProject: return "Overall excellent project quality and implementation"
            case .mostCreative: return "Most innovative and creative approach or design"
            case .bestPresentation: return "Best presented and explained project"
            }
        }
        
        var color: Color {
            switch self {
            case .bestProject: return .yellow
            case .mostCreative: return .purple
            case .bestPresentation: return .green
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Vote for Project")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Choose a category to vote for this project")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    // Vote Type Selection
                    voteTypeSelection
                    
                    // Submit Button
                    submitButton
                    
                    // Note
                    noteSection
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Vote")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(true)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    // MARK: - Vote Type Selection
    private var voteTypeSelection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Vote Category")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 12) {
                ForEach(VoteType.allCases, id: \.self) { voteType in
                    VoteTypeCard(
                        voteType: voteType,
                        isSelected: selectedVoteType == voteType
                    ) {
                        selectedVoteType = voteType
                    }
                }
            }
        }
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        Button(action: submitVote) {
            HStack {
                if isSubmitting {
                    ProgressView()
                        .scaleEffect(0.8)
                        .foregroundColor(.white)
                } else {
                    Image(systemName: "heart.fill")
                        .font(.title3)
                }
                Text(isSubmitting ? "Voting..." : "Cast Vote")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(selectedVoteType.color)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .disabled(isSubmitting)
    }
    
    // MARK: - Note Section
    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "info.circle")
                    .font(.caption)
                    .foregroundColor(.blue)
                Text("Note")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.blue)
            }
            
            Text("You can only vote once per project. Your vote helps recognize outstanding student work and contributes to their final grade.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
    }
    
    // MARK: - Methods
    private func submitVote() {
        isSubmitting = true
        
        Task {
            do {
                _ = try await APIService.shared.voteForSubmission(
                    submissionId: submissionId,
                    voterStudentId: voterStudentId,
                    voterFullName: voterStudentName,
                    voteType: selectedVoteType.rawValue
                )
                
                await MainActor.run {
                    isSubmitting = false
                    onVoted()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}

// MARK: - Vote Type Card
struct VoteTypeCard: View {
    let voteType: VoteFormView.VoteType
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Icon
                Image(systemName: voteType.icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : voteType.color)
                    .frame(width: 30)
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(voteType.displayName)
                        .font(.headline)
                        .foregroundColor(isSelected ? .white : .primary)
                        .multilineTextAlignment(.leading)
                    
                    Text(voteType.description)
                        .font(.caption)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                // Selection indicator
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(isSelected ? .white : .gray)
            }
            .padding()
            .background(isSelected ? voteType.color : Color.gray.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    VoteFormView(
        submissionId: 1,
        voterStudentId: "D123456789",
        voterStudentName: "John Doe"
    ) {
        print("Vote submitted")
    }
}