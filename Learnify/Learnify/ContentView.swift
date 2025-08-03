//
//  ContentView.swift
//  Learnify
//
//  Created by Harry Taiwan on 2025/7/1.
//

import SwiftUI

struct ContentView: View {
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
            
            SubmissionView()
                .tabItem {
                    Image(systemName: "arrow.up.doc")
                    Text("Submit")
                }
            
            ProjectSubmissionsView()
                .tabItem {
                    Image(systemName: "star.circle")
                    Text("Projects")
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
    }
}

#Preview {
    ContentView()
}
