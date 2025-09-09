import React, { useState, useEffect } from 'react';
import { getSemesters, getCurrentSemester } from '../lib/api';

export interface Semester {
  id: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
}

interface SemesterSelectorProps {
  selectedSemester: string | null; // semester code
  onSemesterChange: (semesterCode: string) => void;
  className?: string;
  showLabel?: boolean;
}

const SemesterSelector: React.FC<SemesterSelectorProps> = ({
  selectedSemester,
  onSemesterChange,
  className = '',
  showLabel = true
}) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all semesters
        const semestersResponse = await getSemesters();
        setSemesters(semestersResponse.data.semesters);

        // If no semester is selected, default to current semester
        if (!selectedSemester && semestersResponse.data.semesters.length > 0) {
          try {
            const currentSemesterResponse = await getCurrentSemester();
            if (currentSemesterResponse.data.semester) {
              onSemesterChange(currentSemesterResponse.data.semester.code);
            } else {
              // Fallback to first semester
              onSemesterChange(semestersResponse.data.semesters[0].code);
            }
          } catch {
            // If current semester fetch fails, use first available
            onSemesterChange(semestersResponse.data.semesters[0].code);
          }
        }
      } catch (err: any) {
        console.error('Error loading semesters:', err);
        setError(err.message || 'Failed to load semesters');
      } finally {
        setLoading(false);
      }
    };

    loadSemesters();
  }, [selectedSemester, onSemesterChange]);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium text-gray-700">Semester:</span>}
        <div className="w-32 h-8 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium text-gray-700">Semester:</span>}
        <div className="text-sm text-red-600">Error loading semesters</div>
      </div>
    );
  }

  if (semesters.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-sm font-medium text-gray-700">Semester:</span>}
        <div className="text-sm text-gray-500">No semesters available</div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && (
        <label htmlFor="semester-select" className="text-sm font-medium text-gray-700">
          Semester:
        </label>
      )}
      <select
        id="semester-select"
        value={selectedSemester || ''}
        onChange={(e) => onSemesterChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[150px]"
      >
        {semesters.map((semester) => (
          <option key={semester.id} value={semester.code}>
            {semester.name} {semester.is_current && '(Current)'}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SemesterSelector;