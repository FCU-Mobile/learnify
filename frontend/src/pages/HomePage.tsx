import WelcomeSection from '../components/WelcomeSection';
import QuickStats from '../components/QuickStats';
import CurrentLessons from '../components/CurrentLessons';
import RecentActivity from '../components/RecentActivity';
import Leaderboard from '../components/Leaderboard';
import { useSemester } from '../contexts/SemesterContext';

const HomePage: React.FC = () => {
  const { selectedSemester } = useSemester();
  const isFallSemester = selectedSemester === 'fall_2025';
  
  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 font-sans min-h-screen">
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <WelcomeSection selectedSemester={selectedSemester} />
          
          {!isFallSemester && <QuickStats />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <CurrentLessons />
              <RecentActivity />
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <Leaderboard semesterCode={selectedSemester} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;