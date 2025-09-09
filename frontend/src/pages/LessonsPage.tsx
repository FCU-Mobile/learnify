import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getAllLessons as getAllLessonsAPI, updateLessonProgress, updateLessonUrl, updateLessonTitle, updateLessonDate, getAdminStatus, reorderLessonPlanItems, type Lesson, type LessonPlanItem } from '../lib/api';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const LessonsPage: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'today'>('all');
  const [isTeacher, setIsTeacher] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [dateInputValue, setDateInputValue] = useState<string>('');
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<LessonPlanItem | null>(null);
  const [sourceLessonId, setSourceLessonId] = useState<string | null>(null);

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
        
        // Get all lessons from API with plans included (class-wide progress), filtered by semester
        const allLessons = await getAllLessonsAPI({ 
          include_plan: true,
          semester: selectedSemester || undefined
        });
        setLessons(allLessons);
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId, selectedSemester]);

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

  const filteredLessons = lessons.filter(lesson => {
    switch (filter) {
      case 'today':
        return isLessonToday(lesson.scheduled_date);
      case 'upcoming':
        return !isLessonPast(lesson.scheduled_date) && !isLessonToday(lesson.scheduled_date);
      case 'past':
        return isLessonPast(lesson.scheduled_date);
      default:
        return true;
    }
  }).sort((a, b) => {
    // Primary sort by date
    const dateA = new Date(a.scheduled_date);
    const dateB = new Date(b.scheduled_date);
    const dateComparison = dateA.getTime() - dateB.getTime();
    
    if (dateComparison !== 0) {
      return dateComparison;
    }
    
    // Secondary sort by title with natural numeric sorting
    // Extract lesson numbers for proper numeric comparison
    const extractLessonNumber = (name: string) => {
      const match = name.match(/Lesson (\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };
    
    const numberA = extractLessonNumber(a.name);
    const numberB = extractLessonNumber(b.name);
    
    if (numberA !== numberB) {
      return numberA - numberB;
    }
    
    // Fallback to alphabetical sorting if no lesson numbers found
    return a.name.localeCompare(b.name);
  });

  const getLessonStatus = (lesson: Lesson) => {
    if (lesson.status === 'skipped') return { text: 'Skipped', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    if (lesson.status === 'cancelled') return { text: 'Cancelled', color: 'text-red-600 bg-red-50 border-red-200' };
    if (isLessonToday(lesson.scheduled_date)) return { text: 'Today', color: 'text-green-600 bg-green-50 border-green-200' };
    if (isLessonPast(lesson.scheduled_date)) return { text: 'Past', color: 'text-gray-500 bg-gray-50 border-gray-200' };
    return { text: 'Upcoming', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCheckboxChange = async (lessonId: string, itemId: string, completed: boolean) => {
    if (!isTeacher || !studentId) return;

    try {
      setUpdatingProgress(itemId);
      await updateLessonProgress(lessonId, studentId, itemId, completed);
      
      // Update local state
      setLessons(prev => prev.map(lesson => {
        if (lesson.id === lessonId) {
          return {
            ...lesson,
            plan: lesson.plan?.map(item => 
              item.id === itemId ? { ...item, completed } : item
            )
          };
        }
        return lesson;
      }));
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setUpdatingProgress(null);
    }
  };

  const handleUrlEdit = (lessonId: string, currentUrl?: string) => {
    setEditingUrl(lessonId);
    setUrlInputValue(currentUrl || '');
  };

  const handleUrlSave = async (lessonId: string) => {
    if (!isTeacher || !studentId) return;

    try {
      const updatedLesson = await updateLessonUrl(lessonId, studentId, urlInputValue);
      
      // Update local state
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
      
      setEditingUrl(null);
      setUrlInputValue('');
    } catch (error) {
      console.error('Error updating URL:', error);
      alert('Failed to update URL. Please try again.');
    }
  };

  const handleUrlCancel = () => {
    setEditingUrl(null);
    setUrlInputValue('');
  };

  const handleTitleEdit = (lessonId: string, currentTitle: string) => {
    setEditingTitle(lessonId);
    setTitleInputValue(currentTitle);
  };

  const handleTitleSave = async (lessonId: string) => {
    if (!isTeacher || !studentId || !titleInputValue.trim()) return;

    try {
      const updatedLesson = await updateLessonTitle(lessonId, studentId, titleInputValue.trim());
      
      // Update local state
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
      
      setEditingTitle(null);
      setTitleInputValue('');
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Failed to update lesson title. Please try again.');
    }
  };

  const handleTitleCancel = () => {
    setEditingTitle(null);
    setTitleInputValue('');
  };

  const handleDateEdit = (lessonId: string, currentDate: string) => {
    setEditingDate(lessonId);
    setDateInputValue(currentDate);
  };

  const handleDateSave = async (lessonId: string) => {
    if (!isTeacher || !studentId || !dateInputValue.trim()) return;

    try {
      const updatedLesson = await updateLessonDate(lessonId, studentId, dateInputValue.trim());
      
      // Update local state
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
      
      setEditingDate(null);
      setDateInputValue('');
    } catch (error) {
      console.error('Error updating lesson date:', error);
      alert('Failed to update lesson date. Please try again.');
    }
  };

  const handleDateCancel = () => {
    setEditingDate(null);
    setDateInputValue('');
  };

  const toggleContentExpansion = (lessonId: string) => {
    setExpandedContent(expandedContent === lessonId ? null : lessonId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged item and source lesson across all lessons
    for (const lesson of lessons) {
      if (lesson.plan) {
        const item = lesson.plan.find(item => item && item.id === active.id);
        if (item) {
          setDraggedItem(item);
          setSourceLessonId(lesson.id);
          break;
        }
      }
    }
  };

  const handleDragOver = () => {
    // Visual feedback is handled by the useDroppable hook in LessonDropZone
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !isTeacher || !studentId || !sourceLessonId) {
      setActiveId(null);
      setDraggedItem(null);
      setSourceLessonId(null);
      return;
    }

    const overId = over.id as string;
    
    // Check if dropping on a lesson drop zone (cross-lesson move)
    if (overId.startsWith('lesson-drop-')) {
      const targetLessonId = overId.replace('lesson-drop-', '');
      
      if (targetLessonId !== sourceLessonId) {
        try {
          // Move item from source lesson to target lesson
          const sourceLesson = lessons.find(l => l.id === sourceLessonId);
          const targetLesson = lessons.find(l => l.id === targetLessonId);
          
          if (sourceLesson && targetLesson && draggedItem) {
            // Remove from source lesson
            const newSourcePlan = sourceLesson.plan?.filter(item => item.id !== active.id) || [];
            
            // Add to target lesson at the end
            const newTargetPlan = [...(targetLesson.plan || []), draggedItem];
            
            // Update local state
            setLessons(prev => prev.map(lesson => {
              if (lesson.id === sourceLessonId) {
                return { ...lesson, plan: newSourcePlan };
              } else if (lesson.id === targetLessonId) {
                return { ...lesson, plan: newTargetPlan };
              }
              return lesson;
            }));
            
            // TODO: Call API to move item between lessons
            // await moveItemBetweenLessons(sourceLessonId, targetLessonId, active.id as string);
          }
        } catch (error) {
          console.error('Error moving item between lessons:', error);
          alert('Failed to move item. Please try again.');
        }
      }
    } else if (active.id !== over.id && sourceLessonId) {
      // Reordering within the same lesson
      const sourceLesson = lessons.find(l => l.id === sourceLessonId);
      if (sourceLesson && sourceLesson.plan) {
        const sourceItems = [...sourceLesson.plan];
        const oldIndex = sourceItems.findIndex(item => item && item.id === active.id);
        const newIndex = sourceItems.findIndex(item => item && item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          try {
            // Update the order locally first for immediate feedback
            const newItems = [...sourceItems];
            const [movedItem] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, movedItem);

            setLessons(prev => prev.map(lesson => {
              if (lesson.id === sourceLessonId) {
                return { ...lesson, plan: newItems };
              }
              return lesson;
            }));

            // Call API to persist the change
            await reorderLessonPlanItems(
              sourceLessonId,
              studentId,
              active.id as string,
              newIndex
            );
          } catch (error) {
            console.error('Error reordering lesson plan items:', error);
            // Revert the local change on error
            setLessons(prev => prev.map(lesson => {
              if (lesson.id === sourceLessonId) {
                return { ...lesson, plan: sourceItems };
              }
              return lesson;
            }));
            alert('Failed to reorder lesson plan items. Please try again.');
          }
        }
      }
    }
    
    setActiveId(null);
    setDraggedItem(null);
    setSourceLessonId(null);
  };

  const filterCounts = {
    all: lessons.length,
    today: lessons.filter(lesson => isLessonToday(lesson.scheduled_date)).length,
    upcoming: lessons.filter(lesson => !isLessonPast(lesson.scheduled_date) && !isLessonToday(lesson.scheduled_date)).length,
    past: lessons.filter(lesson => isLessonPast(lesson.scheduled_date)).length
  };

  // Lesson Drop Zone Component
  const LessonDropZone = ({ lessonId, isVisible }: { lessonId: string; isVisible: boolean }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: `lesson-drop-${lessonId}`,
    });

    if (!isVisible) return null;

    return (
      <div
        ref={setNodeRef}
        className={`mt-2 p-4 border-2 border-dashed rounded-lg transition-all duration-200 ${
          isOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <div className="text-center text-sm text-gray-600">
          <i className="fas fa-plus-circle mr-2"></i>
          Drop item here to move to this lesson
        </div>
      </div>
    );
  };

  // Sortable Item Component
  const SortableItem = ({ item, lessonId, updatingProgress, isTeacher, onCheckboxChange }: {
    item: LessonPlanItem;
    lessonId: string;
    updatingProgress: string | null;
    isTeacher: boolean;
    onCheckboxChange: (lessonId: string, itemId: string, completed: boolean) => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center space-x-3 ${isDragging ? 'bg-gray-50' : ''}`}
      >
        {isTeacher && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title="Drag to reorder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2h2v20H7zM15 2h2v20h-2z"/>
            </svg>
          </div>
        )}
        <div className="relative">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={(e) => onCheckboxChange(lessonId, item.id, e.target.checked)}
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
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 font-sans min-h-screen">
        <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lessons</h1>
            <p className="text-gray-600">
              Complete course schedule from July 1 to August 31, 2025 • Mondays & Tuesdays
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {([
                  { key: 'all', label: 'All Lessons' },
                  { key: 'today', label: 'Today' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'past', label: 'Past' }
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      filter === key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                    {filterCounts[key] > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        filter === key
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {filterCounts[key]}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            {[1, 2].map((j) => (
                              <div key={j} className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-32"></div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {[1, 2].map((j) => (
                              <div key={j} className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-28"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLessons.length > 0 ? (
              <div className="grid gap-6">
                {filteredLessons.map((lesson) => {
                  const status = getLessonStatus(lesson);
                  const isSkipped = lesson.status === 'skipped';
                  return (
                    <div key={lesson.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden ${
                      isSkipped ? 'border-orange-200 opacity-75' : 'border-gray-200'
                    }`}>
                      <div className={`p-6 ${isSkipped ? 'bg-orange-50/30' : ''}`}>
                        <div className="flex items-start space-x-4">
                          <div className={`w-16 h-16 bg-gradient-to-r ${lesson.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <i className={`${lesson.icon} text-white text-xl`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {editingTitle === lesson.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={titleInputValue}
                                    onChange={(e) => setTitleInputValue(e.target.value)}
                                    className="flex-1 px-3 py-1 text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleTitleSave(lesson.id);
                                      } else if (e.key === 'Escape') {
                                        handleTitleCancel();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleTitleSave(lesson.id)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleTitleCancel}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <h3 className={`text-xl font-semibold ${isSkipped ? 'text-gray-600' : 'text-gray-900'}`}>
                                    {lesson.name}
                                  </h3>
                                  {isTeacher && !isSkipped && (
                                    <button
                                      onClick={() => handleTitleEdit(lesson.id, lesson.name)}
                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-2"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                  )}
                                </div>
                              )}
                              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${status.color}`}>
                                {status.text}
                              </span>
                            </div>
                            <p className={`mb-2 ${isSkipped ? 'text-gray-500' : 'text-gray-600'}`}>
                              {isSkipped ? 'This lesson was skipped and will not be covered.' : lesson.description}
                            </p>
                            <div className="flex items-center gap-2 mb-4">
                              {editingDate === lesson.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={dateInputValue}
                                    onChange={(e) => setDateInputValue(e.target.value)}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleDateSave(lesson.id);
                                      } else if (e.key === 'Escape') {
                                        handleDateCancel();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleDateSave(lesson.id)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleDateCancel}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-500">{formatLessonDate(lesson.scheduled_date)}</p>
                                  {isTeacher && !isSkipped && (
                                    <button
                                      onClick={() => handleDateEdit(lesson.id, lesson.scheduled_date)}
                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Lesson Content */}
                            {lesson.lesson_content && lesson.lesson_content.length > 0 && !isSkipped && (
                              <div className="mb-4">
                                <button
                                  onClick={() => toggleContentExpansion(lesson.id)}
                                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                  <i className={`fas fa-chevron-${expandedContent === lesson.id ? 'up' : 'down'} text-xs`}></i>
                                  Lesson Content
                                </button>
                                
                                {expandedContent === lesson.id && (
                                  <div className="mt-3 pl-4 border-l-2 border-gray-200">
                                    <ul className="space-y-2">
                                      {lesson.lesson_content.map((content, index) => (
                                        <li key={index} className="flex items-start space-x-2">
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                                          <span className="text-sm text-gray-600">{content}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {!isSkipped && (
                              <div className="flex items-center space-x-4 mb-4">
                                <span className="text-sm text-gray-500">
                                  {lesson.plan ? 
                                    `${lesson.plan.filter(item => item && item.completed).length}/${lesson.plan.filter(item => item).length} Complete` :
                                    '0/0 Complete'
                                  }
                                </span>
                                <div className="w-32 h-3 bg-gray-200 rounded-full">
                                  <div 
                                    className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: lesson.plan && lesson.plan.filter(item => item).length > 0 ? 
                                        `${Math.round((lesson.plan.filter(item => item && item.completed).length / lesson.plan.filter(item => item).length) * 100)}%` :
                                        '0%'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Lesson Plan */}
                            {lesson.plan && lesson.plan.length > 0 && !isSkipped && (
                              <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-gray-700">Lesson Plan</h4>
                                  {isTeacher && (
                                    <span className="text-xs text-gray-500">Drag to reorder</span>
                                  )}
                                </div>
                                <SortableContext
                                  items={lesson.plan.filter(item => item && item.id).map(item => item.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-3">
                                    {lesson.plan.filter(item => item && item.id).map((item) => (
                                      <SortableItem
                                        key={item.id}
                                        item={item}
                                        lessonId={lesson.id}
                                        updatingProgress={updatingProgress}
                                        isTeacher={isTeacher}
                                        onCheckboxChange={handleCheckboxChange}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                                <LessonDropZone 
                                  lessonId={lesson.id} 
                                  isVisible={activeId !== null && sourceLessonId !== lesson.id && isTeacher}
                                />
                              </div>
                            )}

                            {/* Further Reading */}
                            {!isSkipped && (
                              <div className="border-t border-gray-100 pt-4 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-medium text-gray-700">Further Reading</h4>
                                  {isTeacher && (
                                    <button
                                      onClick={() => handleUrlEdit(lesson.id, lesson.further_reading_url)}
                                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                      {lesson.further_reading_url ? 'Edit' : 'Add URL'}
                                    </button>
                                  )}
                                </div>
                                
                                {editingUrl === lesson.id ? (
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
                                        onClick={() => handleUrlSave(lesson.id)}
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
                                ) : lesson.further_reading_url ? (
                                  <a
                                    href={lesson.further_reading_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                  >
                                    <i className="fas fa-external-link-alt mr-2 text-xs"></i>
                                    {lesson.further_reading_url}
                                  </a>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No additional reading materials available</p>
                                )}
                              </div>
                            )}
                            
                            {/* Skipped lesson notice */}
                            {isSkipped && (
                              <div className="border-t border-gray-100 pt-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <div className="flex items-center">
                                    <i className="fas fa-info-circle text-orange-600 mr-2"></i>
                                    <span className="text-sm text-orange-800 font-medium">
                                      Lesson content not available (skipped)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar-alt text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons found</h3>
                <p className="text-gray-500">
                  {filter === 'today' && 'No lessons scheduled for today.'}
                  {filter === 'upcoming' && 'No upcoming lessons found.'}
                  {filter === 'past' && 'No past lessons found.'}
                  {filter === 'all' && 'No lessons are currently available.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
      <DragOverlay>
        {activeId && draggedItem ? (
          <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span className="text-sm text-gray-700">{draggedItem.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default LessonsPage;