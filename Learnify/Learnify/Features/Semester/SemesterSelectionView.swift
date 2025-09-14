//
//  SemesterSelectionView.swift
//  Learnify
//
//  Created by Claude on 2025/1/14.
//

import SwiftUI

struct SemesterSelectionView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var semesterService: SemesterService
    @State private var localSelectedSemester: String
    
    init(semesterService: SemesterService) {
        self.semesterService = semesterService
        self._localSelectedSemester = State(initialValue: semesterService.selectedSemester ?? "")
    }
    
    var body: some View {
        NavigationStack {
            List {
                if semesterService.loading {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Loading semesters...")
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 8)
                } else if let error = semesterService.error {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.red)
                        .padding(.vertical, 8)
                } else {
                    ForEach(semesterService.availableSemesters) { semester in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(semesterService.getFormattedSemesterName(semester.code))
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                
                                Text(semester.name)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                
                                if semester.is_current {
                                    Text("Current Semester")
                                        .font(.caption2)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 2)
                                        .background(Color.blue, in: Capsule())
                                }
                            }
                            
                            Spacer()
                            
                            if localSelectedSemester == semester.code {
                                Image(systemName: "checkmark")
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(.blue)
                            }
                        }
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            localSelectedSemester = semester.code
                        }
                    }
                }
            }
            .navigationTitle("Select Semester")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        semesterService.switchSemester(localSelectedSemester)
                        dismiss()
                    }
                    .disabled(localSelectedSemester.isEmpty || 
                             localSelectedSemester == semesterService.selectedSemester)
                    .fontWeight(.semibold)
                }
            }
        }
        .task {
            if semesterService.availableSemesters.isEmpty {
                await semesterService.loadSemesterData()
            }
        }
    }
}

#Preview {
    SemesterSelectionView(semesterService: SemesterService())
}