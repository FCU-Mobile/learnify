import React from 'react';
import { useSemester } from '../contexts/SemesterContext';

const SemesterSwitcher: React.FC = () => {
  const { currentSemester, selectedSemester, availableSemesters, switchSemester, loading } = useSemester();

  if (loading || availableSemesters.length === 0) {
    return null;
  }

  const sortedSemesters = availableSemesters
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  
  const selectedSemesterInfo = sortedSemesters.find(s => s.code === selectedSemester);
  const otherSemester = sortedSemesters.find(s => s.code !== selectedSemester);

  const handleSwitch = () => {
    if (otherSemester) {
      console.log('Switching from', selectedSemester, 'to', otherSemester.code);
      switchSemester(otherSemester.code);
    }
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors hover:bg-blue-200"
      title={otherSemester ? `Switch to ${otherSemester.name}` : 'No other semester available'}
      disabled={!otherSemester}
    >
      <i className="fas fa-calendar-alt text-xs"></i>
      <span>{selectedSemesterInfo?.name || 'Select Semester'}</span>
      {selectedSemester === currentSemester?.code && (
        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
      )}
      {otherSemester && (
        <i className="fas fa-exchange-alt text-xs"></i>
      )}
    </button>
  );
};

export default SemesterSwitcher;