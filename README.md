# Learnify: The Gamified Learning System

Learnify is a full-stack educational platform designed to make learning more engaging and effective. By incorporating gamification, real-time feedback, and cross-platform accessibility, Learnify provides a modern solution for both students and instructors.

This repository contains the complete source code for the Learnify ecosystem, including a Node.js backend, a React web dashboard, and a native iOS application.

## ✨ Key Features

-   **🧠 Smart Learning Quiz System**: An adaptive quiz engine that personalizes questions based on student performance to ensure mastery of subjects.
-   **📱 Cross-Platform Access**: Learn and manage on the go with a responsive web application and a native SwiftUI iOS app.
-   **🏆 Gamified Experience**: Students earn points for activities like check-ins and quizzes, competing on a live leaderboard.
-   **👨‍🏫 Instructor Dashboard**: A comprehensive web dashboard for instructors to monitor class progress, review submissions, and gain insights into student performance.
-   **🚀 Real-time Updates**: Live data synchronization for leaderboards, check-ins, and student progress across all platforms.
-   **✅ Seamless Integration**: Powered by a robust backend using Node.js, Express, and Supabase for database, authentication, and storage.

## 🏗️ Architecture & Tech Stack

Learnify is built with a modern, decoupled architecture, consisting of three main components:

| Component | Tech Stack                                               | Description                                                                 |
| :-------- | :------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **Backend**   | `Node.js`, `Express`, `TypeScript`, `Supabase`, `PostgreSQL` | A robust API server that handles business logic, data, and authentication.  |
| **Frontend**  | `React`, `TypeScript`, `Vite`, `Tailwind CSS`            | A responsive web dashboard for students and instructors.                    |
| **Mobile**    | `SwiftUI`, `Swift`                                       | A native iOS application offering a seamless mobile learning experience.    |

## 🚀 Getting Started

To get the Learnify platform running locally, you will need to set up the backend and frontend services.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+)
-   [npm](https://www.npmjs.com/) (or `yarn`)
-   [Docker](https://www.docker.com/products/docker-desktop/) (for local Supabase instance)
-   [Supabase CLI](https://supabase.com/docs/guides/cli)

### Local Development

For a complete guide on setting up the local Supabase instance, database migrations, and all services, please refer to the detailed **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)** guide.

A quick-start guide is provided below:

1.  **Start the Backend:**
    ```bash
    # Navigate to the backend directory
    cd backend

    # Install dependencies
    npm install

    # Start the local Supabase stack and the backend server
    npm run dev:local
    ```
    The backend API will be available at `http://localhost:3000`.

2.  **Start the Frontend:**
    ```bash
    # Open a new terminal and navigate to the frontend directory
    cd frontend

    # Install dependencies
    npm install

    # Start the development server
    npm run dev
    ```
    The frontend application will be available at `http://localhost:5173`.

## 📚 Documentation

This project is extensively documented to help developers understand its architecture, features, and deployment process.

-   **[PRD.md](PRD.md)**: The original Product Requirements Document for Learnify.
-   **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**: A comprehensive guide to setting up a local development environment.
-   **[DEPLOYMENT.md](DEPLOYMENT.md)**: Instructions for deploying the application.
-   **[QUIZ_SYSTEM.md](QUIZ_SYSTEM.md)**: A deep dive into the Smart Learning Quiz System.
-   **[API_DESIGN.md](backend/API_DESIGN.md)**: Detailed documentation for the backend API.
-   **[TASKS.md](TASKS.md)**: A list of completed and planned development tasks.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or encounter any issues, please feel free to open an issue or submit a pull request.

## 📄 License

This project is open-source and available under the MIT License.
