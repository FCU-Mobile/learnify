import React, { useState, useEffect } from 'react';
import { getFallLeaderboard, type FallLeaderboardEntry } from '../lib/api';

const FallLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<FallLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getFallLeaderboard();
      setLeaderboard(data.leaderboard);
      setTotalStudents(data.total_students);
      setError(null);
    } catch (err) {
      setError('Error loading leaderboard');
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadgeColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
    }
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️ Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Fall Semester Leaderboard</h3>
          <span className="text-sm text-gray-500">{totalStudents} students</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Scores based on Quiz (10%) + Midterm/Team (40%) + Final/Individual (50%)
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {leaderboard.length > 0 ? (
          leaderboard.map((student) => (
            <div key={student.student_id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Rank Badge */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadgeColor(student.rank)} font-bold text-lg`}>
                    {student.rank <= 3 ? getRankEmoji(student.rank) : student.rank}
                  </div>

                  {/* Student Info */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {student.student_name}
                    </h4>
                    <p className="text-sm text-gray-500">{student.student_id}</p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {student.total_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Quiz: {student.quiz_points.toFixed(1)}</div>
                    <div className="flex space-x-2">
                      <span>Midterm: {student.project1_rating.toFixed(1)}</span>
                      <span>Final: {student.project2_rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">🏆</div>
            <p className="text-gray-600">No students in the leaderboard yet.</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          <p><strong>Scoring:</strong> Quiz (10% of total quiz points) + Project 1 (40%) + Project 2 (50%)</p>
          <p><strong>Projects:</strong> Rated by instructor from 0-20 points each</p>
        </div>
      </div>
    </div>
  );
};

export default FallLeaderboard;