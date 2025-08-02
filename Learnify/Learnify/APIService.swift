//
//  APIService.swift
//  Learnify
//
//  Created by Claude on 2025/7/1.
//

import Foundation

final class APIService: NSObject, URLSessionTaskDelegate {
    static let shared = APIService()
    private override init() {}
    
    #if DEBUG
    private let baseURL = "http://localhost:3000"
    #else
    private let baseURL = "https://learnify-api.zeabur.app"
    #endif

    // MARK: - Check-In
    func checkIn(studentId: String, fullName: String) async throws -> CheckInResponse {
        let url = URL(string: "\(baseURL)/api/auto/check-in")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 30
        request.httpBody = try JSONEncoder().encode(CheckInRequest(student_id: studentId, full_name: fullName))
        
        // Debug: Print platform and request info
        #if targetEnvironment(simulator)
        print("🔍 Running on iOS Simulator")
        #else
        print("🔍 Running on physical device")
        #endif
        
        print("📤 Request URL: \(url.absoluteString)")
        print("📤 Request headers: \(request.allHTTPHeaderFields ?? [:])")
        
        // Use different URLSession configuration for iOS simulator
        let config: URLSessionConfiguration
        #if targetEnvironment(simulator)
        // iOS Simulator-specific configuration
        config = URLSessionConfiguration.default
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        config.httpMaximumConnectionsPerHost = 1
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        print("🔧 Using iOS Simulator-optimized configuration")
        #else
        // Physical device configuration
        config = URLSessionConfiguration.default
        print("🔧 Using default configuration for physical device")
        #endif
        
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        let maxRetries = 3
        var lastError: Error?
        
        for attempt in 1...maxRetries {
            do {
                print("🔄 Attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type")
                    throw APIError.invalidResponse
                }
                
                print("✅ HTTP Status: \(httpResponse.statusCode)")
                print("📥 Response headers: \(httpResponse.allHeaderFields)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                print("✅ Successful response received")
                return try JSONDecoder().decode(CheckInResponse.self, from: data)
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                print("⚠️ URLError details: code=\(error.code.rawValue), description=\(error.localizedDescription)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Request failed with error: \(error)")
                if let urlError = error as? URLError {
                    print("❌ URLError details: code=\(urlError.code.rawValue), description=\(urlError.localizedDescription)")
                }
                throw error
            }
        }
        throw lastError ?? APIError.networkError("The operation failed after multiple retries.")
    }
    
    // MARK: - HTTP/2 Protocol Logging (Optional)
    func urlSession(_ session: URLSession, task: URLSessionTask, didFinishCollecting metrics: URLSessionTaskMetrics) {
        for transaction in metrics.transactionMetrics {
            print("Protocol used: \(transaction.networkProtocolName ?? "unknown")")
        }
    }

    // MARK: - Get All Students
    func getAllStudents() async throws -> [Student] {
        let url = URL(string: "\(baseURL)/api/auto/students")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching students from: \(url.absoluteString)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Students request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for students")
                    throw APIError.invalidResponse
                }
                
                print("✅ Students HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Students server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                // Parse the students response
                let studentsResponse = try JSONDecoder().decode(StudentsResponse.self, from: data)
                print("✅ Successfully fetched \(studentsResponse.data.students.count) students")
                return studentsResponse.data.students
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching students (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Students request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch students after multiple retries.")
    }
    
    // MARK: - Get Student Check-ins
    func getStudentCheckIns(studentId: String) async throws -> [StudentCheckIn] {
        let url = URL(string: "\(baseURL)/api/auto/check-ins/\(studentId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching check-ins for student: \(studentId)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Check-ins request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for check-ins")
                    throw APIError.invalidResponse
                }
                
                print("✅ Check-ins HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Check-ins server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                // Parse the check-ins response
                let checkInsResponse = try JSONDecoder().decode(CheckInsResponse.self, from: data)
                print("✅ Successfully fetched \(checkInsResponse.data.check_ins.count) check-ins")
                return checkInsResponse.data.check_ins
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching check-ins (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Check-ins request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch check-ins after multiple retries.")
    }
    
    // MARK: - Submit Review
    func submitReview(studentId: String, mobileAppName: String, reviewText: String) async throws -> ReviewResponse {
        let url = URL(string: "\(baseURL)/api/reviews")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        let reviewData = ReviewRequest(
            student_id: studentId,
            mobile_app_name: mobileAppName,
            review_text: reviewText
        )
        
        print("📤 Submitting review: \(studentId) - \(mobileAppName)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                let jsonData = try JSONEncoder().encode(reviewData)
                request.httpBody = jsonData
                
                print("🔄 Review submission attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for review")
                    throw APIError.invalidResponse
                }
                
                print("✅ Review HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Review server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let reviewResponse = try JSONDecoder().decode(ReviewResponse.self, from: data)
                print("✅ Review submitted successfully")
                return reviewResponse
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost submitting review (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Review submission failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to submit review after multiple retries.")
    }
    
    // MARK: - Get All Reviews
    func getAllReviews(params: [String: String] = [:]) async throws -> [StudentReview] {
        var urlComponents = URLComponents(string: "\(baseURL)/api/reviews")!
        
        if !params.isEmpty {
            urlComponents.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching all reviews")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Reviews request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for reviews")
                    throw APIError.invalidResponse
                }
                
                print("✅ Reviews HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Reviews server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let reviewsResponse = try JSONDecoder().decode(ReviewsResponse.self, from: data)
                print("✅ Successfully fetched \(reviewsResponse.data.reviews.count) reviews")
                return reviewsResponse.data.reviews
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching reviews (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Reviews request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch reviews after multiple retries.")
    }
    
    // MARK: - Leaderboard
    func getLeaderboard(limit: Int = 50, offset: Int = 0) async throws -> [LeaderboardEntry] {
        var urlComponents = URLComponents(string: "\(baseURL)/api/leaderboard")!
        urlComponents.queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "offset", value: String(offset))
        ]
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching leaderboard")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Leaderboard request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for leaderboard")
                    throw APIError.invalidResponse
                }
                
                print("✅ Leaderboard HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Leaderboard server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let leaderboardResponse = try JSONDecoder().decode(LeaderboardResponse.self, from: data)
                print("✅ Successfully fetched \(leaderboardResponse.data.leaderboard.count) leaderboard entries")
                return leaderboardResponse.data.leaderboard
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching leaderboard (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Leaderboard request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch leaderboard after multiple retries.")
    }
    
    // MARK: - Get Student Reviews
    func getStudentReviews(studentId: String, params: [String: String] = [:]) async throws -> StudentReviewsResponse {
        var urlComponents = URLComponents(string: "\(baseURL)/api/reviews/\(studentId)")!
        
        if !params.isEmpty {
            urlComponents.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching student reviews for: \(studentId)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Student reviews request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for student reviews")
                    throw APIError.invalidResponse
                }
                
                print("✅ Student reviews HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Student reviews server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let reviewsResponse = try JSONDecoder().decode(StudentReviewsResponse.self, from: data)
                print("✅ Successfully fetched \(reviewsResponse.data.reviews.count) student reviews")
                return reviewsResponse
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching student reviews (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Student reviews request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch student reviews after multiple retries.")
    }
    
    // MARK: - Lessons
    func getCurrentLesson(includePlan: Bool = true) async throws -> LessonDetail? {
        var urlComponents = URLComponents(string: "\(baseURL)/api/lessons/current")!
        if includePlan {
            urlComponents.queryItems = [URLQueryItem(name: "include_plan", value: "true")]
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching current lesson")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Current lesson request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for current lesson")
                    throw APIError.invalidResponse
                }
                
                print("✅ Current lesson HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Current lesson server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let lessonResponse = try JSONDecoder().decode(CurrentLessonResponse.self, from: data)
                print("✅ Successfully fetched current lesson: \(lessonResponse.data?.name ?? "None")")
                return lessonResponse.data
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching current lesson (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Current lesson request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch current lesson after multiple retries.")
    }
    
    func getAllLessons(status: String? = nil, includePlan: Bool = true) async throws -> [LessonDetail] {
        var urlComponents = URLComponents(string: "\(baseURL)/api/lessons")!
        
        var queryItems: [URLQueryItem] = []
        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: status))
        }
        if includePlan {
            queryItems.append(URLQueryItem(name: "include_plan", value: "true"))
        }
        
        if !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching all lessons")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 All lessons request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for lessons")
                    throw APIError.invalidResponse
                }
                
                print("✅ All lessons HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ All lessons server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let lessonsResponse = try JSONDecoder().decode(LessonsResponse.self, from: data)
                print("✅ Successfully fetched \(lessonsResponse.data.count) lessons")
                return lessonsResponse.data
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching lessons (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Lessons request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch lessons after multiple retries.")
    }
    
    func getLesson(id: String, includePlan: Bool = true) async throws -> LessonDetail? {
        var urlComponents = URLComponents(string: "\(baseURL)/api/lessons/\(id)")!
        if includePlan {
            urlComponents.queryItems = [URLQueryItem(name: "include_plan", value: "true")]
        }
        
        guard let url = urlComponents.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching lesson \(id)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Lesson \(id) request attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for lesson \(id)")
                    throw APIError.invalidResponse
                }
                
                print("✅ Lesson \(id) HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Lesson \(id) server error: \(httpResponse.statusCode)")
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let lessonResponse = try JSONDecoder().decode(LessonResponse.self, from: data)
                print("✅ Successfully fetched lesson \(id): \(lessonResponse.data?.name ?? "Not found")")
                return lessonResponse.data
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost fetching lesson \(id) (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Lesson \(id) request failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to fetch lesson \(id) after multiple retries.")
    }
    
    // MARK: - Submissions
    func submitSubmission(studentId: String, fullName: String, submissionType: String, title: String, description: String?, githubURL: String?, imageData: Data?) async throws -> SubmissionResponse {
        let url = URL(string: "\(baseURL)/api/submissions")!
        
        // Create multipart form data
        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 60 // Longer timeout for file uploads
        
        var body = Data()
        
        // Add form fields
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"student_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(studentId)\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"full_name\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(fullName)\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"submission_type\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(submissionType)\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"title\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(title)\r\n".data(using: .utf8)!)
        
        if let description = description {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"description\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(description)\r\n".data(using: .utf8)!)
        }
        
        if let githubURL = githubURL {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"github_url\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(githubURL)\r\n".data(using: .utf8)!)
        }
        
        // Add file data if present
        if let imageData = imageData {
            let fileName = "submission_\(studentId)_\(Date().timeIntervalSince1970).jpg"
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(imageData)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        print("📤 Submitting submission: \(studentId) - \(title)")
        print("📤 Submission type: \(submissionType)")
        print("📤 File size: \(imageData?.count ?? 0) bytes")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60.0
        config.timeoutIntervalForResource = 120.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.httpMaximumConnectionsPerHost = 1
        let session = URLSession(configuration: config)

        let maxRetries = 3
        var lastError: Error?

        for attempt in 1...maxRetries {
            do {
                print("🔄 Submission attempt \(attempt)/\(maxRetries)")
                let (data, response) = try await session.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for submission")
                    throw APIError.invalidResponse
                }
                
                print("✅ Submission HTTP Status: \(httpResponse.statusCode)")
                
                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ Submission server error: \(httpResponse.statusCode)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("❌ Response body: \(responseString)")
                    }
                    throw APIError.serverError(httpResponse.statusCode)
                }
                
                let submissionResponse = try JSONDecoder().decode(SubmissionResponse.self, from: data)
                print("✅ Submission uploaded successfully")
                return submissionResponse
                
            } catch let error as URLError where error.code == .networkConnectionLost && attempt < maxRetries {
                print("⚠️ Network connection lost submitting (Attempt \(attempt)/\(maxRetries)). Error: \(error)")
                lastError = error
                try await Task.sleep(nanoseconds: UInt64(attempt) * 1_000_000_000)
                continue
            } catch {
                print("❌ Submission failed with error: \(error)")
                throw error
            }
        }
        throw lastError ?? APIError.networkError("Failed to submit after multiple retries.")
    }
    
    // MARK: - Admin/Teacher Lesson Management
    
    func updateLessonStatus(id: Int, status: String, authToken: String) async throws -> LessonDetail {
        let url = URL(string: "\(baseURL)/api/lessons/\(id)/status")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        
        let statusUpdate = LessonStatusUpdate(status: status)
        request.httpBody = try JSONEncoder().encode(statusUpdate)
        
        print("📤 Updating lesson \(id) status to \(status)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let updateResponse = try JSONDecoder().decode(LessonUpdateResponse.self, from: data)
        print("✅ Successfully updated lesson \(id) status")
        return updateResponse.data.lesson
    }
    
    func updateLessonURL(id: Int, url: String, authToken: String) async throws -> LessonDetail {
        let requestURL = URL(string: "\(baseURL)/api/lessons/\(id)/url")!
        var request = URLRequest(url: requestURL)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        
        let urlUpdate = LessonURLUpdate(further_reading_url: url)
        request.httpBody = try JSONEncoder().encode(urlUpdate)
        
        print("📤 Updating lesson \(id) URL")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let updateResponse = try JSONDecoder().decode(LessonUpdateResponse.self, from: data)
        print("✅ Successfully updated lesson \(id) URL")
        return updateResponse.data.lesson
    }
    
    func updateLessonProgress(lessonId: Int, planItemId: Int, completed: Bool, authToken: String) async throws -> LessonProgressUpdate {
        let url = URL(string: "\(baseURL)/api/lessons/\(lessonId)/progress")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        
        let progressUpdate = LessonProgressRequest(lesson_plan_item_id: planItemId, completed: completed)
        request.httpBody = try JSONEncoder().encode(progressUpdate)
        
        print("📤 Updating lesson \(lessonId) progress for item \(planItemId)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let updateResponse = try JSONDecoder().decode(LessonProgressResponse.self, from: data)
        print("✅ Successfully updated lesson progress")
        return updateResponse.data.progress
    }
    
    // MARK: - Quiz API Methods
    
    func getAvailableQuizzes() async throws -> [Quiz] {
        let url = URL(string: "\(baseURL)/api/quizzes")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching available quizzes")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 60.0
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let quizzesResponse = try JSONDecoder().decode(QuizzesResponse.self, from: data)
        print("✅ Successfully fetched \(quizzesResponse.data.count) quizzes")
        return quizzesResponse.data
    }
    
    func getQuiz(id: Int) async throws -> Quiz {
        let url = URL(string: "\(baseURL)/api/quizzes/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        print("📤 Fetching quiz \(id)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let quizResponse = try JSONDecoder().decode(QuizResponse.self, from: data)
        print("✅ Successfully fetched quiz \(id)")
        return quizResponse.data
    }
    
    func submitQuizAttempt(quiz: Quiz, studentId: String, answers: [Int?], timeTakenMinutes: Int) async throws -> QuizAttempt {
        let url = URL(string: "\(baseURL)/api/quiz-attempts")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Convert answers to submission format
        let answerSubmissions = answers.enumerated().compactMap { index, answer -> QuizAnswerSubmission? in
            guard let selectedAnswer = answer else { return nil }
            return QuizAnswerSubmission(
                question_id: quiz.questions[index].id,
                selected_answer: selectedAnswer
            )
        }
        
        let submission = QuizSubmissionRequest(
            quiz_id: quiz.id,
            student_id: studentId,
            answers: answerSubmissions,
            time_taken_minutes: timeTakenMinutes
        )
        
        request.httpBody = try JSONEncoder().encode(submission)
        
        print("📤 Submitting quiz attempt for student: \(studentId)")
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        let session = URLSession(configuration: config)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let attemptResponse = try JSONDecoder().decode(QuizAttemptResponse.self, from: data)
        print("✅ Successfully submitted quiz attempt")
        return attemptResponse.data.attempt
    }
}

// MARK: - Data Models

struct Student: Codable, Identifiable {
    let id: String
    let student_id: String
    let full_name: String
    let created_at: String
}

struct StudentsResponse: Codable {
    let success: Bool
    let data: StudentsData
}

struct StudentsData: Codable {
    let students: [Student]
    let total: Int
}

struct StudentCheckIn: Codable, Identifiable {
    let id: Int
    let created_at: String
}

struct CheckInsResponse: Codable {
    let success: Bool
    let data: CheckInsData
}

struct CheckInsData: Codable {
    let check_ins: [StudentCheckIn]
}

struct ReviewRequest: Codable {
    let student_id: String
    let mobile_app_name: String
    let review_text: String
}

struct ReviewResponse: Codable {
    let success: Bool
    let data: ReviewData
    let message: String
}

struct ReviewData: Codable {
    let review_id: Int
    let student_id: String
    let student_name: String
    let mobile_app_name: String
    let review_text: String
    let submitted_at: String
}

struct StudentReview: Codable, Identifiable {
    let id: Int
    let student_id: String
    let mobile_app_name: String
    let review_text: String
    let created_at: String
    let students: StudentInfo?
}

struct StudentInfo: Codable {
    let full_name: String
}

struct ReviewsResponse: Codable {
    let success: Bool
    let data: ReviewsData
}

struct ReviewsData: Codable {
    let reviews: [StudentReview]
    let total_reviews: Int
    let showing: ShowingInfo
}

struct ShowingInfo: Codable {
    let limit: Int
    let offset: Int
    let app_name_filter: String?
}

struct StudentReviewsResponse: Codable {
    let success: Bool
    let data: StudentReviewsData
}

struct StudentReviewsData: Codable {
    let reviews: [StudentReview]
    let total_reviews: Int
    let showing: ShowingInfo
}

struct CheckInRequest: Codable {
    let student_id: String
    let full_name: String
}

struct CheckInResponse: Codable {
    let success: Bool
    let message: String
    let data: CheckInData?
}

struct CheckInData: Codable {
    let check_in_id: Int
    let student_id: String
    let student_name: String
    let checked_in_at: String
    let is_new_student: Bool
}

// MARK: - Error Handling

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(Int)
    case decodingError
    case networkError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The server URL is invalid."
        case .invalidResponse:
            return "The server returned an invalid or unexpected response."
        case .serverError(let code):
            return "The server returned an error with status code: \(code)."
        case .decodingError:
            return "Failed to decode the server's response. The data format may be incorrect."
        case .networkError(let message):
            return "A network error occurred: \(message)"
        }
    }
}

// MARK: - Leaderboard Data Models

struct LeaderboardEntry: Codable, Identifiable {
    let student_id: String
    let full_name: String
    let total_marks: Int
    let total_check_ins: Int
    let latest_check_in: String?
    let rank: Int
    
    var id: String { student_id }
}

struct LeaderboardResponse: Codable {
    let success: Bool
    let data: LeaderboardData
}

struct LeaderboardData: Codable {
    let leaderboard: [LeaderboardEntry]
    let total_students: Int
    let showing: LeaderboardPagination
}

struct LeaderboardPagination: Codable {
    let limit: Int
    let offset: Int
    let total_pages: Int?
    let current_page: Int?
}

// MARK: - Lesson Data Models

struct LessonDetail: Codable, Identifiable {
    let id: String
    let lesson_number: Int
    let name: String
    let description: String?
    let scheduled_date: String
    let status: String
    let topic_name: String?
    let icon: String?
    let color: String?
    let button_color: String?
    let further_reading_url: String?
    let lesson_content: [String]?
    let created_at: String
    let updated_at: String
    let plan: [LessonPlanItem]?
    let completion_percentage: Double?
    
    // Computed properties for compatibility with existing code
    var lesson_plan_items: [LessonPlanItem]? {
        return plan
    }
    
    var lesson_content_string: String? {
        return lesson_content?.joined(separator: "\n")
    }
}

struct LessonPlanItem: Codable, Identifiable {
    let id: String?
    let title: String?
    let required: Bool?
    let completed: Bool?
    
    // Computed properties for compatibility with existing code
    var is_required: Bool {
        return required ?? false
    }
    var lesson_id: Int { return 0 } // Not provided by backend
    var sort_order: Int { return 0 } // Not provided by backend
    var created_at: String { return "" } // Not provided by backend
    var completed_at: String? { return nil } // Not provided by backend
    
    // Generate a fallback ID for Identifiable conformance
    var identifiableId: String {
        return id ?? UUID().uuidString
    }
}

struct CurrentLessonResponse: Codable {
    let success: Bool
    let data: LessonDetail?
}

struct LessonsResponse: Codable {
    let success: Bool
    let data: [LessonDetail]
}

struct LessonResponse: Codable {
    let success: Bool
    let data: LessonDetail?
}

// MARK: - Admin/Teacher Request Models

struct LessonStatusUpdate: Codable {
    let status: String
}

struct LessonURLUpdate: Codable {
    let further_reading_url: String
}

struct LessonProgressRequest: Codable {
    let lesson_plan_item_id: Int
    let completed: Bool
}

// MARK: - Admin/Teacher Response Models

struct LessonUpdateResponse: Codable {
    let success: Bool
    let data: LessonUpdateData
    let message: String
}

struct LessonUpdateData: Codable {
    let lesson: LessonDetail
}

struct LessonProgressResponse: Codable {
    let success: Bool
    let data: LessonProgressData
    let message: String
}

struct LessonProgressData: Codable {
    let progress: LessonProgressUpdate
}

struct LessonProgressUpdate: Codable {
    let lesson_plan_item_id: Int
    let completed: Bool
    let completed_at: String?
    let completed_by_teacher_id: String?
}

// MARK: - Submission Data Models

struct SubmissionResponse: Codable {
    let success: Bool
    let data: SubmissionData
    let message: String
}

struct SubmissionData: Codable {
    let submission: Submission
}

struct Submission: Codable, Identifiable {
    let id: Int
    let student_id: String
    let submission_type: String
    let title: String
    let description: String?
    let file_path: String?
    let file_name: String?
    let file_size: Int?
    let mime_type: String?
    let github_url: String?
    let lesson_id: String?
    let file_url: String?
    let student_name: String?
    let created_at: String
    let updated_at: String
}

// MARK: - Quiz Data Models

struct Quiz: Codable, Identifiable {
    let id: Int
    let title: String
    let description: String?
    let time_limit_minutes: Int
    let total_points: Int
    let is_active: Bool
    let created_at: String
    let updated_at: String
    let questions: [Question]
}

struct Question: Codable, Identifiable {
    let id: Int
    let quiz_id: Int
    let question_text: String
    let question_type: String
    let code_snippet: String?
    let correct_answer: Int
    let points: Int
    let sort_order: Int
    let created_at: String
    let updated_at: String
    let options: [QuestionOption]
}

struct QuestionOption: Codable, Identifiable {
    let id: Int
    let question_id: Int
    let option_text: String
    let option_index: Int
    let created_at: String
}

struct QuizAttempt: Codable, Identifiable {
    let id: Int
    let quiz_id: Int
    let student_id: String
    let student_uuid: String?
    let score: Int
    let total_possible_points: Int
    let percentage: Double
    let time_taken_minutes: Int
    let started_at: String
    let completed_at: String?
    let is_completed: Bool
}

struct QuizAnswer: Codable, Identifiable {
    let id: Int
    let attempt_id: Int
    let question_id: Int
    let selected_answer: Int
    let is_correct: Bool
    let points_earned: Int
    let answered_at: String
}

// MARK: - Quiz API Response Models

struct QuizzesResponse: Codable {
    let success: Bool
    let data: [Quiz]
}

struct QuizResponse: Codable {
    let success: Bool
    let data: Quiz
}

struct QuizAttemptResponse: Codable {
    let success: Bool
    let data: QuizAttemptData
    let message: String
}

struct QuizAttemptData: Codable {
    let attempt: QuizAttempt
}

struct QuizSubmissionRequest: Codable {
    let quiz_id: Int
    let student_id: String
    let answers: [QuizAnswerSubmission]
    let time_taken_minutes: Int
}

struct QuizAnswerSubmission: Codable {
    let question_id: Int
    let selected_answer: Int
}
