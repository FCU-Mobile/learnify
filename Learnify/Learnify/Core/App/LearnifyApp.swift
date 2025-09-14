//
//  LearnifyApp.swift
//  Learnify
//
//  Created by Harry Taiwan on 2025/7/1.
//

import SwiftUI

@main
struct LearnifyApp: App {
    @State var authService = AuthenticationService()
    @State var semesterService = SemesterService()

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isAuthenticated {
                    ContentView()
                } else {
                    LoginView()
                }
            }
            .environment(authService)
            .environment(semesterService)
            .frame(minWidth: 400, minHeight: 600)
            #if os(macOS)
            .frame(idealWidth: 500, idealHeight: 700)
            #endif
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}
