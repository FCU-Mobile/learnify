//
//  ContentView.swift
//  Learnify
//
//  Created by Harry Taiwan on 2025/7/1.
//

import SwiftUI

struct ContentView: View {
    @State private var showingQuiz = false
    
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Image(systemName: "house")
                    Text("Dashboard")
                }
            
            CheckInView()
                .tabItem {
                    Image(systemName: "checkmark.circle")
                    Text("Check In")
                }
            
            LessonView()
                .tabItem {
                    Image(systemName: "book")
                    Text("Lesson")
                }
            
            Button(action: {
                showingQuiz = true
            }) {
                VStack {
                    Image(systemName: "brain.head.profile")
                    Text("Quiz")
                }
            }
            .tabItem {
                Image(systemName: "brain.head.profile")
                Text("Quiz")
            }
            
            SubmissionView()
                .tabItem {
                    Image(systemName: "arrow.up.doc")
                    Text("Submit")
                }
            
            ReviewSubmissionView()
                .tabItem {
                    Image(systemName: "bubble.left.and.bubble.right")
                    Text("Review")
                }
            
            SettingsView()
                .tabItem {
                    Image(systemName: "gear")
                    Text("Settings")
                }
        }
        .accentColor(.blue)
        .sheet(isPresented: $showingQuiz) {
            QuizView(studentId: "D0123456", studentName: "Sample Student")
        }
    }
}

#Preview {
    ContentView()
}
