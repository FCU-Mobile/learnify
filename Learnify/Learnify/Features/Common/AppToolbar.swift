//
//  AppToolbar.swift
//  Learnify
//
//  Created by Claude on 2025/1/14.
//

import SwiftUI

struct AppToolbar: ToolbarContent {
    @Environment(SemesterService.self) private var semesterService
    
    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .navigationBarTrailing) {
            // Debug semester switcher button
            Button {
                switchToNextSemester(source: "debug")
            } label: {
                Image(systemName: "switch.2")
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(semesterService.shouldHideCheckIn ? .orange : .blue)
            }
            
            // Main menu
            Menu {
                // Semester Switcher
                Button {
                    switchToNextSemester(source: "menu")
                } label: {
                    Label(semesterService.formattedSelectedSemester, systemImage: "calendar")
                }
                
                Divider()
                
                // Settings
                NavigationLink(destination: SettingsView()) {
                    Label("Settings", systemImage: "gear")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.body)
                    .fontWeight(.medium)
            }
        }
    }
    
    private func switchToNextSemester(source: String = "unknown") {
        let availableSemesters = semesterService.availableSemesters
        guard !availableSemesters.isEmpty else { return }
        
        // Find current semester index
        let currentIndex = availableSemesters.firstIndex { $0.code == semesterService.selectedSemester } ?? 0
        
        // Get next semester (cycle back to 0 if at the end)
        let nextIndex = (currentIndex + 1) % availableSemesters.count
        let nextSemester = availableSemesters[nextIndex]
        
        // Debug logging to differentiate sources
        print("🔄 Semester switched via \(source): \(semesterService.selectedSemester ?? "nil") → \(nextSemester.code)")
        
        // Switch to next semester
        semesterService.switchSemester(nextSemester.code)
    }
}

// Extension for easy use
extension View {
    func appToolbar() -> some View {
        self.toolbar {
            AppToolbar()
        }
    }
}