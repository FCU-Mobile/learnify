//
//  FeedbackFormView.swift
//  Learnify
//
//  Created by Claude on 2025/8/3.
//

import SwiftUI

struct FeedbackFormView: View {
    let submissionId: Int
    let reviewerStudentId: String
    let reviewerStudentName: String
    let onSubmitted: () -> Void
    
    @State private var feedbackText = ""
    @State private var rating: Int = 0
    @State private var isPrivate = true
    @State private var isSubmitting = false
    @State private var errorMessage = ""
    @State private var showError = false
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Give Feedback")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Share your thoughts on this project submission")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    
                    // Rating Section
                    ratingSection
                    
                    // Feedback Text Section
                    feedbackSection
                    
                    // Privacy Section
                    privacySection
                    
                    // Submit Button
                    submitButton
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Feedback")
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
    
    // MARK: - Rating Section
    private var ratingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Rating (Optional)")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Rate this project from 1 to 5 stars")
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { star in
                    Button(action: {
                        rating = (rating == star) ? 0 : star
                    }) {
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.title2)
                            .foregroundColor(star <= rating ? .yellow : .gray)
                    }
                }
                
                if rating > 0 {
                    Button("Clear") {
                        rating = 0
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                    .padding(.leading, 8)
                }
            }
        }
    }
    
    // MARK: - Feedback Section
    private var feedbackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Feedback")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("Share your thoughts, suggestions, or praise")
                .font(.caption)
                .foregroundColor(.secondary)
            
            TextField("Write your feedback here...", text: $feedbackText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(5...10)
        }
    }
    
    // MARK: - Privacy Section
    private var privacySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Privacy")
                .font(.headline)
                .foregroundColor(.primary)
            
            Toggle("Keep feedback private", isOn: $isPrivate)
                .toggleStyle(SwitchToggleStyle(tint: .blue))
            
            Text(isPrivate ? "Only you and the project owner will see this feedback" : "This feedback will be visible to everyone")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        Button(action: submitFeedback) {
            HStack {
                if isSubmitting {
                    ProgressView()
                        .scaleEffect(0.8)
                        .foregroundColor(.white)
                } else {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                }
                Text(isSubmitting ? "Submitting..." : "Submit Feedback")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(canSubmit ? Color.blue : Color.gray)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .disabled(!canSubmit || isSubmitting)
    }
    
    // MARK: - Computed Properties
    private var canSubmit: Bool {
        !feedbackText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    // MARK: - Methods
    private func submitFeedback() {
        guard canSubmit else { return }
        
        isSubmitting = true
        
        Task {
            do {
                _ = try await APIService.shared.submitFeedback(
                    submissionId: submissionId,
                    reviewerStudentId: reviewerStudentId,
                    reviewerFullName: reviewerStudentName,
                    feedbackText: feedbackText.trimmingCharacters(in: .whitespacesAndNewlines),
                    rating: rating > 0 ? rating : nil,
                    isPrivate: isPrivate
                )
                
                await MainActor.run {
                    isSubmitting = false
                    onSubmitted()
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

#Preview {
    FeedbackFormView(
        submissionId: 1,
        reviewerStudentId: "D123456789",
        reviewerStudentName: "John Doe"
    ) {
        print("Feedback submitted")
    }
}