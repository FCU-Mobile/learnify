import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getCurrentSemester, getSemesters } from '../lib/api';
import type { Semester } from '../lib/api';

interface SemesterContextType {
  currentSemester: Semester | null;
  selectedSemester: string | null; // semester code
  availableSemesters: Semester[];
  switchSemester: (semesterCode: string) => void;
  loading: boolean;
  error: string | null;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

export const useSemester = () => {
  const context = useContext(SemesterContext);
  if (context === undefined) {
    throw new Error('useSemester must be used within a SemesterProvider');
  }
  return context;
};

interface SemesterProviderProps {
  children: ReactNode;
}

export const SemesterProvider: React.FC<SemesterProviderProps> = ({ children }) => {
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('selectedSemester');
    console.log('SemesterContext: Initializing with stored semester:', stored);
    return stored || null;
  });
  const [availableSemesters, setAvailableSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load semester data on mount
  useEffect(() => {
    const loadSemesterData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all available semesters
        const semestersResponse = await getSemesters();
        setAvailableSemesters(semestersResponse.data.semesters);

        // Validate that the stored selected semester is still available
        const storedSemester = localStorage.getItem('selectedSemester');
        const isStoredSemesterValid = storedSemester && 
          semestersResponse.data.semesters.some(s => s.code === storedSemester);

        // Get current semester
        try {
          const currentResponse = await getCurrentSemester();
          setCurrentSemester(currentResponse.data.semester);
          
          // Set selected semester: use stored if valid, otherwise use current
          if (!isStoredSemesterValid) {
            const currentCode = currentResponse.data.semester.code;
            setSelectedSemester(currentCode);
            localStorage.setItem('selectedSemester', currentCode);
          }
        } catch {
          // If no current semester, use the first available one
          if (semestersResponse.data.semesters.length > 0 && !isStoredSemesterValid) {
            const firstSemester = semestersResponse.data.semesters[0];
            setSelectedSemester(firstSemester.code);
            localStorage.setItem('selectedSemester', firstSemester.code);
          }
        }
      } catch (err: any) {
        console.error('Error loading semester data:', err);
        setError(err.message || 'Failed to load semester data');
      } finally {
        setLoading(false);
      }
    };

    loadSemesterData();
  }, []);

  const switchSemester = (semesterCode: string) => {
    console.log('SemesterContext: Switching semester to', semesterCode);
    // Save to localStorage before reloading
    localStorage.setItem('selectedSemester', semesterCode);
    setSelectedSemester(semesterCode);
    console.log('SemesterContext: localStorage updated, reloading page...');
    // Reload the current page to show data from the new semester
    window.location.reload();
  };

  const value: SemesterContextType = {
    currentSemester,
    selectedSemester,
    availableSemesters,
    switchSemester,
    loading,
    error,
  };

  return (
    <SemesterContext.Provider value={value}>
      {children}
    </SemesterContext.Provider>
  );
};

export default SemesterProvider;