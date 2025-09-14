//
//  LessonView.swift
//  Learnify
//
//  Created by Claude on 2025/7/15.
//

import SwiftUI

struct LessonView: View {
    @State private var lessons: [LessonDetail] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @Environment(SemesterService.self) private var semesterService
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if isLoading {
                    ProgressView("Loading lessons...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 60))
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Lessons")
                            .font(.title2)
                            .fontWeight(.medium)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Retry") {
                            loadLessons()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !lessons.isEmpty {
                    List {
                        ForEach(lessons.sorted(by: { $0.lesson_number < $1.lesson_number })) { lesson in
                            NavigationLink(destination: LessonDetailView(lesson: lesson)) {
                                LessonRowView(lesson: lesson)
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "book.closed")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        
                        Text("No Lessons Available")
                            .font(.title2)
                            .fontWeight(.medium)
                        
                        Text("Check back later for new lessons or contact your instructor.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Refresh") {
                            loadLessons()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Lessons")
            .onAppear {
                loadLessons()
            }
            .refreshable {
                await loadLessonsAsync()
            }
            .onChange(of: semesterService.selectedSemester) { oldValue, newValue in
                print("📚 [iOS] Semester changed: \(oldValue ?? "nil") → \(newValue ?? "nil")")
                loadLessons()
            }
            .appToolbar()
        }
    }
    
    private func loadLessons() {
        print("📚 [iOS] LessonView.loadLessons() called - semester: \(semesterService.selectedSemester ?? "nil")")
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                print("📚 [iOS] About to call APIService.getAllLessons() - semester: \(semesterService.selectedSemester ?? "nil")")
                let fetchedLessons = try await APIService.shared.getAllLessons()
                print("📚 [iOS] APIService returned \(fetchedLessons.count) lessons")
                if !fetchedLessons.isEmpty {
                    print("📚 [iOS] First lesson: #\(fetchedLessons[0].lesson_number), Last lesson: #\(fetchedLessons[fetchedLessons.count-1].lesson_number)")
                }
                await MainActor.run {
                    self.lessons = fetchedLessons
                    self.isLoading = false
                }
            } catch {
                print("📚 [iOS] APIService error: \(error)")
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    private func loadLessonsAsync() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let fetchedLessons = try await APIService.shared.getAllLessons()
            await MainActor.run {
                self.lessons = fetchedLessons
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
    
    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "normal":
            return .green
        case "skipped":
            return .orange
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
    
    private func backgroundColorForLesson(_ lesson: LessonDetail) -> Color {
        if let colorHex = lesson.color {
            return Color(hex: colorHex) ?? Color(.systemGray6)
        }
        return Color(.systemGray6)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .none
            return displayFormatter.string(from: date)
        }
        
        return dateString
    }
}

// MARK: - Color Extension
extension Color {
    init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - LessonRowView
struct LessonRowView: View {
    let lesson: LessonDetail
    
    var body: some View {
        HStack(spacing: 12) {
            // Lesson Icon
            if let icon = lesson.icon {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.blue)
                    .frame(width: 30)
            } else {
                Image(systemName: "book")
                    .font(.title2)
                    .foregroundColor(.blue)
                    .frame(width: 30)
            }
            
            // Lesson Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Lesson \(lesson.lesson_number)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    // Status Badge
                    Text(lesson.status.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusColor(for: lesson.status))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                }
                
                Text(lesson.name)
                    .font(.headline)
                    .lineLimit(2)
                
                if let description = lesson.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    if let topicName = lesson.topic_name {
                        Text(topicName)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Text(formatDate(lesson.scheduled_date))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                // Progress if available
                if let completionPercentage = lesson.completion_percentage {
                    HStack {
                        ProgressView(value: completionPercentage / 100.0)
                            .progressViewStyle(LinearProgressViewStyle())
                        
                        Text("\(Int(completionPercentage))%")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "normal":
            return .green
        case "skipped":
            return .orange
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .short
            return displayFormatter.string(from: date)
        }
        
        return dateString
    }
}

// MARK: - LessonDetailView
struct LessonDetailView: View {
    let lesson: LessonDetail
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Lesson Header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        if let icon = lesson.icon {
                            Image(systemName: icon)
                                .font(.title2)
                                .foregroundColor(.blue)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(lesson.name)
                                .font(.largeTitle)
                                .fontWeight(.bold)
                            
                            HStack {
                                Text("Lesson \(lesson.lesson_number)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                if let topicName = lesson.topic_name {
                                    Text("• \(topicName)")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        
                        Spacer()
                    }
                    
                    if let description = lesson.description {
                        Text(description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    
                    // Status Badge
                    HStack {
                        Text(lesson.status.capitalized)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusColor(for: lesson.status))
                            .foregroundColor(.white)
                            .cornerRadius(6)
                        
                        Spacer()
                        
                        Text(formatDate(lesson.scheduled_date))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(backgroundColorForLesson(lesson))
                .cornerRadius(12)
                
                // Lesson Content
                if let content = lesson.lesson_content_string, !content.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Lesson Content")
                            .font(.headline)
                        
                        Text(content)
                            .font(.body)
                    }
                    .padding()
                }
                
                // Lesson Plan Items
                if let planItems = lesson.lesson_plan_items, !planItems.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Lesson Plan")
                            .font(.headline)
                        
                        ForEach(planItems.sorted(by: { $0.sort_order < $1.sort_order }), id: \.identifiableId) { item in
                            HStack(spacing: 12) {
                                Image(systemName: item.completed == true ? "checkmark.circle.fill" : "circle")
                                    .foregroundColor(item.completed == true ? .green : .secondary)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.title ?? "Untitled")
                                        .font(.body)
                                        .strikethrough(item.completed == true)
                                    
                                    if item.is_required {
                                        Text("Required")
                                            .font(.caption2)
                                            .foregroundColor(.orange)
                                    }
                                }
                                
                                Spacer()
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                // Progress Section
                if let completionPercentage = lesson.completion_percentage {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Class Progress")
                            .font(.headline)
                        
                        ProgressView(value: completionPercentage / 100.0)
                            .progressViewStyle(LinearProgressViewStyle())
                        
                        Text("\(Int(completionPercentage))% Complete")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                
                // Further Reading
                if let furtherReadingUrl = lesson.further_reading_url, !furtherReadingUrl.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Further Reading")
                            .font(.headline)
                        
                        Link(destination: URL(string: furtherReadingUrl)!) {
                            HStack {
                                Image(systemName: "link")
                                Text("View Additional Resources")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                            }
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                        }
                    }
                    .padding()
                }
            }
            .padding()
        }
        .navigationTitle("Lesson \(lesson.lesson_number)")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func statusColor(for status: String) -> Color {
        switch status.lowercased() {
        case "normal":
            return .green
        case "skipped":
            return .orange
        case "cancelled":
            return .red
        default:
            return .gray
        }
    }
    
    private func backgroundColorForLesson(_ lesson: LessonDetail) -> Color {
        if let colorHex = lesson.color {
            return Color(hex: colorHex) ?? Color(.systemGray6)
        }
        return Color(.systemGray6)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .none
            return displayFormatter.string(from: date)
        }
        
        return dateString
    }
}

#Preview {
    LessonView()
}
