//
//  FallLeaderboardView.swift
//  Learnify
//
//  Created by Claude on 2025/1/14.
//

import SwiftUI

struct FallLeaderboardView: View {
    @State private var leaderboard: [FallLeaderboardEntry] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingAlert = false
    @State private var totalStudents = 0
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Fall Header Section
                FallLeaderboardHeader()
                
                if isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading Fall leaderboard...")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if leaderboard.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.gray)
                        
                        Text("No Students Yet")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                        
                        Text("No students have joined the Fall leaderboard yet.")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Refresh") {
                            Task {
                                await loadFallLeaderboard()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        // Top 3 Podium Section
                        if leaderboard.count >= 3 {
                            Section {
                                FallPodiumView(leaderboard: Array(leaderboard.prefix(3)))
                            }
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }
                        
                        // Fall Rankings List
                        Section {
                            ForEach(leaderboard, id: \.student_id) { entry in
                                FallLeaderboardRowView(entry: entry)
                            }
                        } header: {
                            HStack {
                                Text("Fall Semester Rankings")
                                    .textCase(.uppercase)
                                Spacer()
                                Text("\(totalStudents) students")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .textCase(.none)
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                    .refreshable {
                        await loadFallLeaderboard()
                    }
                }
            }
            .navigationTitle("🍂 Fall Leaderboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        Task {
                            await loadFallLeaderboard()
                        }
                    }
                    .disabled(isLoading)
                }
            }
            .task {
                await loadFallLeaderboard()
            }
            .alert("Error", isPresented: $showingAlert) {
                Button("OK") { }
                Button("Retry") {
                    Task {
                        await loadFallLeaderboard()
                    }
                }
            } message: {
                Text(errorMessage ?? "Unknown error occurred")
            }
        }
    }
    
    @MainActor
    private func loadFallLeaderboard() async {
        print("🍂 [iOS] Loading Fall leaderboard")
        isLoading = true
        errorMessage = nil
        
        do {
            leaderboard = try await APIService.shared.getFallLeaderboard()
            totalStudents = leaderboard.count
            print("🍂 [iOS] Loaded \(leaderboard.count) Fall leaderboard entries")
        } catch {
            print("🍂 [iOS] Fall leaderboard error: \(error)")
            errorMessage = error.localizedDescription
            showingAlert = true
        }
        
        isLoading = false
    }
}

struct FallLeaderboardHeader: View {
    var body: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [.purple, .pink],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 140)
            .overlay {
                VStack(spacing: 8) {
                    HStack {
                        Text("🍂 Fall Semester Leaderboard")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                        Spacer()
                    }
                    
                    HStack {
                        Text("Rankings based on quiz performance and project ratings")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.9))
                        Spacer()
                    }
                    
                    HStack {
                        Text("📊 Quiz Points (10%) + Project Ratings (30% each)")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.8))
                        Spacer()
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .clipShape(RoundedRectangle(cornerRadius: 0))
        }
    }
}

struct FallPodiumView: View {
    let leaderboard: [FallLeaderboardEntry]
    
    var body: some View {
        VStack(spacing: 20) {
            Text("🏆 Top Performers")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.primary)
                .padding(.top)
            
            HStack(alignment: .bottom, spacing: 16) {
                // 2nd Place
                if leaderboard.count >= 2 {
                    FallPodiumPositionView(
                        entry: leaderboard[1],
                        position: 2,
                        height: 80,
                        color: .gray
                    )
                }
                
                // 1st Place
                if leaderboard.count >= 1 {
                    FallPodiumPositionView(
                        entry: leaderboard[0],
                        position: 1,
                        height: 100,
                        color: .yellow
                    )
                }
                
                // 3rd Place
                if leaderboard.count >= 3 {
                    FallPodiumPositionView(
                        entry: leaderboard[2],
                        position: 3,
                        height: 60,
                        color: .orange
                    )
                }
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [.purple.opacity(0.1), .pink.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .padding()
    }
}

struct FallPodiumPositionView: View {
    let entry: FallLeaderboardEntry
    let position: Int
    let height: CGFloat
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            // Avatar
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [.purple, .pink]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 50, height: 50)
                
                Text(getInitials(from: entry.student_name))
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
            }
            
            // Name
            Text(entry.student_name)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .frame(maxWidth: 80)
            
            // Score
            Text(String(format: "%.1f", entry.total_score))
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.purple)
            
            // Podium
            Rectangle()
                .fill(color)
                .frame(width: 60, height: height)
                .overlay(
                    Text("\(position)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                )
                .cornerRadius(8)
        }
    }
    
    private func getInitials(from name: String) -> String {
        let words = name.split(separator: " ")
        let initials = words.prefix(2).compactMap { $0.first }.map { String($0) }
        return initials.joined().uppercased()
    }
}

struct FallLeaderboardRowView: View {
    let entry: FallLeaderboardEntry
    
    var body: some View {
        HStack(spacing: 12) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor.opacity(0.2))
                    .frame(width: 36, height: 36)
                
                Text("\(entry.rank)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(rankColor)
            }
            
            // Avatar with initials
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [.purple, .pink]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 40, height: 40)
                
                Text(getInitials(from: entry.student_name))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
            }
            
            // Student Info
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.student_name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                
                Text(entry.student_id)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            // Score Breakdown
            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.1f", entry.total_score))
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.purple)
                
                if entry.rank <= 3 {
                    Text(rankEmoji)
                        .font(.title2)
                } else {
                    HStack(spacing: 4) {
                        Text("Q:")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(String(format: "%.1f", entry.quiz_points))
                            .font(.caption2)
                            .foregroundStyle(.blue)
                        
                        Text("P:")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Text(String(format: "%.1f", (entry.project1_rating + entry.project2_rating + entry.project3_rating)))
                            .font(.caption2)
                            .foregroundStyle(.green)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private var rankColor: Color {
        switch entry.rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return .purple
        }
    }
    
    private var rankEmoji: String {
        switch entry.rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return ""
        }
    }
    
    private func getInitials(from name: String) -> String {
        let words = name.split(separator: " ")
        let initials = words.prefix(2).compactMap { $0.first }.map { String($0) }
        return initials.joined().uppercased()
    }
}

#Preview {
    FallLeaderboardView()
}