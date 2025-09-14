//
//  SemesterService.swift
//  Learnify
//
//  Created by Claude on 2025/1/14.
//

import Foundation
import SwiftUI

@Observable
final class SemesterService {
    static var current: SemesterService?
    
    // MARK: - Published Properties
    var currentSemester: Semester?
    var selectedSemester: String? // semester code
    var availableSemesters: [Semester] = []
    var loading = true
    var error: String?
    
    init() {
        SemesterService.current = self
        // Initialize from UserDefaults if available, default to fall_2025
        self.selectedSemester = UserDefaults.standard.string(forKey: "selectedSemester") ?? "fall_2025"
        print("SemesterService: Initializing with stored semester: \(selectedSemester ?? "nil")")
        
        Task {
            await loadSemesterData()
        }
    }
    
    // MARK: - Public Methods
    
    @MainActor
    func loadSemesterData() async {
        do {
            loading = true
            error = nil
            
            // Load all available semesters
            let semestersResponse = try await APIService.shared.getSemesters()
            availableSemesters = semestersResponse.data.semesters
            
            // Validate that the stored selected semester is still available
            let storedSemester = UserDefaults.standard.string(forKey: "selectedSemester")
            let isStoredSemesterValid = storedSemester != nil && 
                availableSemesters.contains { $0.code == storedSemester }
            
            // Get current semester
            do {
                let currentResponse = try await APIService.shared.getCurrentSemester()
                currentSemester = currentResponse.data.semester
                
                // Set selected semester: use stored if valid, otherwise use current
                if !isStoredSemesterValid {
                    let currentCode = currentResponse.data.semester.code
                    selectedSemester = currentCode
                    UserDefaults.standard.set(currentCode, forKey: "selectedSemester")
                }
            } catch {
                // If no current semester, use fall_2025 or first available
                if !isStoredSemesterValid {
                    if availableSemesters.contains(where: { $0.code == "fall_2025" }) {
                        selectedSemester = "fall_2025"
                        UserDefaults.standard.set("fall_2025", forKey: "selectedSemester")
                    } else if !availableSemesters.isEmpty {
                        let firstSemester = availableSemesters[0]
                        selectedSemester = firstSemester.code
                        UserDefaults.standard.set(firstSemester.code, forKey: "selectedSemester")
                    }
                }
            }
        } catch {
            print("Error loading semester data: \(error)")
            self.error = error.localizedDescription
        }
        
        loading = false
    }
    
    @MainActor
    func switchSemester(_ semesterCode: String) {
        print("SemesterService: Switching semester to \(semesterCode)")
        // Save to UserDefaults
        UserDefaults.standard.set(semesterCode, forKey: "selectedSemester")
        selectedSemester = semesterCode
        print("SemesterService: UserDefaults updated")
    }
    
    func getCurrentSemesterHeader() -> [String: String] {
        guard let selectedSemester = selectedSemester else { return [:] }
        return ["x-semester-code": selectedSemester]
    }
    
    func getFormattedSemesterName(_ semesterCode: String) -> String {
        // Convert codes like "fall_2025" to "Fall 2025"
        let components = semesterCode.split(separator: "_")
        if components.count == 2 {
            let season = String(components[0]).capitalized
            let year = String(components[1])
            return "\(season) \(year)"
        }
        return semesterCode.capitalized
    }
    
    var formattedSelectedSemester: String {
        guard let selectedSemester = selectedSemester else { return "Semester" }
        return getFormattedSemesterName(selectedSemester)
    }
    
    var shouldHideCheckIn: Bool {
        guard let selectedSemester = selectedSemester else { return false }
        return selectedSemester.lowercased().contains("fall")
    }
}

// MARK: - Data Models

struct Semester: Codable, Identifiable, Hashable {
    let id: String
    let code: String
    let name: String
    let start_date: String
    let end_date: String
    let is_current: Bool
    let is_active: Bool
    let created_at: String
    let updated_at: String
}

struct SemesterConfig: Codable {
    let id: String
    let semester_id: String
    let check_in_points: Int
    let review_points: Int
    let midterm_project_points: Int
    let final_project_points: Int
    let note_points: Int
    let vote_points: Int
    let bonus_points: Int
    let created_at: String
    let updated_at: String
}

struct SemesterStats: Codable {
    let total_check_ins: Int
    let total_submissions: Int
    let total_votes: Int
    let total_notes: Int
}

// MARK: - Response Models

struct SemestersResponse: Codable {
    let success: Bool
    let data: SemestersData
}

struct SemestersData: Codable {
    let semesters: [Semester]
}

struct CurrentSemesterResponse: Codable {
    let success: Bool
    let data: CurrentSemesterData
}

struct CurrentSemesterData: Codable {
    let semester: Semester
}

struct SemesterResponse: Codable {
    let success: Bool
    let data: SemesterResponseData
}

struct SemesterResponseData: Codable {
    let semester: Semester
}

struct SemesterConfigResponse: Codable {
    let success: Bool
    let data: SemesterConfigData
}

struct SemesterConfigData: Codable {
    let semester: Semester
    let config: SemesterConfig
}

struct SemesterStatsResponse: Codable {
    let success: Bool
    let data: SemesterStatsData
}

struct SemesterStatsData: Codable {
    let semester: Semester
    let stats: SemesterStats
}