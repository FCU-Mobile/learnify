//
//  ProjectSubmissionsView.swift
//  Learnify
//
//  Created by Claude on 2025/8/3.
//

import SwiftUI

struct ProjectSubmissionsView: View {
    @State private var projects: [Submission] = []
    @State private var selectedProjectType: ProjectTypeFilter = .all
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var selectedProject: Submission?
    @State private var showingProjectDetail = false
    
    // User info for voting/feedback
    @AppStorage("student_id") private var storedStudentId: String = ""
    @AppStorage("student_name") private var storedStudentName: String = ""
    
    enum ProjectTypeFilter: String, CaseIterable {
        case all = "all"
        case midterm = "midterm"
        case final = "final"
        
        var displayName: String {
            switch self {
            case .all: return "All Projects"
            case .midterm: return "Midterm Projects"
            case .final: return "Final Projects"
            }
        }
        
        var icon: String {
            switch self {
            case .all: return "square.grid.2x2"
            case .midterm: return "star.fill"
            case .final: return "crown.fill"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Section
                filterSection
                
                // Projects List
                if isLoading && projects.isEmpty {
                    loadingView
                } else if projects.isEmpty {
                    emptyStateView
                } else {
                    projectsList
                }
            }
            .navigationTitle("Project Submissions")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadProjects()
            }
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .sheet(item: $selectedProject) { project in
                ProjectDetailView(project: project, studentId: storedStudentId, studentName: storedStudentName)
            }
        }
    }
    
    // MARK: - Filter Section
    private var filterSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Filter by Type")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10) {
                ForEach(ProjectTypeFilter.allCases, id: \.self) { filter in
                    Button(action: {
                        selectedProjectType = filter
                        loadProjects()
                    }) {
                        VStack(spacing: 6) {
                            Image(systemName: filter.icon)
                                .font(.title3)
                                .foregroundColor(selectedProjectType == filter ? .white : .blue)
                            Text(filter.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(selectedProjectType == filter ? .white : .primary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(height: 50)
                        .frame(maxWidth: .infinity)
                        .background(selectedProjectType == filter ? Color.blue : Color.blue.opacity(0.1))
                        .cornerRadius(10)
                    }
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.05))
    }
    
    // MARK: - Projects List
    private var projectsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(projects) { project in
                    ProjectCard(project: project) {
                        selectedProject = project
                    }
                }
            }
            .padding()
        }
        .refreshable {
            loadProjects()
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading projects...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.badge.questionmark")
                .font(.system(size: 48))
                .foregroundColor(.gray)
            
            Text("No Projects Found")
                .font(.headline)
                .foregroundColor(.primary)
            
            Text("No project submissions match the current filter.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    // MARK: - Methods
    private func loadProjects() {
        isLoading = true
        errorMessage = ""
        
        Task {
            do {
                let response = try await APIService.shared.getProjectSubmissions(
                    projectType: selectedProjectType.rawValue,
                    limit: 50,
                    offset: 0
                )
                
                await MainActor.run {
                    self.projects = response.data.projects
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Project Card View
struct ProjectCard: View {
    let project: Submission
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                // Header with project type and votes
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
                    
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .font(.caption)
                            .foregroundColor(.red)
                        Text("\(project.total_votes ?? 0)")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                }
                
                // Title and student
                VStack(alignment: .leading, spacing: 4) {
                    Text(project.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                    
                    Text("by \(project.student_name ?? project.student_id)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Description (if available)
                if let description = project.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                // Tags
                if let tags = project.tags, !tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(4)
                            }
                        }
                        .padding(.horizontal, 1)
                    }
                }
                
                // Stats row
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "message")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Text("\(project.feedback_count ?? 0)")
                            .font(.caption)
                    }
                    
                    if let rating = project.average_rating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                        }
                    }
                    
                    Spacer()
                    
                    Text(formatDate(project.created_at))
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
    
    private var projectTypeIcon: String {
        switch project.project_type {
        case "midterm": return "star.fill"
        case "final": return "crown.fill"
        default: return "doc"
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .short
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

#Preview {
    ProjectSubmissionsView()
}