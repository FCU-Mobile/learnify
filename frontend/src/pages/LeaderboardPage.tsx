import React from 'react';
import Leaderboard from '../components/Leaderboard';
import { useSemester } from '../contexts/SemesterContext';

const LeaderboardPage: React.FC = () => {
  const { selectedSemester } = useSemester();
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 font-sans min-h-screen">
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Leaderboard Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div>
                  <h2 className="text-3xl font-bold mb-2">🏆 Leaderboard</h2>
                  <p className="text-yellow-100 text-lg">See how you rank against your classmates and celebrate achievements</p>
                </div>
              </div>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
            </div>
          </div>

          {/* Full-width Leaderboard */}
          <Leaderboard semesterCode={selectedSemester} />
        </div>
      </main>
    </div>
  );
};

export default LeaderboardPage;