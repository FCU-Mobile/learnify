import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { checkStudentExists, getStudent } from '../lib/api';

interface AuthContextType {
  studentId: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (studentId: string) => Promise<void>;
  logout: () => void;
  loginError: string | null;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check for stored student ID on app load and validate with backend
    const storedStudentId = localStorage.getItem('studentId');
    if (storedStudentId) {
      // Validate stored student ID with backend
      validateStoredStudentId(storedStudentId);
    }
  }, []);

  const validateStoredStudentId = async (storedId: string) => {
    try {
      const exists = await checkStudentExists(storedId);
      if (exists) {
        setStudentId(storedId);
        setIsAuthenticated(true);
        // Check if user is admin
        try {
          const student = await getStudent(storedId);
          setIsAdmin(student.is_admin || false);
        } catch {
          setIsAdmin(false);
        }
      } else {
        // Student no longer exists, clear storage
        localStorage.removeItem('studentId');
      }
    } catch (error) {
      // If validation fails, clear storage to be safe
      localStorage.removeItem('studentId');
    }
  };

  const login = async (studentId: string) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const trimmedStudentId = studentId.trim().toUpperCase();
      
      // Validate student ID exists in backend
      const exists = await checkStudentExists(trimmedStudentId);
      
      if (!exists) {
        throw new Error('Student ID not found. Please check your Student ID or contact your instructor.');
      }
      
      // Fetch student information from the backend
      const student = await getStudent(trimmedStudentId);
      const studentName = student.full_name;
      const adminStatus = student.is_admin || false;

      // If validation passes, set authentication
      setStudentId(trimmedStudentId);
      setIsAuthenticated(true);
      setIsAdmin(adminStatus);
      localStorage.setItem('studentId', trimmedStudentId);
      localStorage.setItem('studentName', studentName);
      setLoginError(null);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
      setIsAuthenticated(false);
      setStudentId(null);
      localStorage.removeItem('studentId');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    setStudentId(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setLoginError(null);
    localStorage.removeItem('studentId');
    localStorage.removeItem('studentName');
  };

  const value = {
    studentId,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    loginError,
    isLoggingIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};