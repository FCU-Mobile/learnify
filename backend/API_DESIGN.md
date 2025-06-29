# Learnify Backend API Design

## 🚀 **Primary API (Auto-Registration) - Current Implementation**

### POST /api/auto/check-in
**Purpose**: Student check-in with automatic registration (NO PRE-REGISTRATION REQUIRED)

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "student_id": "ALICE2025",
  "full_name": "Alice Johnson"  // Optional - used for auto-registration
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "check_in_id": 1,
    "student_id": "ALICE2025",
    "student_name": "Alice Johnson",
    "checked_in_at": "2025-06-29T10:33:06.122Z",
    "is_new_student": true
  },
  "message": "Check-in recorded for Alice Johnson"
}
```

**Error Responses**:

**400 - Missing Student ID**:
```json
{
  "success": false,
  "error": "MISSING_STUDENT_ID",
  "message": "student_id is required"
}
```

**500 - Server Error**:
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Internal server error"
}
```

### GET /api/auto/check-ins/:student_id
**Purpose**: Get student's check-in history

**Query Parameters**:
- `limit`: Number of records (default: 10)
- `offset`: Pagination offset (default: 0)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "student": {
      "student_id": "ALICE2025",
      "full_name": "Alice Johnson",
      "uuid": "25844486-2b47-4975-850e-e517871ffbe7"
    },
    "check_ins": [
      {
        "id": 2,
        "created_at": "2025-06-29T10:33:13.857Z"
      },
      {
        "id": 1,
        "created_at": "2025-06-29T10:33:06.122Z"
      }
    ],
    "total_check_ins": 2,
    "showing": {
      "limit": 10,
      "offset": 0
    }
  }
}
```

**404 - Student Not Found**:
```json
{
  "success": false,
  "error": "STUDENT_NOT_FOUND",
  "message": "Student ALICE2025 not found"
}
```

### GET /api/auto/students
**Purpose**: Get all registered students (admin use)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "25844486-2b47-4975-850e-e517871ffbe7",
        "student_id": "ALICE2025",
        "full_name": "Alice Johnson",
        "created_at": "2025-06-29T10:33:06.119Z"
      }
    ],
    "total": 1
  }
}
```

---

## 🔒 **Legacy APIs (Authentication Required)**

### POST /api/check-in
**Purpose**: Log a student check-in activity (requires JWT authentication)

**Headers**:
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "timestamp": "2025-06-29T12:00:00Z" // Optional, defaults to server time
}
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "12345",
    "user_id": "uuid-here",
    "checked_in_at": "2025-06-29T12:00:00Z"
  },
  "message": "Check-in recorded successfully"
}
```

### GET /api/check-ins
**Purpose**: Get user's check-in history (requires JWT authentication)

**Headers**:
```
Authorization: Bearer <supabase_jwt_token>
```

**Query Parameters**:
- `limit`: Number of records (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "check_ins": [
      {
        "id": "12345",
        "checked_in_at": "2025-06-29T12:00:00Z"
      }
    ],
    "total": 15
  }
}
```

## Current Database Schema

The check-ins are stored in Supabase using a simplified schema for auto-registration:

```sql
-- students table - Auto-registration support
CREATE TABLE students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text UNIQUE NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- student_check_ins table - Check-in tracking
CREATE TABLE student_check_ins (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    student_id text NOT NULL,
    student_uuid uuid REFERENCES students(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_student_check_ins_student_id ON student_check_ins(student_id);
CREATE INDEX idx_student_check_ins_created ON student_check_ins(created_at DESC);
```

## Current Business Rules

1. **No Cooldown**: Students can check-in multiple times without restrictions
2. **Auto-Registration**: Students are automatically created on first check-in
3. **No Authentication**: Student ID is sufficient for check-ins
4. **Logging Only**: Backend only logs activity, no point calculation
5. **Timezone**: All timestamps in UTC

## Health Check

### GET /health
**Purpose**: Server health check

**Success Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2025-06-29T10:00:00.000Z",
  "service": "learnify-backend"
}
```

## Base URL

- **Local Development**: http://localhost:3000
- **Production**: TBD (Zeabur deployment)