
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdminStatus } from '../lib/api';
import SemesterSwitcher from './SemesterSwitcher';

const Navigation: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { studentId, logout } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!studentId) return;
      
      try {
        await getAdminStatus(studentId);
        setIsAdmin(true);
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [studentId]);

  const isActive = (path: string) => {
    if (path === '/quiz') {
      // Show Quiz as active when on /quiz or /questions
      return location.pathname === path || location.pathname === '/questions';
    }
    if (path === '/projects') {
      // Show Projects as active when on /projects or /projects/:id
      return location.pathname === path || location.pathname.startsWith('/projects/');
    }
    return location.pathname === path;
  };

  const getInitials = (studentId: string): string => {
    return studentId.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-graduation-cap text-white text-sm"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Learnify</h1>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/lessons" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/lessons') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lessons
            </Link>
            <Link 
              to="/reviews" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/reviews') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews
            </Link>
            <Link 
              to="/projects" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/projects') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Projects
            </Link>
            <Link 
              to="/quiz" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/quiz') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quiz
            </Link>
            <Link 
              to="/feedback" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/feedback') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Feedback
            </Link>
            <Link 
              to="/leaderboard" 
              className={`font-medium pb-1 transition-colors ${
                isActive('/leaderboard') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Leaderboard
            </Link>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-4">
            {/* Semester Switcher */}
            <SemesterSwitcher />
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getInitials(studentId || '')}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{isAdmin ? 'Teacher' : 'Student'}</p>
                  <p className="text-xs text-gray-500">{studentId}</p>
                </div>
                <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        isActive('/admin') ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      <i className="fas fa-chalkboard-teacher mr-3 text-gray-400"></i>
                      Teacher Dashboard
                    </Link>
                  )}
                  <Link
                    to={`/profile/${studentId}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-user mr-3 text-gray-400"></i>
                    My Profile
                  </Link>
                  <hr className="my-2" />
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <i className="fas fa-sign-out-alt mr-3 text-red-400"></i>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navigation; 