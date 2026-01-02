import axios from 'axios';

// Use empty string for development to use Vite proxy, or full URL for production
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://learnify-api.zeabur.app');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// TypeScript interfaces
export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
  is_admin?: boolean;
  has_midterm_project?: boolean;
  has_final_project?: boolean;
  midterm_project_count?: number;
  final_project_count?: number;
  // Fall semester team-based project status (2-project system)
  has_project1?: boolean;
  has_project2?: boolean;
  project1_team_name?: string;
  project2_team_name?: string;
}

export interface CheckInRequest {
  student_id: string;
  full_name?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  student?: Student;
  points_earned?: number;
  total_points?: number;
}

export interface StudentCheckIn {
  id: string;
  student_id: string;
  created_at: string;
}

export interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  total_marks: number;
  total_check_ins: number;
  latest_check_in: string | null;
  rank: number;
  points_breakdown?: {
    check_in_points: number;
    review_points: number;
    midterm_project_points: number;
    final_project_points: number;
    project_notes_points: number;
    voting_points: number;
    quiz_points: number;
    bonus_points: number;
  };
}

// API functions
export const getAllStudents = async (): Promise<Student[]> => {
  const response = await api.get<{success: boolean, data: {students: Student[], total: number}}>('/api/auto/students');
  if (!response.data.success || !response.data.data.students) {
    throw new Error('Failed to fetch students');
  }
  return response.data.data.students;
};

export const getStudent = async (studentId: string): Promise<Student> => {
  const response = await api.get<{success: boolean, data: {student: Student}}>(`/api/auto/students/${studentId}`);
  if (!response.data.success || !response.data.data.student) {
    throw new Error('Failed to fetch student information');
  }
  return response.data.data.student;
};

export const checkInStudent = async (data: CheckInRequest): Promise<CheckInResponse> => {
  try {
    const response = await api.post<CheckInResponse>('/api/auto/check-in', data);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 403 && error?.response?.data?.error === 'STUDENT_NOT_REGISTERED') {
      throw new Error(error.response.data.message || 'Student ID not registered. Please contact your instructor.');
    }
    throw error;
  }
};

export const getStudentCheckIns = async (studentId: string): Promise<StudentCheckIn[]> => {
  const response = await api.get<{success: boolean, data: {check_ins: StudentCheckIn[]}}>(`/api/auto/check-ins/${studentId}`);
  return response.data.data.check_ins;
};

// Review interfaces
export interface ReviewRequest {
  student_id: string;
  mobile_app_name: string;
  review_text: string;
}

export interface ReviewResponse {
  success: boolean;
  data: {
    review_id: number;
    student_id: string;
    student_name: string;
    mobile_app_name: string;
    review_text: string;
    submitted_at: string;
  };
  message: string;
}

export interface StudentReview {
  id: number;
  student_id: string;
  mobile_app_name: string;
  review_text: string;
  created_at: string;
  students?: {
    full_name: string;
  };
}

export interface ReviewsResponse {
  success: boolean;
  data: {
    reviews: StudentReview[];
    total_reviews: number;
    showing: {
      limit: number;
      offset: number;
      app_name_filter?: string;
    };
  };
}

export interface StudentReviewsResponse {
  success: boolean;
  data: {
    student: {
      student_id: string;
      full_name: string;
      uuid: string;
    };
    reviews: StudentReview[];
    total_reviews: number;
    showing: {
      limit: number;
      offset: number;
    };
  };
}

// Review API functions
export const submitReview = async (data: ReviewRequest): Promise<ReviewResponse> => {
  const response = await api.post<ReviewResponse>('/api/reviews', data);
  return response.data;
};

export const getStudentReviews = async (studentId: string, params?: { limit?: number; offset?: number }): Promise<StudentReviewsResponse> => {
  const response = await api.get<StudentReviewsResponse>(`/api/reviews/${studentId}`, { params });
  return response.data;
};

export const getAllReviews = async (params?: { limit?: number; offset?: number; app_name?: string }): Promise<ReviewsResponse['data']> => {
  const response = await api.get<ReviewsResponse>('/api/reviews', { params });
  return response.data.data;
};

export const getLeaderboard = async (limit: number = 50, offset: number = 0): Promise<LeaderboardEntry[]> => {
  const response = await api.get<{success: boolean, data: {leaderboard: LeaderboardEntry[]}}>('/api/leaderboard', {
    params: { limit, offset }
  });
  if (!response.data.success || !response.data.data.leaderboard) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.data.data.leaderboard;
};

export const getStudentLeaderboardData = async (studentId: string): Promise<LeaderboardEntry> => {
  const response = await api.get<{success: boolean, data: {student: LeaderboardEntry}}>(`/api/leaderboard/student/${studentId}`);
  if (!response.data.success || !response.data.data.student) {
    throw new Error('Failed to fetch student leaderboard data');
  }
  return response.data.data.student;
};

// Admin API functions
export interface AdminStatus {
  admin: Student;
  permissions: string[];
}

export const getAdminStatus = async (studentId: string): Promise<AdminStatus> => {
  const response = await api.get<{success: boolean, data: AdminStatus}>('/api/admin/status', {
    headers: { 'x-student-id': studentId }
  });
  if (!response.data.success) {
    throw new Error('Failed to get admin status');
  }
  return response.data.data;
};

export const getAllStudentsAsAdmin = async (studentId: string): Promise<Student[]> => {
  const response = await api.get<{success: boolean, data: Student[]}>('/api/admin/students', {
    headers: { 'x-student-id': studentId }
  });
  if (!response.data.success) {
    throw new Error('Failed to fetch students');
  }
  return response.data.data;
};

export const deleteStudent = async (adminStudentId: string, targetStudentId: string): Promise<{message: string, deleted_student: Student}> => {
  const response = await api.delete<{success: boolean, message: string, data: {deleted_student: Student}}>(`/api/admin/students/${targetStudentId}`, {
    headers: { 'x-student-id': adminStudentId }
  });
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete student');
  }
  return {
    message: response.data.message,
    deleted_student: response.data.data.deleted_student
  };
};

// Lessons interfaces
export interface LessonPlanItem {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
}

export interface Lesson {
  id: string;
  lesson_number: number;
  name: string;
  description: string;
  scheduled_date: string;
  status: 'normal' | 'skipped' | 'cancelled';
  topic_name: string;
  icon: string;
  color: string;
  button_color: string;
  further_reading_url?: string;
  lesson_content?: string[];
  created_at: string;
  updated_at: string;
  plan?: LessonPlanItem[];
}

export interface LessonsResponse {
  success: boolean;
  data: Lesson[];
}

export interface LessonResponse {
  success: boolean;
  data: Lesson;
}

// Lessons API functions
export const getAllLessons = async (params?: { status?: string; include_plan?: boolean; semester?: string }): Promise<Lesson[]> => {
  const { semester, ...queryParams } = params || {};
  const headers = semester ? { 'x-semester': semester } : {};
  const response = await api.get<LessonsResponse>('/api/lessons', { 
    params: queryParams,
    headers 
  });
  if (!response.data.success) {
    throw new Error('Failed to fetch lessons');
  }
  return response.data.data;
};

export const getCurrentLesson = async (semesterCode?: string): Promise<Lesson | null> => {
  const headers = semesterCode ? { 'x-semester': semesterCode } : {};
  const response = await api.get<LessonResponse>('/api/lessons/current', { headers });
  if (!response.data.success) {
    throw new Error('Failed to fetch current lesson');
  }
  return response.data.data;
};

export const getLesson = async (lessonId: string): Promise<Lesson> => {
  const response = await api.get<LessonResponse>(`/api/lessons/${lessonId}`);
  if (!response.data.success) {
    throw new Error('Failed to fetch lesson');
  }
  return response.data.data;
};

export const updateLessonStatus = async (lessonId: string, status: 'normal' | 'skipped' | 'cancelled'): Promise<Lesson> => {
  const response = await api.put<LessonResponse>(`/api/lessons/${lessonId}/status`, { status });
  if (!response.data.success) {
    throw new Error('Failed to update lesson status');
  }
  return response.data.data;
};

export const updateLessonProgress = async (
  lessonId: string, 
  teacherId: string, 
  lessonPlanItemId: string, 
  completed: boolean
): Promise<any> => {
  const response = await api.post(`/api/lessons/${lessonId}/progress`, {
    teacher_id: teacherId,
    lesson_plan_item_id: lessonPlanItemId,
    completed
  });
  if (!response.data.success) {
    throw new Error('Failed to update lesson progress');
  }
  return response.data.data;
};

export const updateLessonUrl = async (
  lessonId: string,
  teacherId: string,
  furtherReadingUrl: string
): Promise<Lesson> => {
  const response = await api.put<LessonResponse>(`/api/lessons/${lessonId}/url`, {
    teacher_id: teacherId,
    further_reading_url: furtherReadingUrl
  });
  if (!response.data.success) {
    throw new Error('Failed to update lesson URL');
  }
  return response.data.data;
};

export const updateLessonTitle = async (
  lessonId: string,
  teacherId: string,
  title: string
): Promise<Lesson> => {
  const response = await api.put<LessonResponse>(`/api/lessons/${lessonId}/title`, {
    teacher_id: teacherId,
    name: title
  });
  if (!response.data.success) {
    throw new Error('Failed to update lesson title');
  }
  return response.data.data;
};

export const updateLessonDate = async (
  lessonId: string,
  teacherId: string,
  scheduledDate: string
): Promise<Lesson> => {
  const response = await api.put<LessonResponse>(`/api/lessons/${lessonId}/date`, {
    teacher_id: teacherId,
    scheduled_date: scheduledDate
  });
  if (!response.data.success) {
    throw new Error('Failed to update lesson date');
  }
  return response.data.data;
};

export const moveLessonPlanItem = async (
  itemId: string,
  teacherId: string,
  targetLessonId: string,
  newSortOrder?: number
): Promise<{moved_item: any, source_lesson_id: string, target_lesson_id: string}> => {
  const response = await api.put(`/api/lessons/plan-items/${itemId}/move`, {
    teacher_id: teacherId,
    target_lesson_id: targetLessonId,
    new_sort_order: newSortOrder
  });
  if (!response.data.success) {
    throw new Error('Failed to move lesson plan item');
  }
  return response.data.data;
};

export const reorderLessonPlanItems = async (
  lessonId: string,
  teacherId: string,
  itemId: string,
  newSortOrder: number
): Promise<{lesson_id: string, reordered_items: any[]}> => {
  const response = await api.put(`/api/lessons/${lessonId}/plan-items/reorder`, {
    teacher_id: teacherId,
    item_id: itemId,
    new_sort_order: newSortOrder
  });
  if (!response.data.success) {
    throw new Error('Failed to reorder lesson plan items');
  }
  return response.data.data;
};

// Submission file interface
export interface SubmissionFile {
  id: number;
  submission_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_order: number;
  file_url: string;
  created_at: string;
  updated_at: string;
}

// Submissions interfaces
export interface Submission {
  id: number;
  student_id: string;
  student_name: string;
  submission_type: 'screenshot' | 'github_repo' | 'project';
  title: string;
  description?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  github_url?: string;
  lesson_id?: string;
  file_url?: string;
  files?: SubmissionFile[];
  project_type?: 'midterm' | 'final';
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  team_id?: number;
  team?: {
    team_id: number;
    team_name: string;
    project_number: number;
    semester_id: string;
    members: Array<{
      student_id: string;
      full_name: string;
    }>;
  };
}

export interface SubmissionsResponse {
  success: boolean;
  data: {
    submissions: Submission[];
    total: number;
  };
  error?: string;
}

export interface SubmissionUploadResponse {
  success: boolean;
  data: {
    submission: Submission;
  };
  error?: string;
}

// Submissions API functions
export const getSubmissions = async (params?: {
  student_id?: string;
  lesson_id?: string;
  submission_type?: string;
}): Promise<SubmissionsResponse['data']> => {
  const response = await api.get<SubmissionsResponse>('/api/submissions', { params });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch submissions');
  }
  return response.data.data;
};

export const getSubmissionsForSemester = async (
  semesterCode?: string,
  params?: {
    student_id?: string;
    lesson_id?: string;
    submission_type?: string;
  }
): Promise<SubmissionsResponse['data']> => {
  const headers: any = {};
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  const response = await api.get<SubmissionsResponse>('/api/submissions', { 
    params,
    headers 
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch submissions');
  }
  return response.data.data;
};

export const uploadSubmission = async (formData: FormData, semesterCode?: string): Promise<Submission> => {
  const headers: any = {
    'Content-Type': 'multipart/form-data',
  };
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  const response = await api.post<SubmissionUploadResponse>('/api/submissions', formData, {
    headers,
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to upload submission');
  }
  return response.data.data.submission;
};

export const getSubmission = async (submissionId: number): Promise<Submission> => {
  const response = await api.get<{success: boolean, data: {submission: Submission}}>(`/api/submissions/${submissionId}`);
  if (!response.data.success) {
    throw new Error('Failed to fetch submission');
  }
  return response.data.data.submission;
};

export const deleteSubmission = async (submissionId: number): Promise<void> => {
  const response = await api.delete(`/api/submissions/${submissionId}`);
  if (response.status !== 200) {
    throw new Error('Failed to delete submission');
  }
};

// Update project information (title, description, GitHub URL, visibility)
export const updateProject = async (
  submissionId: number, 
  studentId: string, 
  updates: {
    title?: string;
    description?: string;
    github_url?: string;
    is_public?: boolean;
  }
): Promise<Submission> => {
  const response = await api.put<{
    success: boolean;
    data: {submission: Submission};
    message: string;
    changes: string[];
  }>(`/api/submissions/${submissionId}`, {
    student_id: studentId,
    ...updates
  });
  
  if (!response.data.success) {
    throw new Error('Failed to update project');
  }
  return response.data.data.submission;
};

// Update project with new screenshots
export const updateProjectScreenshots = async (submissionId: number, studentId: string, formData: FormData): Promise<Submission> => {
  // Add student_id to formData
  formData.append('student_id', studentId);
  
  const response = await api.put<SubmissionUploadResponse>(`/api/submissions/${submissionId}/screenshots`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to add project screenshots');
  }
  return response.data.data.submission;
};

// Delete a specific screenshot from a project
export const deleteProjectScreenshot = async (submissionId: number, fileId: number, studentId: string): Promise<{remaining_files: number}> => {
  const response = await api.delete<{success: boolean, data: {remaining_files: number}, message: string}>(`/api/submissions/${submissionId}/files/${fileId}`, {
    params: { student_id: studentId }
  });
  if (!response.data.success) {
    throw new Error('Failed to delete screenshot');
  }
  return response.data.data;
};

// Get public projects for showcase
export const getPublicProjects = async (params?: {
  project_type?: 'midterm' | 'final';
  limit?: number;
  offset?: number;
}): Promise<Submission[]> => {
  const response = await api.get<SubmissionsResponse>('/api/submissions/projects/public', { params });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch public projects');
  }
  return response.data.data.submissions;
};

// Get public projects for showcase with semester filter
export const getPublicProjectsForSemester = async (
  semesterCode?: string,
  params?: {
    project_type?: 'midterm' | 'final';
    limit?: number;
    offset?: number;
  }
): Promise<Submission[]> => {
  const headers: any = {};
  
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  
  const response = await api.get<SubmissionsResponse>('/api/submissions/projects/public', { 
    params,
    headers 
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to fetch public projects');
  }
  return response.data.data.submissions;
};

// Quiz interfaces
export interface QuizQuestion {
  id: number;
  question_text: string;
  question_category: string;
  difficulty_level: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: number;
  student_id: string;
  student_uuid: string;
  question_id: number;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  points_earned: number;
  attempt_time_seconds?: number;
  created_at: string;
}

export interface QuizScore {
  id: number;
  student_id: string;
  student_uuid: string;
  total_questions_attempted: number;
  total_correct_answers: number;
  total_points: number;
  accuracy_percentage: number;
  last_quiz_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RandomQuestionsResponse {
  success: boolean;
  data: {
    questions: QuizQuestion[];
    total_available: number;
  };
}

export interface QuizSubmissionRequest {
  student_id: string;
  full_name?: string;
  question_id: number;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  attempt_time_seconds?: number;
  semester_id: string; // NEW: Required semester context
}

export interface QuizSubmissionResponse {
  success: boolean;
  data: {
    attempt: QuizAttempt;
    is_correct: boolean;
    points_earned: number;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  };
  message: string;
}

export interface StudentQuizScoresResponse {
  success: boolean;
  data: {
    student: {
      student_id: string;
      full_name: string;
      uuid: string;
    };
    quiz_scores: QuizScore;
    recent_attempts: QuizAttempt[];
    total_attempts: number;
    showing: {
      limit: number;
      offset: number;
    };
  };
}

export interface StudentQuizAttemptsResponse {
  success: boolean;
  data: {
    student: {
      student_id: string;
      full_name: string;
      uuid: string;
    };
    attempts: QuizAttempt[];
    total_attempts: number;
    showing: {
      limit: number;
      offset: number;
    };
  };
}

export interface QuestionStats {
  difficulty_level: number;
  difficulty_name: string;
  question_count: number;
}

export interface QuestionStatsResponse {
  success: boolean;
  data: {
    total_questions: number;
    difficulty_breakdown: QuestionStats[];
    last_updated: string;
  };
}

// Quiz API functions
export const getRandomQuizQuestions = async (
  count: number = 5,
  difficulty?: number,
  studentId?: string,
  questionType?: string,
  semesterId?: string // NEW: Required semester context
): Promise<QuizQuestion[]> => {
  const params: any = { count };
  if (difficulty) params.difficulty = difficulty;
  if (studentId) params.student_id = studentId;
  if (questionType) params.question_type = questionType;
  if (semesterId) params.semester_id = semesterId; // NEW: Include semester

  const response = await api.get<RandomQuestionsResponse>('/api/quiz/questions/random', { params });
  if (!response.data.success) {
    throw new Error('Failed to fetch quiz questions');
  }
  return response.data.data.questions;
};

export const submitQuizAnswer = async (data: QuizSubmissionRequest): Promise<QuizSubmissionResponse['data']> => {
  try {
    const response = await api.post<QuizSubmissionResponse>('/api/quiz/submit-answer', data);
    if (!response.data.success) {
      throw new Error('Failed to submit quiz answer');
    }
    return response.data.data;
  } catch (error: any) {
    if (error?.response?.status === 403 && error?.response?.data?.error === 'STUDENT_NOT_REGISTERED') {
      throw new Error(error.response.data.message || 'Student ID not registered. Please contact your instructor.');
    }
    throw error;
  }
};

export const getStudentQuizScores = async (studentId: string, semesterId?: string): Promise<StudentQuizScoresResponse['data']> => {
  const params: any = {};
  if (semesterId) params.semester_id = semesterId;

  const response = await api.get<StudentQuizScoresResponse>(`/api/quiz/student/${studentId}/scores`, { params });
  if (!response.data.success) {
    throw new Error('Failed to fetch student quiz scores');
  }
  return response.data.data;
};

export const getStudentQuizAttempts = async (
  studentId: string, 
  params?: { limit?: number; offset?: number }
): Promise<StudentQuizAttemptsResponse['data']> => {
  const response = await api.get<StudentQuizAttemptsResponse>(`/api/quiz/student/${studentId}/attempts`, { params });
  if (!response.data.success) {
    throw new Error('Failed to fetch student quiz attempts');
  }
  return response.data.data;
};

export const getQuestionStats = async (semesterId?: string): Promise<QuestionStatsResponse['data']> => {
  const params: any = {};
  if (semesterId) params.semester_id = semesterId; // NEW: Pass semester_id if provided

  const response = await api.get<QuestionStatsResponse>('/api/quiz/questions/stats', { params });
  if (!response.data.success) {
    throw new Error('Failed to fetch question statistics');
  }
  return response.data.data;
};

export interface QuestionWithAttempts {
  id: number;
  question_text: string;
  question_category: string;
  difficulty_level: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  attempt_summary: {
    total_attempts: number;
    correct_attempts: number;
    accuracy_percentage: number;
    total_points: number;
    latest_attempt: {
      selected_answer: 'A' | 'B' | 'C' | 'D';
      is_correct: boolean;
      points_earned: number;
      created_at: string;
    } | null;
    status: 'never_attempted' | 'mastered' | 'needs_practice';
  };
}

export interface AllQuestionsResponse {
  success: boolean;
  data: {
    student: {
      student_id: string;
      full_name: string;
      uuid: string;
    };
    questions: QuestionWithAttempts[];
    summary: {
      total_questions: number;
      attempted_questions: number;
      mastered_questions: number;
      never_attempted: number;
      overall_accuracy: number;
    };
  };
}

export const checkStudentExists = async (studentId: string): Promise<boolean> => {
  try {
    // Try a lightweight check by fetching student's check-in history
    const response = await api.get(`/api/auto/check-ins/${studentId}`);
    return response.data.success;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return false;
    }
    if (error?.response?.status === 403 && error?.response?.data?.error === 'STUDENT_NOT_REGISTERED') {
      return false;
    }
    // For other errors, assume student might exist but there's a different issue
    return true;
  }
};

export const getAllQuestionsWithAttempts = async (studentId: string): Promise<AllQuestionsResponse['data']> => {
  const url = `/api/quiz/questions/all/${encodeURIComponent(studentId)}`;
  console.log('Making API request to:', url);
  console.log('Full API base URL:', API_BASE_URL);
  
  try {
    const response = await api.get<AllQuestionsResponse>(url);
    console.log('Response received:', response.status, response.data.success);
    if (!response.data.success) {
      throw new Error('Failed to fetch all questions with attempts');
    }
    return response.data.data;
  } catch (error: any) {
    console.error('API Error details:', error);
    console.error('Request URL:', url);
    console.error('Error status:', error?.response?.status);
    console.error('Error data:', error?.response?.data);
    throw error;
  }
};

// Project Notes interfaces
export interface ProjectNote {
  id: number;
  submission_id: number;
  student_id: string;
  student_uuid: string;
  note_text: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectNotesResponse {
  success: boolean;
  data: {
    note: ProjectNote | null;
    submission_id: number;
    student_id: string;
    has_note: boolean;
  };
}

export interface CreateProjectNoteRequest {
  submission_id: number;
  student_id: string;
  note_text: string;
  is_private?: boolean;
}

export interface CreateProjectNoteResponse {
  success: boolean;
  data: {
    note: ProjectNote;
  };
  message: string;
}

// Project Notes API functions
export const getProjectNote = async (submissionId: number, studentId: string): Promise<{ note: ProjectNote | null; hasNote: boolean }> => {
  const response = await api.get<ProjectNotesResponse>(`/api/project-notes/${submissionId}`, {
    params: { student_id: studentId }
  });
  if (!response.data.success) {
    throw new Error('Failed to fetch project note');
  }
  return {
    note: response.data.data.note,
    hasNote: response.data.data.has_note
  };
};

export const createOrUpdateProjectNote = async (data: CreateProjectNoteRequest): Promise<ProjectNote> => {
  const response = await api.post<CreateProjectNoteResponse>('/api/project-notes', data);
  if (!response.data.success) {
    throw new Error('Failed to save project note');
  }
  return response.data.data.note;
};

export const updateProjectNote = async (noteId: number, studentId: string, noteText: string): Promise<ProjectNote> => {
  const response = await api.put<CreateProjectNoteResponse>(`/api/project-notes/${noteId}`, 
    { note_text: noteText },
    { params: { student_id: studentId } }
  );
  if (!response.data.success) {
    throw new Error('Failed to update project note');
  }
  return response.data.data.note;
};

export const deleteProjectNote = async (noteId: number, studentId: string): Promise<void> => {
  const response = await api.delete(`/api/project-notes/${noteId}`, {
    params: { student_id: studentId }
  });
  if (!response.data.success) {
    throw new Error('Failed to delete project note');
  }
};

// Voting interfaces
export interface ProjectVoteStatus {
  project_type: 'midterm' | 'final';
  can_vote: boolean;
  voted_for_submission_id?: number;
}

export interface VotingStatusResponse {
  success: boolean;
  voting_status: ProjectVoteStatus[];
}

export interface ProjectWithVotes {
  submission_id: number;
  title: string;
  description?: string;
  project_author: string;
  project_type: 'midterm' | 'final';
  github_url?: string;
  file_path?: string;
  submission_date: string;
  vote_count: number;
}

export interface ProjectVotesResponse {
  success: boolean;
  projects: ProjectWithVotes[];
}

export interface VoteRequest {
  student_id: string;
  submission_id: number;
  project_type: 'midterm' | 'final';
}

export interface VoteResponse {
  success: boolean;
  message: string;
  vote_id?: number;
}

// Voting API functions
export const getProjectVotes = async (projectType: 'midterm' | 'final'): Promise<ProjectWithVotes[]> => {
  const response = await api.get<ProjectVotesResponse>(`/api/voting/projects/${projectType}/votes`);
  if (!response.data.success) {
    throw new Error('Failed to fetch project votes');
  }
  return response.data.projects;
};

// Get project votes with semester filter
export const getProjectVotesForSemester = async (
  projectType: 'midterm' | 'final', 
  semesterCode?: string
): Promise<ProjectWithVotes[]> => {
  const headers: any = {};
  
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  
  const response = await api.get<ProjectVotesResponse>(`/api/voting/projects/${projectType}/votes`, { headers });
  if (!response.data.success) {
    throw new Error('Failed to fetch project votes');
  }
  return response.data.projects;
};

export const getStudentVotingStatus = async (studentId: string): Promise<ProjectVoteStatus[]> => {
  const response = await api.get<VotingStatusResponse>(`/api/voting/student/${studentId}/voting-status`);
  if (!response.data.success) {
    throw new Error('Failed to fetch voting status');
  }
  return response.data.voting_status;
};

export const castVote = async (data: VoteRequest): Promise<VoteResponse> => {
  const response = await api.post<VoteResponse>('/api/voting/vote', data);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to cast vote');
  }
  return response.data;
};

export const removeVote = async (studentId: string, projectType: 'midterm' | 'final'): Promise<VoteResponse> => {
  const response = await api.delete<VoteResponse>('/api/voting/vote', {
    data: { student_id: studentId, project_type: projectType }
  });
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to remove vote');
  }
  return response.data;
};

// Helper function to vote on behalf of multiple students
export interface BulkVoteResult {
  success: number;
  failed: number;
  errors: string[];
  details: Array<{
    student_id: string;
    success: boolean;
    error?: string;
  }>;
}

export const voteOnBehalfOfStudents = async (
  submissionId: number,
  projectType: 'midterm' | 'final',
  studentIds: string[]
): Promise<BulkVoteResult> => {
  const results: BulkVoteResult = {
    success: 0,
    failed: 0,
    errors: [],
    details: []
  };

  for (const studentId of studentIds) {
    try {
      await castVote({
        student_id: studentId,
        submission_id: submissionId,
        project_type: projectType
      });
      
      results.success++;
      results.details.push({
        student_id: studentId,
        success: true
      });
    } catch (error: any) {
      results.failed++;
      const errorMessage = error.message || 'Unknown error';
      results.errors.push(`${studentId}: ${errorMessage}`);
      results.details.push({
        student_id: studentId,
        success: false,
        error: errorMessage
      });
    }
  }

  return results;
};

// Bonus calculation
export interface BonusCalculationResponse {
  success: boolean;
  message: string;
  data?: {
    submission_id: number;
    bonus_awarded: number;
    vote_count: number;
    project_type: string;
  } | null;
}

export const calculateBonusPoints = async (projectType: 'midterm' | 'final'): Promise<BonusCalculationResponse> => {
  const response = await api.post<BonusCalculationResponse>(`/api/calculate-bonus/${projectType}`);
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to calculate bonus points');
  }
  return response.data;
};

// Quiz score fix interface
export interface QuizScoreFixResponse {
  success: boolean;
  message: string;
  data: {
    students_processed: number;
    total_points_corrected: number;
    quiz_system_info: {
      total_active_questions: number;
      points_per_question: number;
      max_possible_points: number;
    };
    details: Array<{
      student_id: string;
      old_points: number;
      new_points: number;
      points_corrected: number;
      unique_questions_answered: number;
      total_attempts: number;
    }>;
  };
}

// Fix quiz scores - remove duplicate scoring
export const fixQuizScores = async (adminStudentId: string): Promise<QuizScoreFixResponse> => {
  const response = await api.post<QuizScoreFixResponse>('/api/admin/fix-quiz-scores', {}, {
    headers: { 'x-student-id': adminStudentId }
  });
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fix quiz scores');
  }
  return response.data;
};

// Feedback System API

export interface FeedbackTopic {
  id: string;
  category: 'current' | 'improvement' | 'future';
  topic_name: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface FeedbackTopicsResponse {
  success: boolean;
  data: {
    topics: {
      current: FeedbackTopic[];
      improvement: FeedbackTopic[];
      future: FeedbackTopic[];
    };
    total: number;
  };
}

export interface StudentFeedback {
  id: string;
  student_id: string;
  student_uuid: string;
  semester_feedback?: string;
  overall_rating?: number;
  liked_topics: string[];
  improvement_topics: string[];
  future_topics: string[];
  additional_comments?: string;
  created_at: string;
  updated_at: string;
  students?: {
    student_id: string;
    full_name: string;
  };
}

export interface FeedbackSubmissionRequest {
  semester_feedback?: string;
  overall_rating?: number;
  liked_topics: string[];
  improvement_topics: string[];
  future_topics: string[];
  additional_comments?: string;
}

export interface FeedbackSubmissionResponse {
  success: boolean;
  data: {
    feedback: StudentFeedback;
    message: string;
  };
}

export interface MyFeedbackResponse {
  success: boolean;
  data: {
    feedback: StudentFeedback | null;
    has_submitted: boolean;
  };
}

export interface FeedbackAnalytics {
  total_responses: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
  popular_liked_topics: Array<{ topic: string; count: number }>;
  popular_improvement_topics: Array<{ topic: string; count: number }>;
  popular_future_topics: Array<{ topic: string; count: number }>;
  response_rate?: number;
  improvement_suggestions?: number;
}

export interface FeedbackAnalyticsResponse {
  success: boolean;
  data: FeedbackAnalytics;
}

// Get all feedback topics for form options
export const getFeedbackTopics = async (): Promise<FeedbackTopicsResponse> => {
  const response = await api.get<FeedbackTopicsResponse>('/api/feedback/topics');
  return response.data;
};

// Submit or update student feedback
export const submitFeedback = async (
  studentId: string, 
  feedback: FeedbackSubmissionRequest
): Promise<FeedbackSubmissionResponse> => {
  const response = await api.post<FeedbackSubmissionResponse>('/api/feedback/submit', feedback, {
    headers: { 'x-student-id': studentId }
  });
  return response.data;
};

// Get current student's feedback
export const getMyFeedback = async (studentId: string): Promise<MyFeedbackResponse> => {
  const response = await api.get<MyFeedbackResponse>('/api/feedback/my-feedback', {
    headers: { 'x-student-id': studentId }
  });
  return response.data;
};

// Admin: Get all feedback
export const getAllFeedback = async (adminStudentId: string) => {
  const response = await api.get('/api/feedback/all', {
    headers: { 'x-student-id': adminStudentId }
  });
  return response.data;
};

// Admin: Get feedback analytics
export const getFeedbackAnalytics = async (adminStudentId: string): Promise<FeedbackAnalyticsResponse> => {
  const response = await api.get<FeedbackAnalyticsResponse>('/api/feedback/analytics', {
    headers: { 'x-student-id': adminStudentId }
  });
  return response.data;
};

// Semester interfaces
export interface Semester {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SemesterConfig {
  id: string;
  semester_id: string;
  check_in_points: number;
  review_points: number;
  midterm_project_points: number;
  final_project_points: number;
  note_points: number;
  vote_points: number;
  bonus_points: number;
  created_at: string;
  updated_at: string;
}

export interface SemesterStats {
  total_check_ins: number;
  total_submissions: number;
  total_votes: number;
  total_notes: number;
}

export interface SemestersResponse {
  success: boolean;
  data: {
    semesters: Semester[];
  };
}

export interface CurrentSemesterResponse {
  success: boolean;
  data: {
    semester: Semester;
  };
}

export interface SemesterResponse {
  success: boolean;
  data: {
    semester: Semester;
  };
}

export interface SemesterConfigResponse {
  success: boolean;
  data: {
    semester: Semester;
    config: SemesterConfig;
  };
}

export interface SemesterStatsResponse {
  success: boolean;
  data: {
    semester: Semester;
    stats: SemesterStats;
  };
}

// Semester API functions

// Get all semesters
export const getSemesters = async (): Promise<SemestersResponse> => {
  const response = await api.get<SemestersResponse>('/api/semesters');
  return response.data;
};

// Get current semester
export const getCurrentSemester = async (): Promise<CurrentSemesterResponse> => {
  const response = await api.get<CurrentSemesterResponse>('/api/semesters/current');
  return response.data;
};

// Get semester by code
export const getSemester = async (code: string): Promise<SemesterResponse> => {
  const response = await api.get<SemesterResponse>(`/api/semesters/${code}`);
  return response.data;
};

// Set semester as current (admin only)
export const setCurrentSemester = async (code: string, adminStudentId: string): Promise<{success: boolean; message: string}> => {
  const response = await api.post<{success: boolean; message: string}>(`/api/semesters/${code}/set-current`, {
    admin_student_id: adminStudentId
  });
  return response.data;
};

// Get semester configuration
export const getSemesterConfig = async (code: string): Promise<SemesterConfigResponse> => {
  const response = await api.get<SemesterConfigResponse>(`/api/semesters/${code}/config`);
  return response.data;
};

// Get semester statistics
export const getSemesterStats = async (code: string): Promise<SemesterStatsResponse> => {
  const response = await api.get<SemesterStatsResponse>(`/api/semesters/${code}/stats`);
  return response.data;
};

// Updated API functions with semester support

// Get leaderboard with semester filter
export const getLeaderboardForSemester = async (
  semesterCode?: string,
  limit: number = 50, 
  offset: number = 0
): Promise<LeaderboardEntry[]> => {
  const params = { limit, offset };
  const headers: any = {};
  
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  
  const response = await api.get<{success: boolean, data: {leaderboard: LeaderboardEntry[]}}>('/api/leaderboard', {
    params,
    headers
  });
  if (!response.data.success || !response.data.data.leaderboard) {
    throw new Error('Failed to fetch leaderboard');
  }
  return response.data.data.leaderboard;
};

// Get student leaderboard data with semester filter
export const getStudentLeaderboardDataForSemester = async (
  studentId: string, 
  semesterCode?: string
): Promise<LeaderboardEntry> => {
  const headers: any = {};
  
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  
  const response = await api.get<{success: boolean, data: {student: LeaderboardEntry}}>(
    `/api/leaderboard/student/${studentId}`, 
    { headers }
  );
  if (!response.data.success || !response.data.data.student) {
    throw new Error('Failed to fetch student leaderboard data');
  }
  return response.data.data.student;
};

// Get student check-ins with semester filter
export const getStudentCheckInsForSemester = async (
  studentId: string, 
  semesterCode?: string
): Promise<StudentCheckIn[]> => {
  const headers: any = {};
  
  if (semesterCode) {
    headers['x-semester-code'] = semesterCode;
  }
  
  const response = await api.get<{success: boolean, data: {check_ins: StudentCheckIn[]}}>(
    `/api/auto/check-ins/${studentId}`, 
    { headers }
  );
  return response.data.data.check_ins;
};

// Check in with semester assignment
export const checkInStudentForSemester = async (
  data: CheckInRequest,
  semesterCode?: string
): Promise<CheckInResponse> => {
  try {
    const headers: any = {};
    
    if (semesterCode) {
      headers['x-semester-code'] = semesterCode;
    }
    
    const response = await api.post<CheckInResponse>('/api/auto/check-in', data, { headers });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 403 && error?.response?.data?.error === 'STUDENT_NOT_REGISTERED') {
      throw new Error(error.response.data.message || 'Student ID not registered. Please contact your instructor.');
    }
    throw error;
  }
};

// Team Management interfaces
export interface ProjectTeam {
  team_id: number;
  team_name: string;
  project_number: number;
  member_count: number;
  members: Array<{
    student_id: string;
    full_name: string;
    joined_at: string;
  }>;
  created_at: string;
}

export interface UnassignedStudent {
  student_id: string;
  full_name: string;
}

export interface TeamsResponse {
  success: boolean;
  data: {
    teams: ProjectTeam[];
    project_number: number;
    semester_id: string;
  };
}

export interface UnassignedStudentsResponse {
  success: boolean;
  data: {
    students: UnassignedStudent[];
    count: number;
  };
}

export interface CreateTeamRequest {
  admin_id: string;
  semester_id: string;
  project_number: number;
  team_name: string;
  member_ids: string[];
}

export interface CreateTeamResponse {
  success: boolean;
  data: {
    team_id: number;
    team_name: string;
    member_count: number;
    members: string[];
  };
  message: string;
  error?: string;
}

export interface ShuffleTeamsRequest {
  admin_id: string;
  semester_id: string;
  project_number: number;
}

export interface ShuffleTeamsResponse {
  success: boolean;
  data: {
    teams: Array<{
      team_id: number;
      team_name: string;
      members: string[];
      member_count: number;
    }>;
    total_teams: number;
    total_students: number;
  };
  message: string;
  error?: string;
}

export interface UpdateTeamRequest {
  admin_id: string;
  team_name?: string;
  member_ids?: string[];
}

export interface UpdateTeamResponse {
  success: boolean;
  data: {
    team_id: number;
    team_name: string;
    updated_members: number | null;
  };
  message: string;
  error?: string;
}

// Team Management API functions

// Get teams for a specific project and semester
export const getTeams = async (
  semesterId: string,
  projectNumber: number
): Promise<ProjectTeam[]> => {
  const response = await api.get<TeamsResponse>('/api/teams', {
    params: {
      semester_id: semesterId,
      project_number: projectNumber
    }
  });
  if (!response.data.success) {
    throw new Error('Failed to fetch teams');
  }
  return response.data.data.teams;
};

// Get unassigned students for a project
export const getUnassignedStudents = async (
  semesterId: string,
  projectNumber: number
): Promise<UnassignedStudent[]> => {
  const response = await api.get<UnassignedStudentsResponse>('/api/teams/unassigned', {
    params: {
      semester_id: semesterId,
      project_number: projectNumber
    }
  });
  if (!response.data.success) {
    throw new Error('Failed to fetch unassigned students');
  }
  return response.data.data.students;
};

// Create a new team
export const createTeam = async (data: CreateTeamRequest): Promise<CreateTeamResponse> => {
  const response = await api.post<CreateTeamResponse>('/api/teams', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create team');
  }
  return response.data;
};

// Shuffle teams automatically
export const shuffleTeams = async (data: ShuffleTeamsRequest): Promise<ShuffleTeamsResponse> => {
  const response = await api.post<ShuffleTeamsResponse>('/api/teams/shuffle', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to shuffle teams');
  }
  return response.data;
};

export const reshuffleTeams = async (data: ShuffleTeamsRequest): Promise<ShuffleTeamsResponse> => {
  const response = await api.post<ShuffleTeamsResponse>('/api/teams/reshuffle', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to reshuffle teams');
  }
  return response.data;
};

// Update a team
export const updateTeam = async (
  teamId: number,
  data: UpdateTeamRequest
): Promise<UpdateTeamResponse> => {
  const response = await api.put<UpdateTeamResponse>(`/api/teams/${teamId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update team');
  }
  return response.data;
};

// Delete a team
export const deleteTeam = async (teamId: number, adminId: string): Promise<{success: boolean; message: string}> => {
  const response = await api.delete<{success: boolean; message: string; error?: string}>(`/api/teams/${teamId}`, {
    data: { admin_id: adminId }
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete team');
  }
  return response.data;
};

// Get student's team for a specific project
export const getStudentTeam = async (
  studentId: string,
  semesterId: string, 
  projectNumber: number
): Promise<ProjectTeam | null> => {
  try {
    const response = await api.get<{success: boolean; data: {team: ProjectTeam | null; in_team: boolean}}>(`/api/teams/student/${studentId}`, {
      params: {
        semester_id: semesterId,
        project_number: projectNumber
      }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to fetch student team');
    }
    
    return response.data.data.team;
  } catch (error) {
    console.error('Error fetching student team:', error);
    return null;
  }
};

// Team submission status interface
export interface TeamSubmissionStatus {
  hasTeamSubmitted: boolean;
  hasIndividualSubmitted: boolean;
  submission: Submission | null;
  team: {
    team_id: number;
    team_name: string;
    project_number: number;
    members: string[];
  } | null;
}

// Get team submission status for a specific project
export const getTeamSubmissionStatus = async (
  studentId: string,
  projectType: 'midterm' | 'final',
  semesterId: string
): Promise<TeamSubmissionStatus | null> => {
  try {
    const response = await api.get<{success: boolean; data: TeamSubmissionStatus}>('/api/submissions/team-status', {
      params: {
        student_id: studentId,
        project_type: projectType,
        semester_id: semesterId
      }
    });
    
    if (!response.data.success) {
      throw new Error('Failed to fetch team submission status');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching team submission status:', error);
    return null;
  }
};

// Teacher Rating System interfaces
export interface TeacherRating {
  id: number;
  team_id: number | null;
  submission_id?: number | null;
  project_number: number;
  teacher_rating: number;
  teacher_id: string;
  semester_id: string;
  created_at: string;
  updated_at: string;
}

export interface StudentStarRating {
  id: number;
  team_id: number | null;
  submission_id?: number | null;
  project_number: number;
  student_id: string;
  star_rating: number;
  semester_id: string;
  created_at: string;
  updated_at: string;
}

export interface VotingResult {
  id: number;
  team_id: number;
  project_number: number;
  semester_id: string;
  total_stars: number;
  star_count: number;
  average_stars: number;
  ranking: number;
  voting_score: number;
  teacher_rating: number;
  total_score: number;
  team_name?: string;
  created_at: string;
  updated_at: string;
}

export interface RatingSubmissionRequest {
  team_id: number;
  project_number: number;
  rating: number;
  teacher_id: string;
  semester_id: string;
}

export interface StarRatingSubmissionRequest {
  team_id: number;
  project_number: number;
  star_rating: number;
  student_id: string;
  semester_id: string;
}

export interface RatingResponse {
  success: boolean;
  data: TeacherRating | StudentStarRating;
  message: string;
}

export interface VotingCalculationResponse {
  success: boolean;
  data: {
    results: VotingResult[];
    total_teams: number;
  };
  message: string;
}

// Teacher Rating API functions

// Submit or update teacher rating
export const submitTeacherRating = async (
  teamId: number | null,
  submissionId: number,
  projectNumber: number,
  rating: number,
  teacherId: string,
  semesterId: string
): Promise<TeacherRating> => {
  const payload: any = {
    project_number: projectNumber,
    rating,
    teacher_id: teacherId,
    semester_id: semesterId
  };

  // Add either team_id (for Project 1) or submission_id (for Project 2)
  if (teamId) {
    payload.team_id = teamId;
  } else {
    payload.submission_id = submissionId;
  }

  const response = await api.post<RatingResponse>('/api/ratings/teacher', payload);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to submit teacher rating');
  }

  return response.data.data as TeacherRating;
};

// Submit or update student star rating
export const submitStudentRating = async (
  teamId: number | null,
  submissionId: number,
  projectNumber: number,
  stars: number,
  voterId: string,
  semesterId: string
): Promise<StudentStarRating> => {
  const payload: any = {
    project_number: projectNumber,
    stars,
    voter_id: voterId,
    semester_id: semesterId
  };

  // Add either team_id (for Project 1) or submission_id (for Project 2)
  if (teamId) {
    payload.team_id = teamId;
  } else {
    payload.submission_id = submissionId;
  }

  const response = await api.post<RatingResponse>('/api/ratings/student', payload);

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to submit student rating');
  }

  return response.data.data as StudentStarRating;
};

// Calculate voting scores and rankings
export const calculateVotingScores = async (
  projectType: 'midterm' | 'final',
  semesterId: string,
  adminId: string
): Promise<VotingResult[]> => {
  const projectNumberMap = { midterm: 1, final: 2 };
  const projectNumber = projectNumberMap[projectType];
  
  const response = await api.post<VotingCalculationResponse>('/api/ratings/calculate-scores', {
    project_number: projectNumber,
    semester_id: semesterId,
    admin_id: adminId
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to calculate voting scores');
  }
  
  return response.data.data.results;
};

// Get project ratings for a specific project type and semester
export const getProjectRatings = async (
  projectType: 'midterm' | 'final',
  semesterId: string
): Promise<TeacherRating[]> => {
  const projectNumberMap = { midterm: 1, final: 2 };
  const projectNumber = projectNumberMap[projectType];

  const response = await api.get<{success: boolean; data: {teacher_ratings: TeacherRating[], voting_results: any[], star_ratings: any[]}}>('/api/ratings/results', {
    params: {
      project_number: projectNumber,
      semester_id: semesterId
    }
  });

  if (!response.data.success) {
    throw new Error('Failed to fetch project ratings');
  }

  return response.data.data.teacher_ratings || [];
};

// Get all project ratings results (teacher ratings, voting results, and star ratings)
export const getProjectRatingsResults = async (
  projectNumber: number,
  semesterId: string
): Promise<{success: boolean; data: {teacher_ratings: any[], voting_results: any[], star_ratings: any[]}}> => {
  const response = await api.get<{success: boolean; data: {teacher_ratings: any[], voting_results: any[], star_ratings: any[]}}>('/api/ratings/results', {
    params: {
      project_number: projectNumber,
      semester_id: semesterId
    }
  });

  return response.data;
};

// Fall Leaderboard interfaces (2-project system)
export interface FallLeaderboardEntry {
  student_id: string;
  student_name: string;
  quiz_points: number;
  project1_rating: number;
  project2_rating: number;
  total_score: number;
  rank: number;
}

export interface FallLeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: FallLeaderboardEntry[];
    total_students: number;
    showing: {
      limit: number;
      offset: number;
      total_pages: number;
      current_page: number;
    };
  };
}

// Fall Leaderboard API function
export const getFallLeaderboard = async (limit?: number, offset?: number): Promise<FallLeaderboardResponse['data']> => {
  const params: any = {};
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;

  const response = await api.get<FallLeaderboardResponse>('/api/fall-leaderboard', { params });
  if (!response.data.success) {
    throw new Error('Failed to fetch Fall leaderboard');
  }
  return response.data.data;
};

export default api;