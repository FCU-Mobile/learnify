# Team Management System

## Overview

The team management system enables Fall semester midterm project (Project 1) to be completed in teams of 3-4 students. Each team submits one project that all members contribute to and receive equal scoring for. The final project (Project 2) is individual-only.

## Key Features

### 👥 **Team Formation**
- **Team Size**: 3-4 students per team (enforced by application logic)
- **Team Constraints**: Only applies to Project 1 (Midterm - Team-based)
- **Project 2 (Final)**: Individual submissions only, no team formation allowed
- **Administrative Control**: Teams are created and managed by instructors via the Admin dashboard
- **Semester Isolation**: Teams are specific to each semester and project

### 🏆 **Team Project Submissions**
- **Project 1 (Midterm - 40%)**: Team-based submission
  - One submission per team
  - Shared editing: Any team member can create, modify, or update the team's project
  - Equal scoring: All team members automatically receive the same score
  - Team attribution: Submissions clearly show team information and all team members
- **Project 2 (Final - 50%)**: Individual submission only
  - Each student submits their own project
  - No team collaboration or shared scoring
  - Individual evaluation

## Database Schema

### Core Tables

#### `project_teams`
```sql
CREATE TABLE project_teams (
    id bigserial PRIMARY KEY,
    project_number integer NOT NULL CHECK (project_number IN (1, 2)),
    team_name text NOT NULL,
    semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT unique_team_name_per_project_semester
        UNIQUE (project_number, team_name, semester_id)
);
```

#### `team_members`
```sql
CREATE TABLE team_members (
    id bigserial PRIMARY KEY,
    team_id bigint NOT NULL REFERENCES project_teams(id) ON DELETE CASCADE,
    student_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT unique_student_per_team_project 
        UNIQUE (team_id, student_id)
);
```

#### `submissions` (Enhanced)
- Added `team_id` column to link submissions to teams
- Automatic score propagation through database triggers

### Database Functions

#### `propagate_team_score()`
Automatically creates duplicate submissions for all team members when one member submits:
- Triggers on INSERT/UPDATE of project submissions with `team_id`
- Ensures all team members get the same score
- Maintains referential integrity

#### `get_project_teams()`
Returns team information with member details for a specific project and semester.

#### `can_students_be_grouped()`
Validates that students haven't worked together in previous projects.

#### `get_unassigned_students()`
Returns students not yet assigned to teams for a specific project.

## API Endpoints

### Team Management (`/api/teams/`)

1. **GET `/`**
   - Get all teams for a specific project and semester
   - Query params: `semester_id`, `project_number`

2. **GET `/student/:studentId`**
   - Get student's team for a specific project
   - Query params: `semester_id`, `project_number`
   - Returns team info or null if not in a team

3. **GET `/unassigned`**
   - Get students not assigned to teams
   - Query params: `semester_id`, `project_number`

4. **POST `/`** (Admin only)
   - Create a new team
   - Body: `admin_id`, `semester_id`, `project_number`, `team_name`, `member_ids`

5. **POST `/shuffle`** (Admin only)
   - Automatically shuffle all unassigned students into teams
   - Body: `admin_id`, `semester_id`, `project_number`

6. **POST `/reshuffle`** (Admin only)
   - Delete existing teams and reshuffle all students
   - Body: `admin_id`, `semester_id`, `project_number`

7. **PUT `/:teamId`** (Admin only)
   - Update team name or members
   - Body: `admin_id`, `team_name?`, `member_ids?`

8. **DELETE `/:teamId`** (Admin only)
   - Delete a team
   - Body: `admin_id`

### Enhanced Submission Routes

Project submission routes now support team-based workflows:
- Automatic team detection for project submissions
- Team permission validation for editing
- Duplicate submission prevention per team
- Team member access to modify submissions

## Frontend Components

### Admin Dashboard
- **TeamManagement.tsx**: Complete team management interface
- **ProjectTeams.tsx**: Display teams for a specific project
- **TeamCard.tsx**: Individual team information display

### Student Interface
- **ProjectSubmissionForm.tsx**: Enhanced with team information display
- Shows team context for Fall semester projects
- Clear indication of team submission rules

## Team Formation Rules

### Constraints
1. **Team Size**: 3-4 members (enforced at application level)
2. **Project 1 Only**: Teams can only be formed for Project 1 (Midterm)
3. **Project 2 Individual**: Project 2 (Final) must be individual submissions
4. **One Team Per Project**: Students can only be in one team per project per semester

### Shuffling Algorithm
The system includes an intelligent shuffling algorithm that:
- Prioritizes teams of 3 members (configurable preference)
- Avoids placing students who have worked together before
- Handles remaining students by distribution to existing teams
- Provides fallback options for edge cases

## Project Mapping

For Fall 2025 semester:
- **Project 1 (Midterm - Team)**: `project_number = 1`, `project_type = 'midterm'`, **40% of grade**
- **Project 2 (Final - Individual)**: `project_number = 2`, `project_type = 'final'`, **50% of grade**
- **Quiz**: **10% of grade**

## Usage Workflow

### For Administrators
1. **Create Teams for Project 1**: Use admin dashboard to manually create teams or auto-shuffle (Project 1 only)
2. **Manage Teams**: View, edit, or delete teams for Project 1
3. **Monitor Submissions**:
   - Track team submissions for Project 1 (Midterm)
   - Track individual submissions for Project 2 (Final)
   - Ensure proper score distribution

### For Students
1. **Project 1 (Midterm - Team)**:
   - View team assignment
   - Any team member can submit the team's project
   - Collaborate: All team members can modify team submissions
   - Receive equal scores: Automatic score sharing across team members (40% of grade)
2. **Project 2 (Final - Individual)**:
   - Submit your own individual project
   - No team collaboration or shared scoring
   - Individual evaluation (50% of grade)

## Security & Validation

### Access Control
- Only admin users can create, modify, or delete teams
- Students can only edit their own team's submissions
- Team membership validation for all team-related operations

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate team names and memberships
- Cascade deletion handles cleanup when teams are removed

### Automatic Score Propagation
- Database triggers ensure score consistency across team members
- No manual intervention required for score distribution
- Maintains audit trail of all score changes

## Technical Implementation

### Database Level
- Comprehensive RLS (Row Level Security) policies
- Efficient indexing for team lookups
- Constraint functions for data validation

### Application Level
- TypeScript interfaces for type safety
- React hooks for state management
- Real-time updates and error handling

### Performance Considerations
- Indexed queries for efficient team lookups
- Batched operations for team creation/updates
- Optimized database functions for complex operations

This team management system ensures fair collaboration, equal scoring, and efficient administration of team-based projects in the Fall semester curriculum.