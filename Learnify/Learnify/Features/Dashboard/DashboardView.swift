//
//  DashboardView.swift
//  Learnify
//
//  Created by Harry Taiwan on 2025/7/15.
//

import SwiftUI

struct DashboardView: View {
    @Environment(SemesterService.self) private var semesterService
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Section
                    VStack(spacing: 8) {
                        Text("Dashboard")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundStyle(.primary)
                        
                        Text("Welcome to Learnify")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top)
                    
                    // Navigation Cards
                    VStack(spacing: 16) {
                        // Check In Card - Hidden for Fall semester
                        if !semesterService.shouldHideCheckIn {
                            NavigationLink(destination: CheckInView()) {
                                DashboardCard(
                                    icon: "checkmark.circle",
                                    title: "Check In",
                                    subtitle: "Submit your daily check-in to earn points",
                                    gradient: LinearGradient(
                                        colors: [.green, .cyan],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        // Students Card
                        NavigationLink(destination: StudentsListView()) {
                            DashboardCard(
                                icon: "person.3",
                                title: "Students",
                                subtitle: "View and manage student profiles",
                                gradient: LinearGradient(
                                    colors: [.blue, .purple],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // All Reviews Card - Hidden for Fall semester
                        if !semesterService.shouldHideCheckIn {
                            NavigationLink(destination: ReviewsListView()) {
                                DashboardCard(
                                    icon: "list.bullet.rectangle",
                                    title: "All Reviews",
                                    subtitle: "Browse all submitted reviews",
                                    gradient: LinearGradient(
                                        colors: [.green, .mint],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        // Leaderboard Card - Different for Fall semester
                        if semesterService.shouldHideCheckIn {
                            // Fall Semester - Use Fall Leaderboard
                            NavigationLink(destination: FallLeaderboardView()) {
                                DashboardCard(
                                    icon: "trophy.fill",
                                    title: "🍂 Fall Leaderboard",
                                    subtitle: "View project ratings and quiz scores",
                                    gradient: LinearGradient(
                                        colors: [.purple, .pink],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        } else {
                            // Regular Semester - Use Regular Leaderboard
                            NavigationLink(destination: LeaderboardView()) {
                                DashboardCard(
                                    icon: "trophy.fill",
                                    title: "Leaderboard",
                                    subtitle: "View rankings and achievements",
                                    gradient: LinearGradient(
                                        colors: [.orange, .red],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
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

struct DashboardCard: View {
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
    DashboardView()
}