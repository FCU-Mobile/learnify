

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getStudentCheckInsForSemester, getLeaderboard, getStudentReviews, checkInStudent } from '../lib/api';

const QuickStats: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const [checkInsCount, setCheckInsCount] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = async () => {
    if (!studentId) return;

    try {
      // Fetch check-ins
      const checkIns = await getStudentCheckInsForSemester(studentId, selectedSemester || undefined);
      setCheckInsCount(checkIns.length);

      // Check if user has checked in today
      const today = new Date().toDateString();
      const hasCheckedToday = checkIns.some(checkIn => {
        const checkInDate = new Date(checkIn.created_at).toDateString();
        return checkInDate === today;
      });
      setHasCheckedInToday(hasCheckedToday);

      // Fetch leaderboard for updated total marks
      const leaderboard = await getLeaderboard();
      const userEntry = leaderboard.find(entry => entry.student_id === studentId);
      setTotalMarks(userEntry?.total_marks || 0);

      // Fetch reviews
      try {
        const reviewsData = await getStudentReviews(studentId);
        setReviewsCount(reviewsData.data.reviews.length);
      } catch (error) {
        console.log('No reviews found, setting to 0');
        setReviewsCount(0);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!studentId) return;

      try {
        setIsLoading(true);
        await refreshStats();
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [studentId, selectedSemester]);

  const handleCheckIn = async () => {
    if (!studentId || hasCheckedInToday || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      await checkInStudent({ student_id: studentId });
      // Refresh all stats from server to get accurate data
      await refreshStats();
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded mb-2 w-24"></div>
              <div className="h-8 bg-gray-200 rounded mb-2 w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Check-in Button */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            hasCheckedInToday ? 'bg-gray-100' : 'bg-green-100'
          }`}>
            <i className={`fas fa-check text-xl ${
              hasCheckedInToday ? 'text-gray-400' : 'text-green-600'
            }`}></i>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            hasCheckedInToday 
              ? 'bg-gray-100 text-gray-600' 
              : 'bg-green-100 text-green-800'
          }`}>
            {hasCheckedInToday ? 'Completed' : 'Available'}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Daily Check-in</h3>
        <p className="text-sm text-gray-600 mb-4">
          {hasCheckedInToday ? 'Already checked in today!' : 'Earn 10 points for checking in today'}
        </p>
        <button 
          onClick={handleCheckIn}
          disabled={hasCheckedInToday || isCheckingIn}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            hasCheckedInToday 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isCheckingIn ? 'Checking in...' : hasCheckedInToday ? 'Checked In' : 'Check In Now'}
        </button>
      </div>

      {/* Total Points */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-star text-blue-600 text-xl"></i>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {totalMarks > 0 ? `${totalMarks}/50` : 'Start earning'}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Total Points</h3>
        <p className="text-2xl font-bold text-gray-900">{totalMarks}</p>
        <p className="text-sm text-gray-600">
          {totalMarks > 0 ? 'Keep it up! 🚀' : 'Check in to start earning!'}
        </p>
      </div>

      {/* Check-ins Count */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-calendar-check text-purple-600 text-xl"></i>
          </div>
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
            {checkInsCount > 0 ? 'Active' : 'Start now'}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Check-ins</h3>
        <p className="text-2xl font-bold text-gray-900">{checkInsCount}</p>
        <p className="text-sm text-gray-600">Total check-ins</p>
      </div>

      {/* App Reviews */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-mobile-alt text-orange-600 text-xl"></i>
          </div>
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
            {reviewsCount > 0 ? `${reviewsCount} submitted` : 'None yet'}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">App Reviews</h3>
        <p className="text-2xl font-bold text-gray-900">{reviewsCount}</p>
        <p className="text-sm text-gray-600">
          {reviewsCount > 0 ? 'Great work!' : 'Submit your first review'}
        </p>
      </div>
    </div>
  );
};

export default QuickStats; 