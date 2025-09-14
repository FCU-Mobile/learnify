//
//  SubmissionsContainerView.swift
//  Learnify
//
//  Created by Claude on 2025/8/3.
//

import SwiftUI

struct SubmissionsContainerView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Section
                    VStack(spacing: 8) {
                        Text("Submissions")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundStyle(.primary)
                        
                        Text("Submit work, review others, and take quizzes")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top)
                    
                    // Navigation Cards
                    VStack(spacing: 16) {
                        // Submit Card
                        NavigationLink(destination: SubmissionView()) {
                            SubmissionsDashboardCard(
                                icon: "arrow.up.doc",
                                title: "Submit",
                                subtitle: "Upload your assignments and projects",
                                gradient: LinearGradient(
                                    colors: [.blue, .indigo],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Review Card
                        NavigationLink(destination: ReviewSubmissionView()) {
                            SubmissionsDashboardCard(
                                icon: "bubble.left.and.bubble.right",
                                title: "Review",
                                subtitle: "Review and provide feedback on submissions",
                                gradient: LinearGradient(
                                    colors: [.orange, .pink],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Quiz Card
                        NavigationLink(destination: QuizView()) {
                            SubmissionsDashboardCard(
                                icon: "brain.head.profile",
                                title: "Quiz",
                                subtitle: "Test your knowledge and learn new concepts",
                                gradient: LinearGradient(
                                    colors: [.purple, .pink],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal)
                    
                    Spacer()
                }
            }
            .background(Color(.systemGroupedBackground))
            .appToolbar()
        }
    }
}

struct SubmissionsDashboardCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let gradient: LinearGradient
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            ZStack {
                Circle()
                    .fill(gradient)
                    .frame(width: 60, height: 60)
                
                Image(systemName: icon)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            // Chevron
            Image(systemName: "chevron.right")
                .font(.body)
                .fontWeight(.medium)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
}

#Preview {
    SubmissionsContainerView()
}