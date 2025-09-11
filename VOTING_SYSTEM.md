# Voting System Implementation

## Overview

The voting system allows students to vote for their favorite midterm and final projects. Each student gets exactly 2 votes total: one for midterm projects and one for final projects.

## Key Features

### 🗳️ **Voting Rules**
- Each student can cast **2 votes total**: one for midterm projects, one for final projects
- Students cannot vote for their own projects **or their team's projects** (Fall semester)
- Vote counts are **public** and visible to everyone
- Individual votes are **private** - only the voter knows who they voted for
- Students can change their vote at any time
- **Team Projects**: In Fall semester, projects are team-based with shared submissions and scores

### 📊 **Vote Tracking**
- **Public Information**: Vote counts for each project, project details
- **Private Information**: Individual voting records, who voted for what
- **Real-time Updates**: Vote counts update immediately after voting

## Database Schema

### `project_votes` Table
```sql
CREATE TABLE project_votes (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    student_id text NOT NULL,
    student_uuid uuid REFERENCES students(id),
    submission_id bigint REFERENCES submissions(id) ON DELETE CASCADE,
    project_type text NOT NULL CHECK (project_type IN ('midterm', 'final')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Ensure student can only vote once per project type
    UNIQUE(student_id, project_type)
);
```

### `public_vote_counts` View
A database view that provides public voting information without exposing individual votes:
- Project details (title, description, author)
- Vote counts
- No individual voting records

## API Endpoints

### Backend Routes (`/api/voting/`)

1. **GET `/projects/:projectType/votes`**
   - Returns public vote counts for midterm or final projects
   - Shows: project details + vote counts
   - Hides: individual votes

2. **GET `/student/:studentId/voting-status`**
   - Returns student's remaining votes and current voting status
   - Shows which projects they can still vote for
   - Private to the student

3. **POST `/vote`**
   - Cast a vote for a project
   - Validates: student can vote, project exists, not voting for own project
   - Returns: success confirmation

4. **DELETE `/vote`**
   - Remove a vote (to change vote)
   - Allows students to change their mind
   - Returns: success confirmation

## Frontend Implementation

### Components

1. **`ProjectVoteButton.tsx`**
   - Individual project voting component
   - Shows current vote count with heart icon
   - Handles voting and vote removal for single project
   - Real-time status updates and error handling

2. **`ProjectShowcase.tsx`** (Enhanced)
   - Project listing with integrated vote counts
   - Heart icons showing vote popularity
   - Vote counts displayed alongside project metadata

### Features
- **Tab Navigation**: Switch between midterm and final projects
- **Vote Status**: Clear indication of remaining votes
- **Real-time Updates**: Vote counts update immediately
- **Change Votes**: Students can change their vote at any time
- **Validation**: Prevents voting for own projects, multiple votes per category

## Security & Privacy

### Public Information
- ✅ Vote counts per project
- ✅ Project details (title, description, GitHub links)
- ✅ Total voting statistics

### Private Information
- 🔒 Individual voting records
- 🔒 Who voted for which project
- 🔒 Voter identity

### Validation
- Students cannot vote for their own projects or their team's projects (Fall semester)
- Only one vote per project type (midterm/final)
- Only public projects can receive votes
- Proper authentication required
- Team submissions are counted once but apply to all team members

## Usage

### For Students
1. **Browse Projects**: Navigate to `/projects` page to see all public projects with vote counts
2. **View Project Details**: Click on any project to view full details
3. **Vote on Projects**: In the project detail page, find the "Class Voting" section
4. **Vote Actions**:
   - Click "Vote" button to cast your vote
   - Click "Change Vote" to remove your current vote and vote for a different project
   - See real-time vote count updates

### For Instructors
- View public vote counts and results
- All voting data respects privacy (no individual vote tracking visible)
- Can see which projects are popular among students

## Team Project Integration (Fall Semester)

For Fall semester team-based projects, the voting system integrates seamlessly with the team management system:

### Team Submission Considerations
- **Single Project per Team**: Teams submit one project that represents all members
- **Individual Voting**: Each student votes individually, but cannot vote for their team's project
- **Score Attribution**: Votes are counted for the project (not individual team members)
- **Display**: Projects show team information alongside individual submission details

### Voting Validation
- Students cannot vote for projects submitted by their own team
- Team membership is checked when validating voting eligibility
- Project listings show both individual and team submissions appropriately

## Technical Implementation Notes

- **Database constraints** prevent duplicate votes per student per project type
- **Team integration** validates voting eligibility against team membership
- **React hooks** manage real-time state updates
- **TypeScript interfaces** ensure type safety
- **Error handling** provides clear feedback for invalid operations
- **Responsive design** works on all devices