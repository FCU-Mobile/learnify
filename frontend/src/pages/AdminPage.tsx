import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getAdminStatus, getAllStudentsAsAdmin, deleteStudent, getAllLessons as getAllLessonsAPI, updateLessonStatus, fixQuizScores, calculateBonusPoints, getFeedbackAnalytics, getAllFeedback, setCurrentSemester, getSemesterStats } from '../lib/api';
import type { Student, AdminStatus, Lesson, QuizScoreFixResponse, BonusCalculationResponse, FeedbackAnalytics, StudentFeedback, SemesterStats } from '../lib/api';
import SemesterSelector from '../components/SemesterSelector';

const AdminPage: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const navigate = useNavigate();
  
  // Check if current semester is Fall 2025 (hide System/Feedback tabs)
  const isFallSemester = selectedSemester === 'fall_2025';
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'lessons' | 'system' | 'feedback'>('students');
  const [fixScoreLoading, setFixScoreLoading] = useState(false);
  const [fixScoreResult, setFixScoreResult] = useState<QuizScoreFixResponse | null>(null);
  const [bonusLoading, setBonusLoading] = useState<'midterm' | 'final' | null>(null);
  const [bonusResults, setBonusResults] = useState<{
    midterm?: BonusCalculationResponse;
    final?: BonusCalculationResponse;
  }>({});
  const [feedbackAnalytics, setFeedbackAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [allFeedback, setAllFeedback] = useState<StudentFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  const [semesterStats, setSemesterStats] = useState<SemesterStats | null>(null);
  const [semesterStatsLoading, setSemesterStatsLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const fetchAdminData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check admin status
        const status = await getAdminStatus(studentId);
        setAdminStatus(status);

        // Get all students
        const allStudents = await getAllStudentsAsAdmin(studentId);
        setStudents(allStudents);
      } catch (error: any) {
        setError(error.message || 'Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [studentId]);

  // Load feedback data when feedback tab is selected
  useEffect(() => {
    if (!studentId || activeTab !== 'feedback') return;

    const loadFeedbackData = async () => {
      try {
        setFeedbackLoading(true);
        
        // Load feedback analytics
        const analyticsResponse = await getFeedbackAnalytics(studentId);
        setFeedbackAnalytics(analyticsResponse.data);
        
        // Load all feedback
        const feedbackResponse = await getAllFeedback(studentId);
        setAllFeedback(feedbackResponse.data.feedback);
      } catch (error: any) {
        console.error('Error loading feedback data:', error);
        setError(error.message || 'Failed to load feedback data');
      } finally {
        setFeedbackLoading(false);
      }
    };

    loadFeedbackData();
  }, [studentId, activeTab]);

  // Load semester stats when semester changes
  useEffect(() => {
    if (!selectedSemester) return;

    const loadSemesterStats = async () => {
      try {
        setSemesterStatsLoading(true);
        const statsResponse = await getSemesterStats(selectedSemester);
        setSemesterStats(statsResponse.data.stats);
      } catch (error: any) {
        console.error('Error loading semester stats:', error);
      } finally {
        setSemesterStatsLoading(false);
      }
    };

    loadSemesterStats();
  }, [selectedSemester]);

  // Load lessons when selected semester changes
  useEffect(() => {
    if (!selectedSemester) {
      setLessons([]); // Clear lessons when no semester selected
      return;
    }

    const loadLessonsForSemester = async () => {
      try {
        console.log('Admin loading lessons for semester:', selectedSemester);
        const allLessons = await getAllLessonsAPI({ semester: selectedSemester });
        console.log(`Admin loaded ${allLessons.length} lessons for ${selectedSemester}`);
        setLessons(allLessons);
      } catch (error: any) {
        console.error('Error loading lessons for semester:', error);
        setLessons([]);
      }
    };

    loadLessonsForSemester();
  }, [selectedSemester]);

  // Auto-switch to available tab if current tab is hidden for Fall semester
  useEffect(() => {
    if (isFallSemester && (activeTab === 'system' || activeTab === 'feedback')) {
      setActiveTab('students');
    }
  }, [isFallSemester, activeTab]);

  const handleSetCurrentSemester = async (semesterCode: string) => {
    if (!studentId) return;
    
    try {
      const response = await setCurrentSemester(semesterCode, studentId);
      alert(`✅ ${response.message}`);
      // Refresh the page to show updated current semester
      window.location.reload();
    } catch (error: any) {
      alert(`❌ ${error.message || 'Failed to set current semester'}`);
    }
  };

  const handleDeleteStudent = async (targetStudentId: string) => {
    if (!studentId || !window.confirm(`Are you sure you want to delete student ${targetStudentId}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(targetStudentId);
      const result = await deleteStudent(studentId, targetStudentId);
      
      // Remove deleted student from local state
      setStudents(prev => prev.filter(s => s.student_id !== targetStudentId));
      
      alert(`✅ ${result.message}`);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleStudentClick = (targetStudentId: string) => {
    navigate(`/profile/${targetStudentId}`);
  };

  const handleLessonStatusUpdate = async (lessonId: string, newStatus: 'normal' | 'skipped' | 'cancelled') => {
    try {
      setStatusUpdateLoading(lessonId);
      const updatedLesson = await updateLessonStatus(lessonId, newStatus);
      
      // Update local state
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
      
      alert(`✅ Lesson status updated to ${newStatus}`);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleFixQuizScores = async () => {
    if (!studentId || !window.confirm('This will recalculate all quiz scores to remove duplicates. Each question will only award points once. Continue?')) {
      return;
    }

    try {
      setFixScoreLoading(true);
      setFixScoreResult(null);
      const result = await fixQuizScores(studentId);
      setFixScoreResult(result);
      alert(`✅ ${result.message}`);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setFixScoreLoading(false);
    }
  };

  const handleCalculateBonus = async (projectType: 'midterm' | 'final') => {
    if (!window.confirm(`Calculate bonus points for the most voted ${projectType} project? This will award 50 bonus points to the winning project.`)) {
      return;
    }

    try {
      setBonusLoading(projectType);
      const result = await calculateBonusPoints(projectType);
      setBonusResults(prev => ({ ...prev, [projectType]: result }));
      alert(`✅ ${result.message}`);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setBonusLoading(null);
    }
  };

  const formatLessonDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-red-100">
                  Welcome, {adminStatus?.admin.full_name} ({adminStatus?.admin.student_id})
                </p>
              </div>
            </div>
            
            {/* Semester Controls */}
            <div className="flex items-center space-x-4">
              {selectedSemester && (
                <button
                  onClick={() => handleSetCurrentSemester(selectedSemester)}
                  className="bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                  title="Set this semester as current"
                >
                  Set as Current
                </button>
              )}
            </div>
          </div>
          
          {/* Semester Stats */}
          {selectedSemester && (
            <div className="mt-6 bg-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Semester Statistics</h3>
              {semesterStatsLoading ? (
                <div className="animate-pulse">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-white/20 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : semesterStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{semesterStats.total_check_ins}</div>
                    <div className="text-red-100 text-sm">Check-ins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{semesterStats.total_submissions}</div>
                    <div className="text-red-100 text-sm">Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{semesterStats.total_votes}</div>
                    <div className="text-red-100 text-sm">Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{semesterStats.total_notes}</div>
                    <div className="text-red-100 text-sm">Notes</div>
                  </div>
                </div>
              ) : (
                <div className="text-red-100">No stats available for this semester</div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {adminStatus?.permissions.map((permission) => (
              <span
                key={permission}
                className="bg-red-500 text-red-100 px-3 py-1 rounded-full text-sm"
              >
                {permission.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Lessons</p>
                <p className="text-2xl font-bold text-gray-900">{lessons.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-book text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Skipped Lessons</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lessons.filter(l => l.status === 'skipped').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {students.filter(s => s.is_admin).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-shield-alt text-red-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('students')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-users mr-2"></i>
                Students ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('lessons')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'lessons'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="fas fa-book mr-2"></i>
                Lessons ({lessons.length})
              </button>
              {!isFallSemester && (
                <button
                  onClick={() => setActiveTab('system')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'system'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className="fas fa-cogs mr-2"></i>
                  System
                </button>
              )}
              {!isFallSemester && (
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'feedback'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className="fas fa-comments mr-2"></i>
                  Feedback
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">All Students</h2>
              <p className="text-sm text-gray-600 mt-1">Manage student accounts • Click on any student to view their profile</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Midterm Project
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr 
                      key={student.student_id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleStudentClick(student.student_id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {student.student_id.substring(0, 2)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.full_name}
                            </div>
                            <div className="text-sm text-gray-500">{student.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.is_admin ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Student
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {student.has_midterm_project ? (
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              <i className="fas fa-check mr-1"></i>
                              Submitted
                              {student.midterm_project_count && student.midterm_project_count > 1 && (
                                <span className="ml-1 px-1 bg-green-200 rounded-full text-xs">
                                  {student.midterm_project_count}
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            <i className="fas fa-minus mr-1"></i>
                            Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {student.has_final_project ? (
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              <i className="fas fa-check mr-1"></i>
                              Submitted
                              {student.final_project_count && student.final_project_count > 1 && (
                                <span className="ml-1 px-1 bg-blue-200 rounded-full text-xs">
                                  {student.final_project_count}
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            <i className="fas fa-minus mr-1"></i>
                            Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!student.is_admin && student.student_id !== studentId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student.student_id);
                            }}
                            disabled={deleteLoading === student.student_id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                          >
                            {deleteLoading === student.student_id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <i className="fas fa-trash"></i>
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        )}
                        {student.is_admin && (
                          <span className="text-gray-400 text-sm">Protected</span>
                        )}
                        {student.student_id === studentId && (
                          <span className="text-blue-600 text-sm">You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lessons Tab */}
        {activeTab === 'lessons' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Lesson Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Update lesson status • Mark lessons as normal, skipped, or cancelled
                {selectedSemester && (
                  <span className="font-medium text-blue-600"> • Showing {selectedSemester} semester</span>
                )}
              </p>
            </div>

            {!selectedSemester ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Semester</h3>
                <p className="text-sm">Choose a semester from the navigation to view and manage its lessons.</p>
              </div>
            ) : lessons.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Lessons Found</h3>
                <p className="text-sm">No lessons are available for the selected semester.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lesson
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lessons.sort((a, b) => a.lesson_number - b.lesson_number).map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 bg-gradient-to-r ${lesson.color} rounded-lg flex items-center justify-center`}>
                            <i className={`${lesson.icon} text-white text-sm`}></i>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lesson.name}
                            </div>
                            <div className="text-sm text-gray-500">{lesson.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatLessonDate(lesson.scheduled_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lesson.status === 'normal' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                        {lesson.status === 'skipped' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Skipped
                          </span>
                        )}
                        {lesson.status === 'cancelled' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {lesson.status !== 'normal' && (
                            <button
                              onClick={() => handleLessonStatusUpdate(lesson.id, 'normal')}
                              disabled={statusUpdateLoading === lesson.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Normal"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          {lesson.status !== 'skipped' && (
                            <button
                              onClick={() => handleLessonStatusUpdate(lesson.id, 'skipped')}
                              disabled={statusUpdateLoading === lesson.id}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Skipped"
                            >
                              <i className="fas fa-forward"></i>
                            </button>
                          )}
                          {lesson.status !== 'cancelled' && (
                            <button
                              onClick={() => handleLessonStatusUpdate(lesson.id, 'cancelled')}
                              disabled={statusUpdateLoading === lesson.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark as Cancelled"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                          {statusUpdateLoading === lesson.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {!isFallSemester && activeTab === 'system' && (
          <div className="space-y-6">
            {/* Quiz Score Fix Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Quiz Score Management</h2>
                <p className="text-sm text-gray-600 mt-1">Fix quiz scoring issues and manage quiz system settings</p>
              </div>

              <div className="p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Quiz Score Issue:</strong> The system previously allowed students to earn points multiple times for the same question. 
                        This fix will recalculate scores so each question only awards points once (5 points per question).
                        {fixScoreResult && (
                          <span className="font-medium">
                            {' '}Max possible: {fixScoreResult.data.quiz_system_info.max_possible_points} points 
                            ({fixScoreResult.data.quiz_system_info.total_active_questions} questions).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleFixQuizScores}
                    disabled={fixScoreLoading}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                  >
                    {fixScoreLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Fixing Quiz Scores...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-calculator"></i>
                        <span>Fix Quiz Scores</span>
                      </>
                    )}
                  </button>
                  
                  {fixScoreResult && (
                    <div className="text-sm text-gray-600">
                      <i className="fas fa-check-circle text-green-600 mr-1"></i>
                      Fixed {fixScoreResult.data.students_processed} students
                    </div>
                  )}
                </div>

                {/* Fix Results */}
                {fixScoreResult && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Fix Results Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{fixScoreResult.data.students_processed}</div>
                        <div className="text-sm text-gray-600">Students Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{fixScoreResult.data.total_points_corrected}</div>
                        <div className="text-sm text-gray-600">Total Points Corrected</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{fixScoreResult.data.details.length}</div>
                        <div className="text-sm text-gray-600">Records Updated</div>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    {fixScoreResult.data.details.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Student ID</th>
                              <th className="px-3 py-2 text-left">Old Points</th>
                              <th className="px-3 py-2 text-left">New Points</th>
                              <th className="px-3 py-2 text-left">Correction</th>
                              <th className="px-3 py-2 text-left">Questions Answered</th>
                              <th className="px-3 py-2 text-left">Total Attempts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {fixScoreResult.data.details.map((detail, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{detail.student_id}</td>
                                <td className="px-3 py-2">{detail.old_points}</td>
                                <td className="px-3 py-2 font-semibold text-green-600">{detail.new_points}</td>
                                <td className={`px-3 py-2 font-medium ${detail.points_corrected === 0 ? 'text-gray-500' : detail.points_corrected > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {detail.points_corrected === 0 ? 'No change' : `${detail.points_corrected > 0 ? '+' : ''}${detail.points_corrected}`}
                                </td>
                                <td className="px-3 py-2">{detail.unique_questions_answered}</td>
                                <td className="px-3 py-2">{detail.total_attempts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Voting Bonus Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Project Voting Bonus</h2>
                <p className="text-sm text-gray-600 mt-1">Award bonus points to most voted projects</p>
              </div>

              <div className="p-6">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-info-circle text-blue-400"></i>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Bonus Point System:</strong> Award 50 bonus points to the project with the most votes. 
                        This action counts all votes (no date restrictions) and can only be done once per project.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Midterm Projects */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">Midterm Projects</h3>
                    <button
                      onClick={() => handleCalculateBonus('midterm')}
                      disabled={bonusLoading === 'midterm'}
                      className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                    >
                      {bonusLoading === 'midterm' ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trophy"></i>
                          <span>Award Midterm Bonus</span>
                        </>
                      )}
                    </button>
                    
                    {bonusResults.midterm && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <i className="fas fa-check-circle text-green-600 mr-1"></i>
                        {bonusResults.midterm.message}
                        {bonusResults.midterm.data && (
                          <div className="mt-2 text-xs">
                            Submission ID: {bonusResults.midterm.data.submission_id} • 
                            Votes: {bonusResults.midterm.data.vote_count} • 
                            Bonus: {bonusResults.midterm.data.bonus_awarded} points
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Final Projects */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">Final Projects</h3>
                    <button
                      onClick={() => handleCalculateBonus('final')}
                      disabled={bonusLoading === 'final'}
                      className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                    >
                      {bonusLoading === 'final' ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trophy"></i>
                          <span>Award Final Bonus</span>
                        </>
                      )}
                    </button>
                    
                    {bonusResults.final && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <i className="fas fa-check-circle text-green-600 mr-1"></i>
                        {bonusResults.final.message}
                        {bonusResults.final.data && (
                          <div className="mt-2 text-xs">
                            Submission ID: {bonusResults.final.data.submission_id} • 
                            Votes: {bonusResults.final.data.vote_count} • 
                            Bonus: {bonusResults.final.data.bonus_awarded} points
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
                <p className="text-sm text-gray-600 mt-1">System status and maintenance tools</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Database Status</h3>
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between py-1">
                        <span>Students:</span>
                        <span>{students.length}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Lessons:</span>
                        <span>{lessons.length}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Admin Users:</span>
                        <span>{students.filter(s => s.is_admin).length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Quiz System</h3>
                    <div className="text-sm text-gray-600">
                      {fixScoreResult ? (
                        <>
                          <div className="flex justify-between py-1">
                            <span>Active Questions:</span>
                            <span>{fixScoreResult.data.quiz_system_info.total_active_questions}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Points per Question:</span>
                            <span>{fixScoreResult.data.quiz_system_info.points_per_question}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Max Possible Points:</span>
                            <span className="font-semibold text-green-600">{fixScoreResult.data.quiz_system_info.max_possible_points}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between py-1">
                            <span>Active Questions:</span>
                            <span>Run fix to see current count</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Points per Question:</span>
                            <span>5</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Max Possible Points:</span>
                            <span>Dynamic (based on question count)</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Tab */}
        {!isFallSemester && activeTab === 'feedback' && (
          <div className="space-y-6">
            {/* Feedback Overview Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Feedback Analytics</h2>
                <p className="text-sm text-gray-600 mt-1">Student feedback statistics and insights</p>
              </div>

              <div className="p-6">
                {feedbackLoading ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Loading feedback data...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    {feedbackAnalytics && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {feedbackAnalytics.total_responses}
                          </div>
                          <div className="text-sm text-blue-700">Total Responses</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {feedbackAnalytics.average_rating ? feedbackAnalytics.average_rating.toFixed(1) : 'N/A'}
                          </div>
                          <div className="text-sm text-green-700">Average Rating</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {feedbackAnalytics.response_rate ? Math.round(feedbackAnalytics.response_rate) : 0}%
                          </div>
                          <div className="text-sm text-yellow-700">Response Rate</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {feedbackAnalytics.improvement_suggestions || 0}
                          </div>
                          <div className="text-sm text-purple-700">Improvement Topics</div>
                        </div>
                      </div>
                    )}

                    {/* Rating Distribution */}
                    {feedbackAnalytics && feedbackAnalytics.rating_distribution && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
                        <div className="space-y-3">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = feedbackAnalytics.rating_distribution[rating] || 0;
                            const percentage = feedbackAnalytics.total_responses > 0 
                              ? Math.round((count / feedbackAnalytics.total_responses) * 100) 
                              : 0;
                            return (
                              <div key={rating} className="flex items-center">
                                <div className="w-20 text-sm text-gray-600">
                                  {rating} Star{rating !== 1 ? 's' : ''}
                                </div>
                                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-4">
                                  <div
                                    className="h-4 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="w-16 text-sm text-gray-600">
                                  {count} ({percentage}%)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Popular Topics */}
                    {feedbackAnalytics && feedbackAnalytics.popular_liked_topics && feedbackAnalytics.popular_liked_topics.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Liked Topics</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Pie Chart */}
                          <div className="flex justify-center">
                            <div className="relative w-64 h-64">
                              {(() => {
                                const total = feedbackAnalytics.popular_liked_topics.reduce((sum, topic) => sum + topic.count, 0);
                                const colors = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'];
                                let currentAngle = 0;
                                
                                return (
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {feedbackAnalytics.popular_liked_topics.slice(0, 6).map((topic, index) => {
                                      const percentage = (topic.count / total) * 100;
                                      const angle = (topic.count / total) * 360;
                                      const x1 = 50 + 45 * Math.cos((currentAngle - 90) * Math.PI / 180);
                                      const y1 = 50 + 45 * Math.sin((currentAngle - 90) * Math.PI / 180);
                                      const x2 = 50 + 45 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
                                      const y2 = 50 + 45 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
                                      
                                      const largeArc = angle > 180 ? 1 : 0;
                                      const pathData = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                      
                                      const result = (
                                        <path
                                          key={index}
                                          d={pathData}
                                          fill={colors[index % colors.length]}
                                          stroke="white"
                                          strokeWidth="0.5"
                                        />
                                      );
                                      
                                      currentAngle += angle;
                                      return result;
                                    })}
                                  </svg>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Legend and Data */}
                          <div className="space-y-3">
                            {feedbackAnalytics.popular_liked_topics.slice(0, 6).map((topic, index) => {
                              const total = feedbackAnalytics.popular_liked_topics.reduce((sum, t) => sum + t.count, 0);
                              const percentage = Math.round((topic.count / total) * 100);
                              const colors = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'];
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: colors[index % colors.length] }}
                                    ></div>
                                    <span className="font-medium text-green-800">{topic.topic}</span>
                                  </div>
                                  <div className="text-sm text-green-600">
                                    {topic.count} votes ({percentage}%)
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Improvement Areas */}
                    {feedbackAnalytics && feedbackAnalytics.popular_improvement_topics && feedbackAnalytics.popular_improvement_topics.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas for Improvement</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Pie Chart */}
                          <div className="flex justify-center">
                            <div className="relative w-64 h-64">
                              {(() => {
                                const total = feedbackAnalytics.popular_improvement_topics.reduce((sum, topic) => sum + topic.count, 0);
                                const colors = ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03'];
                                let currentAngle = 0;
                                
                                return (
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {feedbackAnalytics.popular_improvement_topics.slice(0, 6).map((topic, index) => {
                                      const percentage = (topic.count / total) * 100;
                                      const angle = (topic.count / total) * 360;
                                      const x1 = 50 + 45 * Math.cos((currentAngle - 90) * Math.PI / 180);
                                      const y1 = 50 + 45 * Math.sin((currentAngle - 90) * Math.PI / 180);
                                      const x2 = 50 + 45 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
                                      const y2 = 50 + 45 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
                                      
                                      const largeArc = angle > 180 ? 1 : 0;
                                      const pathData = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                      
                                      const result = (
                                        <path
                                          key={index}
                                          d={pathData}
                                          fill={colors[index % colors.length]}
                                          stroke="white"
                                          strokeWidth="0.5"
                                        />
                                      );
                                      
                                      currentAngle += angle;
                                      return result;
                                    })}
                                  </svg>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Legend and Data */}
                          <div className="space-y-3">
                            {feedbackAnalytics.popular_improvement_topics.slice(0, 6).map((topic, index) => {
                              const total = feedbackAnalytics.popular_improvement_topics.reduce((sum, t) => sum + t.count, 0);
                              const percentage = Math.round((topic.count / total) * 100);
                              const colors = ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03'];
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: colors[index % colors.length] }}
                                    ></div>
                                    <span className="font-medium text-orange-800">{topic.topic}</span>
                                  </div>
                                  <div className="text-sm text-orange-600">
                                    {topic.count} votes ({percentage}%)
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Future Interests */}
                    {feedbackAnalytics && feedbackAnalytics.popular_future_topics && feedbackAnalytics.popular_future_topics.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Future Learning Interests</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Pie Chart */}
                          <div className="flex justify-center">
                            <div className="relative w-64 h-64">
                              {(() => {
                                const total = feedbackAnalytics.popular_future_topics.reduce((sum, topic) => sum + topic.count, 0);
                                const colors = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554'];
                                let currentAngle = 0;
                                
                                return (
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {feedbackAnalytics.popular_future_topics.slice(0, 6).map((topic, index) => {
                                      const percentage = (topic.count / total) * 100;
                                      const angle = (topic.count / total) * 360;
                                      const x1 = 50 + 45 * Math.cos((currentAngle - 90) * Math.PI / 180);
                                      const y1 = 50 + 45 * Math.sin((currentAngle - 90) * Math.PI / 180);
                                      const x2 = 50 + 45 * Math.cos((currentAngle + angle - 90) * Math.PI / 180);
                                      const y2 = 50 + 45 * Math.sin((currentAngle + angle - 90) * Math.PI / 180);
                                      
                                      const largeArc = angle > 180 ? 1 : 0;
                                      const pathData = `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                      
                                      const result = (
                                        <path
                                          key={index}
                                          d={pathData}
                                          fill={colors[index % colors.length]}
                                          stroke="white"
                                          strokeWidth="0.5"
                                        />
                                      );
                                      
                                      currentAngle += angle;
                                      return result;
                                    })}
                                  </svg>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* Legend and Data */}
                          <div className="space-y-3">
                            {feedbackAnalytics.popular_future_topics.slice(0, 6).map((topic, index) => {
                              const total = feedbackAnalytics.popular_future_topics.reduce((sum, t) => sum + t.count, 0);
                              const percentage = Math.round((topic.count / total) * 100);
                              const colors = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554'];
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: colors[index % colors.length] }}
                                    ></div>
                                    <span className="font-medium text-blue-800">{topic.topic}</span>
                                  </div>
                                  <div className="text-sm text-blue-600">
                                    {topic.count} votes ({percentage}%)
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Student Text Responses */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Text Responses</h3>
                      <div className="space-y-6">
                        {allFeedback && allFeedback.length > 0 ? (
                          allFeedback.map((feedback) => (
                            <div key={feedback.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                              {/* Student Header */}
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                <div className="flex items-center space-x-3">
                                  <div className="font-semibold text-gray-900 text-lg">
                                    {feedback.student_id}
                                  </div>
                                  {feedback.students && (
                                    <div className="text-gray-600">
                                      ({feedback.students.full_name})
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4">
                                  {feedback.overall_rating && (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-sm text-gray-600">Rating:</span>
                                      <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <span
                                            key={star}
                                            className={star <= feedback.overall_rating! ? 'text-yellow-400' : 'text-gray-300'}
                                          >
                                            ★
                                          </span>
                                        ))}
                                      </div>
                                      <span className="text-sm text-gray-600">({feedback.overall_rating}/5)</span>
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-500">
                                    {new Date(feedback.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              {/* Semester Feedback */}
                              {feedback.semester_feedback && (
                                <div className="mb-4">
                                  <h4 className="font-medium text-gray-900 mb-2">Overall Thoughts:</h4>
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-gray-800 italic">"{feedback.semester_feedback}"</p>
                                  </div>
                                </div>
                              )}

                              {/* Topic Selections */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {/* Liked Topics */}
                                {Array.isArray(feedback.liked_topics) && feedback.liked_topics.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Enjoyed Topics:</h4>
                                    <div className="space-y-2">
                                      {feedback.liked_topics.map((topic, index) => (
                                        <div key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                          {topic}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Improvement Topics */}
                                {Array.isArray(feedback.improvement_topics) && feedback.improvement_topics.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Needs Improvement:</h4>
                                    <div className="space-y-2">
                                      {feedback.improvement_topics.map((topic, index) => (
                                        <div key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                                          {topic}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Future Topics */}
                                {Array.isArray(feedback.future_topics) && feedback.future_topics.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Future Interests:</h4>
                                    <div className="space-y-2">
                                      {feedback.future_topics.map((topic, index) => (
                                        <div key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                          {topic}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Additional Comments */}
                              {feedback.additional_comments && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Additional Comments:</h4>
                                  <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-700">{feedback.additional_comments}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-center py-12 bg-gray-50 rounded-lg">
                            <div className="text-xl mb-2">📝</div>
                            <div>No feedback submissions yet</div>
                            <div className="text-sm mt-2">Students can submit feedback through the Feedback page</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;