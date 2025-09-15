
import React, { useState, useEffect } from 'react';
import { getLeaderboardForSemester } from '../lib/api';
import type { LeaderboardEntry } from '../lib/api';

interface LeaderboardProps {
  semesterCode?: string | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ semesterCode }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isFallSemester = semesterCode === 'fall_2025';

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const leaderboardData = await getLeaderboardForSemester(semesterCode || undefined);
      setLeaderboard(leaderboardData);
    } catch (err) {
      setError('Failed to fetch leaderboard');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [semesterCode]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-100';
      case 2: return 'text-gray-600 bg-gray-100';
      case 3: return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const getGradientColor = (index: number): string => {
    const gradients = [
      'from-yellow-400 to-yellow-600',
      'from-gray-400 to-gray-600',
      'from-orange-400 to-orange-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
    ];
    return gradients[index % gradients.length];
  };


  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">🏆 Leaderboard</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">🏆 Leaderboard</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">🏆 Leaderboard</h3>
        </div>
        <div className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trophy text-gray-400 text-2xl"></i>
            </div>
            <p className="text-gray-500">No students on the leaderboard yet</p>
          </div>
        </div>
      </div>
    );
  }

  // For Fall semester, show link to dedicated leaderboard page
  if (isFallSemester) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">🏆 Fall Leaderboard</h3>
          </div>
        </div>

        {/* Scoring Information for Fall */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
          <h4 className="text-base font-semibold text-gray-900 mb-4">
            📊 Fall 2025 Scoring System (Updated)
          </h4>
          <div className="bg-white p-4 rounded-lg shadow-sm">
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
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-1.5"></span>
                  <div>
                    <span className="text-green-600 font-semibold">Project 3: 30%</span>
                    <div className="text-xs text-gray-600 ml-0 mt-1">
                      • 20% Teacher marking<br/>
                      • 10% Competition win bonus
                    </div>
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  <span className="text-indigo-600 font-semibold mr-2">Quiz Points:</span>
                  <span className="text-gray-600">10% of final grade</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-trophy text-orange-600 text-2xl"></i>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Fall 2025 Rankings</h4>
          <p className="text-gray-600 mb-4 text-sm">
            View detailed project ratings and comprehensive Fall semester rankings
          </p>
          <a
            href="/leaderboard"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <i className="fas fa-chart-line mr-2"></i>
            View Fall Leaderboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">🏆 Leaderboard</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">{leaderboard.length} students ranked</span>
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Scoring Information */}
      <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          📊 {isFallSemester ? 'Fall 2025' : 'Summer 2025'} Scoring System {isFallSemester ? '(Updated)' : '(Includes Fall Projects)'}
        </h4>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {isFallSemester ? (
            // Fall 2025 Scoring
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
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-1.5"></span>
                  <div>
                    <span className="text-green-600 font-semibold">Project 3: 30%</span>
                    <div className="text-xs text-gray-600 ml-0 mt-1">
                      • 20% Teacher marking<br/>
                      • 10% Competition win bonus
                    </div>
                  </div>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                  <span className="text-indigo-600 font-semibold mr-2">Quiz Points:</span>
                  <span className="text-gray-600">10% of final grade</span>
                </li>
              </ul>
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span className="font-medium">Total: 100%</span> • Check-ins, reviews worth 0% for Fall semester<br/>
                📝 Note: Voting system for competitions will be implemented later
              </div>
            </div>
          ) : (
            // Summer 2025 Scoring (Includes Fall Projects)
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-800 mb-3">
                Summer semester includes all activities plus Fall semester project scores
              </div>
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
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span className="font-medium">📋 Note:</span> Fall semester project ratings are included in Summer scores<br/>
                Fall projects use teacher ratings (0-20 points each) + competition bonuses
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
          <div className="flex justify-center items-end space-x-8">
            {/* 2nd Place */}
            <div className="text-center">
              <div className={`w-16 h-16 bg-gradient-to-r ${getGradientColor(1)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <span className="text-white text-lg font-bold">{getInitials(leaderboard[1].full_name)}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{leaderboard[1].full_name}</p>
              <p className="text-xs text-gray-500 mb-2">{leaderboard[1].total_marks} pts</p>
              <div className="w-12 h-16 bg-gray-400 rounded-t-lg mx-auto flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="text-2xl mt-1">🥈</div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className={`w-20 h-20 bg-gradient-to-r ${getGradientColor(0)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <span className="text-white text-xl font-bold">{getInitials(leaderboard[0].full_name)}</span>
              </div>
              <p className="text-base font-semibold text-gray-900 mb-1">{leaderboard[0].full_name}</p>
              <p className="text-sm text-gray-500 mb-2">{leaderboard[0].total_marks} pts</p>
              <div className="w-16 h-20 bg-yellow-400 rounded-t-lg mx-auto flex items-center justify-center">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div className="text-3xl mt-1">🥇</div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className={`w-16 h-16 bg-gradient-to-r ${getGradientColor(2)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <span className="text-white text-lg font-bold">{getInitials(leaderboard[2].full_name)}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{leaderboard[2].full_name}</p>
              <p className="text-xs text-gray-500 mb-2">{leaderboard[2].total_marks} pts</p>
              <div className="w-12 h-12 bg-orange-400 rounded-t-lg mx-auto flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="text-2xl mt-1">🥉</div>
            </div>
          </div>
        </div>
      )}

      {/* Full Rankings List */}
      <div className="p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">All Rankings</h4>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div key={entry.student_id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(entry.rank)}`}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <div className={`w-12 h-12 bg-gradient-to-r ${getGradientColor(index)} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm font-medium">{getInitials(entry.full_name)}</span>
              </div>

              {/* Student Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900">{entry.full_name}</p>
                  {entry.rank <= 3 && (
                    <span className="text-lg">{getRankEmoji(entry.rank)}</span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <span>{entry.student_id}</span>
                  {entry.total_check_ins > 0 && (
                    <span>• {entry.total_check_ins} check-ins</span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{entry.total_marks}</div>
                <div className="text-xs text-gray-500">points</div>
                {entry.points_breakdown && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-600">
                      Breakdown
                    </summary>
                    <div className="mt-1 space-y-1 bg-white p-2 rounded border shadow-sm">
                      {entry.points_breakdown.check_in_points > 0 && (
                        <div className="flex justify-between">
                          <span>Check-ins:</span>
                          <span className="text-green-600">+{entry.points_breakdown.check_in_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.review_points > 0 && (
                        <div className="flex justify-between">
                          <span>Reviews:</span>
                          <span className="text-green-600">+{entry.points_breakdown.review_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.midterm_project_points > 0 && (
                        <div className="flex justify-between">
                          <span>{isFallSemester ? 'Project 1:' : 'Midterm Projects:'}</span>
                          <span className="text-blue-600">+{entry.points_breakdown.midterm_project_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.final_project_points > 0 && (
                        <div className="flex justify-between">
                          <span>{isFallSemester ? 'Project 2:' : 'Final Projects:'}</span>
                          <span className="text-blue-600">+{entry.points_breakdown.final_project_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.project_notes_points > 0 && (
                        <div className="flex justify-between">
                          <span>{isFallSemester ? 'Project 3:' : 'Project Notes:'}</span>
                          <span className={isFallSemester ? "text-green-600" : "text-purple-600"}>+{entry.points_breakdown.project_notes_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.voting_points > 0 && (
                        <div className="flex justify-between">
                          <span>Votes Cast:</span>
                          <span className="text-orange-600">+{entry.points_breakdown.voting_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.quiz_points > 0 && (
                        <div className="flex justify-between">
                          <span>Quiz Points:</span>
                          <span className="text-indigo-600">+{entry.points_breakdown.quiz_points}</span>
                        </div>
                      )}
                      {entry.points_breakdown.bonus_points > 0 && (
                        <div className="flex justify-between">
                          <span>🏆 Vote Winner Bonus:</span>
                          <span className="text-yellow-600 font-bold">+{entry.points_breakdown.bonus_points}</span>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 