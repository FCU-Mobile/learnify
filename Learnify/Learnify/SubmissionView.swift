//
//  SubmissionView.swift
//  Learnify
//
//  Created by Claude on 2025/7/16.
//

import SwiftUI
import PhotosUI

struct SubmissionView: View {
    @State private var submissionType: SubmissionType = .screenshot
    @State private var title = ""
    @State private var description = ""
    @State private var githubURL = ""
    @State private var selectedImage: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var isUploading = false
    @State private var uploadMessage = ""
    @State private var showAlert = false
    @State private var alertMessage = ""
    @State private var showingPhotoPicker = false
    
    // User info - use AppStorage consistent with other features
    @AppStorage("student_id") private var storedStudentId: String = ""
    @AppStorage("student_name") private var storedStudentName: String = ""
    
    enum SubmissionType: String, CaseIterable {
        case screenshot = "screenshot"
        case githubRepo = "github_repo"
        
        var displayName: String {
            switch self {
            case .screenshot: return "Screenshot"
            case .githubRepo: return "GitHub Repo"
            }
        }
        
        var icon: String {
            switch self {
            case .screenshot: return "camera"
            case .githubRepo: return "link"
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // User Info Section
                    if storedStudentId.isEmpty || storedStudentName.isEmpty {
                        userInfoMissingSection
                    } else {
                        userDisplaySection
                    }
                    
                    // Submission Type Selection
                    submissionTypeSection
                    
                    // Title Input
                    titleSection
                    
                    // Description Input
                    descriptionSection
                    
                    // Conditional inputs based on submission type
                    if submissionType == .githubRepo {
                        githubURLSection
                    } else {
                        fileUploadSection
                    }
                    
                    // Submit Button
                    submitSection
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Submit Work")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadUserInfo()
            }
        }
        .alert("Submission Status", isPresented: $showAlert) {
            Button("OK") { }
        } message: {
            Text(alertMessage)
        }
    }
    
    // MARK: - User Info Section
    private var userInfoMissingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Student Information Required")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack {
                Image(systemName: "exclamationmark.triangle")
                    .font(.title2)
                    .foregroundColor(.orange)
                Text("Please complete check-in first to set up your student information.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
                Spacer()
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .cornerRadius(10)
        }
    }
    
    private var userDisplaySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Student Information")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack {
                Image(systemName: "person.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
                VStack(alignment: .leading) {
                    Text(storedStudentName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text(storedStudentId)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
        }
    }
    
    // MARK: - Submission Type Section
    private var submissionTypeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Submission Type")
                .font(.headline)
                .foregroundColor(.primary)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 10) {
                ForEach(SubmissionType.allCases, id: \.self) { type in
                    Button(action: {
                        submissionType = type
                        // Reset form when changing type
                        selectedImage = nil
                        selectedImageData = nil
                        githubURL = ""
                    }) {
                        VStack(spacing: 8) {
                            Image(systemName: type.icon)
                                .font(.title2)
                                .foregroundColor(submissionType == type ? .white : .blue)
                            Text(type.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(submissionType == type ? .white : .primary)
                        }
                        .frame(height: 60)
                        .frame(maxWidth: .infinity)
                        .background(submissionType == type ? Color.blue : Color.blue.opacity(0.1))
                        .cornerRadius(10)
                    }
                }
            }
        }
    }
    
    // MARK: - Title Section
    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Title")
                .font(.headline)
                .foregroundColor(.primary)
            
            TextField("Enter submission title", text: $title)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.words)
        }
    }
    
    // MARK: - Description Section
    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Description")
                .font(.headline)
                .foregroundColor(.primary)
            
            TextField("Optional description", text: $description, axis: .vertical)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .lineLimit(3...6)
                .autocapitalization(.sentences)
        }
    }
    
    // MARK: - GitHub URL Section
    private var githubURLSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("GitHub Repository URL")
                .font(.headline)
                .foregroundColor(.primary)
            
            TextField("https://github.com/username/repository", text: $githubURL)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .keyboardType(.URL)
        }
    }
    
    // MARK: - File Upload Section
    private var fileUploadSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("File")
                .font(.headline)
                .foregroundColor(.primary)
            
            if let imageData = selectedImageData, let uiImage = UIImage(data: imageData) {
                // Show selected image
                VStack(spacing: 12) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 200)
                        .cornerRadius(10)
                    
                    HStack {
                        Button("Remove") {
                            selectedImage = nil
                            selectedImageData = nil
                        }
                        .foregroundColor(.red)
                        
                        Spacer()
                        
                        Button("Change") {
                            showingPhotoPicker = true
                        }
                        .foregroundColor(.blue)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(10)
            } else {
                // Show upload button
                Button(action: {
                    showingPhotoPicker = true
                }) {
                    VStack(spacing: 12) {
                        Image(systemName: "plus.circle")
                            .font(.largeTitle)
                            .foregroundColor(.blue)
                        
                        Text("Select Screenshot")
                            .font(.subheadline)
                            .foregroundColor(.blue)
                        
                        Text("Tap to choose from Photos")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 120)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.blue, style: StrokeStyle(lineWidth: 2, dash: [5]))
                    )
                }
            }
        }
        .photosPicker(isPresented: $showingPhotoPicker, selection: $selectedImage, matching: .images)
        .onChange(of: selectedImage) { _, newValue in
            Task {
                if let data = try? await newValue?.loadTransferable(type: Data.self) {
                    selectedImageData = data
                    // Auto-set title if not provided
                    if title.isEmpty {
                        title = "Screenshot - \(Date().formatted(date: .abbreviated, time: .shortened))"
                    }
                }
            }
        }
    }
    
    // MARK: - Submit Section
    private var submitSection: some View {
        VStack(spacing: 12) {
            if !uploadMessage.isEmpty {
                Text(uploadMessage)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            Button(action: submitSubmission) {
                HStack {
                    if isUploading {
                        ProgressView()
                            .scaleEffect(0.8)
                            .foregroundColor(.white)
                    } else {
                        Image(systemName: "arrow.up.circle")
                            .font(.title3)
                    }
                    Text(isUploading ? "Uploading..." : "Submit")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(canSubmit ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(!canSubmit || isUploading)
        }
    }
    
    // MARK: - Computed Properties
    private var canSubmit: Bool {
        guard !storedStudentId.isEmpty && !storedStudentName.isEmpty && !title.isEmpty else { return false }
        
        switch submissionType {
        case .githubRepo:
            return !githubURL.isEmpty
        case .screenshot:
            return selectedImageData != nil
        }
    }
    
    // MARK: - Methods
    private func loadUserInfo() {
        // AppStorage automatically handles loading, no need for manual UserDefaults
        // storedStudentId and storedStudentName are automatically loaded from AppStorage
    }
    
    private func submitSubmission() {
        guard canSubmit else { return }
        
        isUploading = true
        uploadMessage = "Preparing submission..."
        
        Task {
            do {
                let _ = try await APIService.shared.submitSubmission(
                    studentId: storedStudentId,
                    fullName: storedStudentName,
                    submissionType: submissionType.rawValue,
                    title: title,
                    description: description.isEmpty ? nil : description,
                    githubURL: githubURL.isEmpty ? nil : githubURL,
                    imageData: selectedImageData
                )
                
                await MainActor.run {
                    isUploading = false
                    uploadMessage = ""
                    alertMessage = "Submission uploaded successfully!"
                    showAlert = true
                    
                    // Reset form
                    title = ""
                    description = ""
                    githubURL = ""
                    selectedImage = nil
                    selectedImageData = nil
                    submissionType = .screenshot
                }
            } catch {
                await MainActor.run {
                    isUploading = false
                    uploadMessage = ""
                    alertMessage = "Upload failed: \(error.localizedDescription)"
                    showAlert = true
                }
            }
        }
    }
}


#Preview {
    SubmissionView()
}
