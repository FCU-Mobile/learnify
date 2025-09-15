import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentCheckInsForSemester, getAllStudents, getStudentReviews, getSubmissions, getStudentLeaderboardDataForSemester } from '../lib/api';
import type { Student, StudentCheckIn, StudentReview, Submission, LeaderboardEntry } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';

const ProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [checkIns, setCheckIns] = useState<StudentCheckIn[]>([]);
  const [reviews, setReviews] = useState<StudentReview[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInsLoading, setCheckInsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { selectedSemester } = useSemester();

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        setError('Student ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get all students to find the specific student
        const allStudents = await getAllStudents();
        const foundStudent = allStudents.find(s => s.student_id === studentId);
        
        if (!foundStudent) {
          setError('Student not found');
          setLoading(false);
          return;
        }

        setStudent(foundStudent);
        
        // Fetch check-ins for this student (will be refetched when semester changes)
        setCheckInsLoading(true);
        const studentCheckIns = await getStudentCheckInsForSemester(studentId, selectedSemester || undefined);
        setCheckIns(studentCheckIns);
        
        // Fetch reviews for this student
        try {
          const studentReviewsData = await getStudentReviews(studentId);
          setReviews(studentReviewsData.data.reviews);
        } catch {
          console.log('No reviews found for student, this is normal');
          setReviews([]);
        }
        
        // Fetch submissions for this student
        try {
          const studentSubmissionsData = await getSubmissions({ student_id: studentId });
          setSubmissions(studentSubmissionsData.submissions);
        } catch {
          console.log('No submissions found for student, this is normal');
          setSubmissions([]);
        }
        
        // Fetch student leaderboard data for points breakdown
        try {
          const studentLeaderboardData = await getStudentLeaderboardDataForSemester(studentId, selectedSemester || undefined);
          setLeaderboardData(studentLeaderboardData);
        } catch {
          console.log('No leaderboard data found for student, this is normal');
          setLeaderboardData(null);
        }
      } catch (err) {
        setError('Failed to fetch student data');
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
        setCheckInsLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, selectedSemester]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateTime = (dateString: string): string => {
    try {
      if (!dateString) {
        return 'No date time';
      }
      
      // Handle PostgreSQL timestamp format with variable decimal precision
      let date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        // Manual parsing for PostgreSQL format with any number of decimal digits
        const match = dateString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?\+00:00$/);
        if (match) {
          const [, datePart, timePart, ms = ''] = match;
          let paddedMs = ms;
          
          if (ms) {
            // Normalize milliseconds to exactly 3 digits
            if (ms.length < 3) {
              paddedMs = ms.padEnd(3, '0');
            } else if (ms.length > 3) {
              paddedMs = ms.substring(0, 3);
            }
          } else {
            paddedMs = '000';
          }
          
          const isoString = `${datePart}T${timePart}.${paddedMs}Z`;
          date = new Date(isoString);
        }
        
        if (isNaN(date.getTime())) {
          return dateString;
        }
      }
      
      return date.toLocaleString();
    } catch (error) {
      console.error('DateTime parsing error:', error);
      return dateString;
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) {
        return 'No date';
      }
      
      let date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        const match = dateString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?\+00:00$/);
        if (match) {
          const [, datePart, timePart, ms = ''] = match;
          let paddedMs = ms;
          
          if (ms) {
            if (ms.length < 3) {
              paddedMs = ms.padEnd(3, '0');
            } else if (ms.length > 3) {
              paddedMs = ms.substring(0, 3);
            }
          } else {
            paddedMs = '000';
          }
          
          const isoString = `${datePart}T${timePart}.${paddedMs}Z`;
          date = new Date(isoString);
        }
        
        if (isNaN(date.getTime())) {
          return dateString;
        }
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date parsing error:', error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <button
                onClick={() => navigate('/admin')}
                className="hover:text-gray-700 transition-colors"
              >
                Admin
              </button>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-gray-900 font-medium">Student Profile</span>
              {student && (
                <>
                  <i className="fas fa-chevron-right text-xs"></i>
                  <span className="text-gray-900 font-medium">{student.full_name}</span>
                </>
              )}
            </nav>
            
            {/* Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/admin')}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  {student ? `${student.full_name}'s Profile` : 'Student Profile'}
                </h1>
              </div>
              
              {/* Semester selection is now handled in the navigation */}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">{getInitials(student.full_name)}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{student.full_name}</h2>
                <p className="text-lg text-gray-600 mb-4">{student.student_id}</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <i className="fas fa-calendar text-blue-500"></i>
                  <span>Joined {formatDate(student.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Check-ins</span>
                  <span className="text-2xl font-bold text-blue-600">{checkIns.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Submissions</span>
                  <span className="text-2xl font-bold text-green-600">{submissions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Check-in</span>
                  <span className="text-sm text-gray-500">
                    {checkIns.length > 0 ? formatDate(checkIns[0]?.created_at) : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Semester-Specific Scoring System Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Scoring System</h3>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                {selectedSemester === 'fall_2025' ? (
                  // Fall 2025 scoring system
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-800 mb-3">Each Project = 30% (20% Teacher + 10% Competition)</div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5"></span>
                        <div>
                          <span className="text-blue-600 font-semibold">Project 1: 30%</span>
                          <div className="text-xs text-gray-600 ml-0 mt-1">
                            • 20% Teacher marking<br/>
                            • 10% Competition win bonus
                          </div>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3 mt-1.5"></span>
                        <div>
                          <span className="text-blue-600 font-semibold">Project 2: 30%</span>
                          <div className="text-xs text-gray-600 ml-0 mt-1">
                            • 20% Teacher marking<br/>
                            • 10% Competition win bonus
                          </div>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3 mt-1.5"></span>
                        <div>
                          <span className="text-purple-600 font-semibold">Project 3: 30%</span>
                          <div className="text-xs text-gray-600 ml-0 mt-1">
                            • 20% Teacher marking<br/>
                            • 10% Competition win bonus
                          </div>
                        </div>
                      </li>
                      <li className="flex items-center pt-2 border-t border-gray-200">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                        <span className="text-indigo-600 font-semibold mr-2">Quiz Points:</span>
                        <span className="text-gray-600">10% of final grade</span>
                      </li>
                    </ul>
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                      📝 Note: Voting system for competitions will be implemented later
                    </div>
                  </div>
                ) : (
                  // Summer 2025 scoring system  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      <span className="text-green-600 font-semibold mr-2">Check-ins & Reviews:</span>
                      <span className="text-gray-600">10 points each</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span className="text-blue-600 font-semibold mr-2">Midterm Projects:</span>
                      <span className="text-gray-600">20 points each</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                      <span className="text-blue-600 font-semibold mr-2">Final Projects:</span>
                      <span className="text-gray-600">50 points each</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                      <span className="text-purple-600 font-semibold mr-2">Project Notes:</span>
                      <span className="text-gray-600">5 points per note</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                      <span className="text-orange-600 font-semibold mr-2">Votes Cast:</span>
                      <span className="text-gray-600">5 points per vote</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                      <span className="text-indigo-600 font-semibold mr-2">Quiz Points:</span>
                      <span className="text-gray-600">5 points per correct answer</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                      <span className="text-yellow-600 font-semibold mr-2">🏆 Vote Winner Bonus:</span>
                      <span className="text-gray-600">50 points (from Aug 26, 2025)</span>
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {/* Current Marks Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Points</h3>
              {leaderboardData && leaderboardData.points_breakdown ? (
                <div className="space-y-4">
                  {/* Points Breakdown */}
                  {leaderboardData.points_breakdown.check_in_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-check text-green-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Check-ins</p>
                          <p className="text-xs text-gray-500">Daily engagement</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        +{leaderboardData.points_breakdown.check_in_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.review_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-mobile-alt text-green-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">App Reviews</p>
                          <p className="text-xs text-gray-500">Mobile app feedback</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        +{leaderboardData.points_breakdown.review_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.midterm_project_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-project-diagram text-blue-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedSemester === 'fall_2025' ? 'Project 1' : 'Midterm Projects'}</p>
                          <p className="text-xs text-gray-500">{selectedSemester === 'fall_2025' ? '20% teacher + 10% competition' : `${leaderboardData.points_breakdown.midterm_project_points / 20} submitted`}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        +{leaderboardData.points_breakdown.midterm_project_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.final_project_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                          <i className="fas fa-trophy text-blue-700 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedSemester === 'fall_2025' ? 'Project 2' : 'Final Projects'}</p>
                          <p className="text-xs text-gray-500">{selectedSemester === 'fall_2025' ? '20% teacher + 10% competition' : `${leaderboardData.points_breakdown.final_project_points / 50} submitted`}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        +{leaderboardData.points_breakdown.final_project_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.project_notes_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-sticky-note text-purple-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedSemester === 'fall_2025' ? 'Project 3' : 'Project Notes'}</p>
                          <p className="text-xs text-gray-500">{selectedSemester === 'fall_2025' ? '20% teacher + 10% competition' : `${leaderboardData.points_breakdown.project_notes_points / 5} notes written`}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-purple-600">
                        +{leaderboardData.points_breakdown.project_notes_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.voting_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-vote-yea text-orange-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Votes Cast</p>
                          <p className="text-xs text-gray-500">{leaderboardData.points_breakdown.voting_points / 5} votes submitted</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-orange-600">
                        +{leaderboardData.points_breakdown.voting_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.quiz_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-brain text-indigo-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Quiz Points</p>
                          <p className="text-xs text-gray-500">{selectedSemester === 'fall_2025' ? '10% of final grade' : `${leaderboardData.points_breakdown.quiz_points / 5} correct answers`}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">
                        +{leaderboardData.points_breakdown.quiz_points}
                      </span>
                    </div>
                  )}

                  {leaderboardData.points_breakdown.bonus_points > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-crown text-yellow-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">🏆 Vote Winner Bonus</p>
                          <p className="text-xs text-gray-500">Most voted project</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-yellow-600">
                        +{leaderboardData.points_breakdown.bonus_points}
                      </span>
                    </div>
                  )}

                  {/* Total Score */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total Points</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600">
                          {leaderboardData.total_marks}
                        </span>
                        <p className="text-xs text-gray-500">Rank #{leaderboardData.rank}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-chart-bar text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-500">Loading points breakdown...</p>
                </div>
              )}
            </div>
          </div>

          {/* Check-ins List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Check-in History</h3>
                  <span className="text-sm text-gray-500">{checkIns.length} total check-ins</span>
                </div>
              </div>
              
              <div className="p-6">
                {checkInsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading check-ins...</p>
                  </div>
                ) : checkIns.length > 0 ? (
                  <div className="space-y-4">
                    {checkIns.map((checkIn, index) => (
                      <div key={checkIn.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-check text-green-600 text-lg"></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">Daily Check-in #{checkIns.length - index}</p>
                              <p className="text-sm text-gray-600">{formatDateTime(checkIn.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Completed
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-calendar-times text-gray-400 text-2xl"></i>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Check-ins Yet</h4>
                    <p className="text-gray-500">This student hasn't completed any check-ins yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;