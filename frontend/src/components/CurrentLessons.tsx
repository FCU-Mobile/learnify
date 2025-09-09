
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getCurrentLesson as getCurrentLessonAPI, updateLessonProgress, updateLessonUrl, updateLessonDate, getAdminStatus, type Lesson } from '../lib/api';

const CurrentLessons: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState<boolean>(false);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [editingDate, setEditingDate] = useState<boolean>(false);
  const [dateInputValue, setDateInputValue] = useState<string>('');
  const [expandedContent, setExpandedContent] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is teacher
        if (studentId) {
          try {
            await getAdminStatus(studentId);
            setIsTeacher(true);
          } catch (error) {
            setIsTeacher(false);
          }
        }
        
        // Get the current lesson from API for the selected semester
        const lesson = await getCurrentLessonAPI(selectedSemester || undefined);
        setCurrentLesson(lesson);
      } catch (error) {
        console.error('Error fetching current lesson:', error);
        setCurrentLesson(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId, selectedSemester]);

  const getProgressWidth = (progress: number) => {
    return `${Math.min(progress, 100)}%`;
  };

  const getActionText = (progress: number) => {
    if (progress === 0) return 'Start';
    if (progress === 100) return 'Complete';
    return 'Continue';
  };

  const formatLessonDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isLessonToday = (dateString: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lessonDate = new Date(dateString);
    lessonDate.setHours(0, 0, 0, 0);
    return lessonDate.getTime() === today.getTime();
  };

  const isLessonPast = (dateString: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lessonDate = new Date(dateString);
    lessonDate.setHours(0, 0, 0, 0);
    return lessonDate < today;
  };
  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.status === 'skipped') return { text: 'Skipped', color: 'text-orange-600 bg-orange-50' };
    if (lesson.status === 'cancelled') return { text: 'Cancelled', color: 'text-red-600 bg-red-50' };
    if (isLessonToday(lesson.scheduled_date)) return { text: 'Today', color: 'text-green-600 bg-green-50' };
    if (isLessonPast(lesson.scheduled_date)) return { text: 'Past', color: 'text-gray-500 bg-gray-50' };
    return { text: 'Upcoming', color: 'text-blue-600 bg-blue-50' };
  };

  const handleCheckboxChange = async (lessonId: string, itemId: string, completed: boolean) => {
    if (!isTeacher || !studentId) return;

    try {
      setUpdatingProgress(itemId);
      await updateLessonProgress(lessonId, studentId, itemId, completed);
      
      // Update local state
      setCurrentLesson(prev => {
        if (!prev || prev.id !== lessonId) return prev;
        return {
          ...prev,
          plan: prev.plan?.map(item => 
            item.id === itemId ? { ...item, completed } : item
          )
        };
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setUpdatingProgress(null);
    }
  };

  const handleUrlEdit = (currentUrl?: string) => {
    setEditingUrl(true);
    setUrlInputValue(currentUrl || '');
  };

  const handleUrlSave = async () => {
    if (!isTeacher || !studentId || !currentLesson) return;

    try {
      const updatedLesson = await updateLessonUrl(currentLesson.id, studentId, urlInputValue);
      setCurrentLesson(updatedLesson);
      setEditingUrl(false);
      setUrlInputValue('');
    } catch (error) {
      console.error('Error updating URL:', error);
      alert('Failed to update URL. Please try again.');
    }
  };

  const handleUrlCancel = () => {
    setEditingUrl(false);
    setUrlInputValue('');
  };

  const handleDateEdit = (currentDate?: string) => {
    setEditingDate(true);
    setDateInputValue(currentDate || '');
  };

  const handleDateSave = async () => {
    if (!isTeacher || !studentId || !currentLesson || !dateInputValue.trim()) return;

    try {
      const updatedLesson = await updateLessonDate(currentLesson.id, studentId, dateInputValue.trim());
      setCurrentLesson(updatedLesson);
      setEditingDate(false);
      setDateInputValue('');
    } catch (error) {
      console.error('Error updating date:', error);
      alert('Failed to update date. Please try again.');
    }
  };

  const handleDateCancel = () => {
    setEditingDate(false);
    setDateInputValue('');
  };

  const toggleContentExpansion = () => {
    setExpandedContent(!expandedContent);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Current Lesson</h3>
          <a href="/lessons" className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</a>
        </div>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded mb-3 w-full"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ) : currentLesson ? (
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <div className="flex items-start space-x-4 p-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${currentLesson.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <i className={`${currentLesson.icon} text-white`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">{currentLesson.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLessonStatus(currentLesson).color}`}>
                    {getLessonStatus(currentLesson).text}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{currentLesson.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  {editingDate ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateInputValue}
                        onChange={(e) => setDateInputValue(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDateSave();
                          } else if (e.key === 'Escape') {
                            handleDateCancel();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleDateSave}
                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleDateCancel}
                        className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">{formatLessonDate(currentLesson.scheduled_date)}</p>
                      {isTeacher && (
                        <button
                          onClick={() => handleDateEdit(currentLesson.scheduled_date)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Lesson Content */}
                {currentLesson.lesson_content && currentLesson.lesson_content.length > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={toggleContentExpansion}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <i className={`fas fa-chevron-${expandedContent ? 'up' : 'down'} text-xs`}></i>
                      Lesson Content
                    </button>
                    
                    {expandedContent && (
                      <div className="mt-2 pl-3 border-l-2 border-gray-200">
                        <ul className="space-y-1">
                          {currentLesson.lesson_content.map((content, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-xs text-gray-600">{content}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500">
                    {currentLesson.plan ? 
                      `${currentLesson.plan.filter(item => item.completed).length}/${currentLesson.plan.length} Complete` :
                      '0/0 Complete'
                    }
                  </span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: currentLesson.plan ? 
                          `${Math.round((currentLesson.plan.filter(item => item.completed).length / currentLesson.plan.length) * 100)}%` :
                          '0%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lesson Plan */}
            {currentLesson.plan && currentLesson.plan.length > 0 && (
              <div className="border-t border-gray-200 p-4 bg-white">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Lesson Plan</h5>
                <div className="space-y-2">
                  {currentLesson.plan.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => handleCheckboxChange(currentLesson.id, item.id, e.target.checked)}
                          disabled={!isTeacher || updatingProgress === item.id}
                          className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                            isTeacher ? 'cursor-pointer' : 'cursor-not-allowed'
                          }`}
                        />
                        {updatingProgress === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <span className={`text-sm ${
                        item.completed ? 'text-gray-500 line-through' : 'text-gray-700'
                      }`}>
                        {item.title}
                        {item.required && (
                          <span className="ml-1 text-xs text-red-500">*</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Further Reading */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-700">Further Reading</h5>
                {isTeacher && (
                  <button
                    onClick={() => handleUrlEdit(currentLesson.further_reading_url)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {currentLesson.further_reading_url ? 'Edit' : 'Add URL'}
                  </button>
                )}
              </div>
              
              {editingUrl ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUrlSave}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleUrlCancel}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : currentLesson.further_reading_url ? (
                <a
                  href={currentLesson.further_reading_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <i className="fas fa-external-link-alt mr-2 text-xs"></i>
                  {currentLesson.further_reading_url}
                </a>
              ) : (
                <p className="text-sm text-gray-500 italic">No additional reading materials available</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-graduation-cap text-gray-400 text-xl"></i>
            </div>
            <p className="text-gray-500 text-sm">No current lesson available</p>
            <p className="text-gray-400 text-xs mt-1">Check the lessons page for the full schedule!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentLessons; 