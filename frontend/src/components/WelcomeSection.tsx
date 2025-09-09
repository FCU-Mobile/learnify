
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStudentCheckIns, getLeaderboard, getAllStudents } from '../lib/api';
import type { Student, LeaderboardEntry } from '../lib/api';

interface WelcomeSectionProps {
  selectedSemester?: string | null;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ selectedSemester }) => {
  const { studentId } = useAuth();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [checkInsCount, setCheckInsCount] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalMarks, setTotalMarks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!studentId) return;

      try {
        setIsLoading(true);

        // Fetch student data
        const allStudents = await getAllStudents();
        const currentStudent = allStudents.find(student => student.student_id === studentId);
        setStudentData(currentStudent || null);

        // Fetch check-ins for streak calculation
        const checkIns = await getStudentCheckIns(studentId);
        setCheckInsCount(checkIns.length);

        // Fetch leaderboard for rank and marks
        const leaderboard = await getLeaderboard();
        const userEntry = leaderboard.find(entry => entry.student_id === studentId);
        if (userEntry) {
          setUserRank(userEntry.rank);
          setTotalMarks(userEntry.total_marks);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [studentId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = (fullName: string) => {
    return fullName ? fullName.split(' ')[0] : 'Student';
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded mb-4 w-64"></div>
              <div className="h-6 bg-white/20 rounded mb-6 w-96"></div>
              <div className="flex space-x-6">
                <div className="h-6 bg-white/20 rounded w-20"></div>
                <div className="h-6 bg-white/20 rounded w-20"></div>
                <div className="h-6 bg-white/20 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">
            {getGreeting()}, {studentData ? getFirstName(studentData.full_name) : studentId}! 👋
          </h2>
          <p className="text-blue-100 text-lg mb-6">
            {checkInsCount > 0 
              ? "Keep up the great work on your learning journey!" 
              : selectedSemester === 'fall_2025' 
                ? "Welcome to Fall semester! View your progress below."
                : "Ready to start your learning journey? Let's get started!"
            }
          </p>
          <div className="flex items-center space-x-6 flex-wrap gap-y-2">
            {/* Hide check-ins for Fall semester */}
            {selectedSemester !== 'fall_2025' && (
              <div className="flex items-center space-x-2">
                <i className="fas fa-check-circle text-green-400"></i>
                <span className="font-semibold">{checkInsCount} check-in{checkInsCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <i className="fas fa-star text-yellow-400"></i>
              <span className="font-semibold">{totalMarks} points</span>
            </div>
            {userRank && (
              <div className="flex items-center space-x-2">
                <i className="fas fa-trophy text-yellow-400"></i>
                <span className="font-semibold">Rank #{userRank}</span>
              </div>
            )}
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      </div>
    </div>
  );
};

export default WelcomeSection; 