import React from 'react';
import FallLeaderboard from '../components/FallLeaderboard';

const FallLeaderboardPage: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 font-sans min-h-screen">
      <main className="pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Fall Leaderboard Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div>
                  <h2 className="text-3xl font-bold mb-2">🍂 Fall Semester Leaderboard</h2>
                  <p className="text-purple-100 text-lg">
                    Rankings based on quiz performance and project ratings
                  </p>
                  <div className="mt-4 text-sm text-purple-200">
                    <p>📊 Quiz Points (10%) + Project Ratings (30% each)</p>
                  </div>
                </div>
              </div>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
            </div>
          </div>

          {/* Full-width Fall Leaderboard */}
          <FallLeaderboard />
        </div>
      </main>
    </div>
  );
};

export default FallLeaderboardPage;