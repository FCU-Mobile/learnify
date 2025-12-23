import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext'; // NEW: Import semester context
import {
  getRandomQuizQuestions,
  submitQuizAnswer,
  getStudentQuizScores,
  getQuestionStats
} from '../lib/api';
import type { QuizQuestion, QuestionStats } from '../lib/api';

interface QuizAttempt {
  questionId: number;
  selectedAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  startTime: number;
  endTime?: number;
}

const QuizPage: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester, availableSemesters } = useSemester(); // NEW: Get semester context
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10 * 60); // 10 minutes in seconds
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>(undefined); // undefined = mixed
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('smart'); // 'smart', 'random', 'wrong_only'
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Helper function to get semester ID from selected semester code
  const getSemesterId = (): string | null => {
    if (!selectedSemester) return null;
    const semester = availableSemesters.find(s => s.code === selectedSemester);
    return semester?.id || null;
  };

  // Load student stats, question stats, and questions
  useEffect(() => {
    if (studentId && selectedSemester) { // NEW: Also require selectedSemester
      loadStudentStats();
      loadQuestions();
    }
    loadQuestionStats();
  }, [studentId, selectedSemester]); // NEW: Also reload when semester changes

  // Only reload questions when starting quiz (not when changing settings)
  const handleStartQuiz = () => {
    // Reload questions with current settings before starting
    loadQuestions().then(() => {
      startQuiz();
    });
  };

  // Timer effect
  useEffect(() => {
    if (quizStarted && !quizCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleQuizComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quizStarted, quizCompleted, timeRemaining]);

  const loadStudentStats = async () => {
    if (!studentId) return;
    
    try {
      const stats = await getStudentQuizScores(studentId);
      setStudentStats(stats);
    } catch (error) {
      console.error('Failed to load student stats:', error);
    }
  };

  const loadQuestionStats = async () => {
    try {
      const semesterId = getSemesterId();
      const stats = await getQuestionStats(semesterId || undefined); // NEW: Pass semester_id
      setQuestionStats(stats.difficulty_breakdown);
      setTotalQuestions(stats.total_questions);
    } catch (error) {
      console.error('Failed to load question stats:', error);
      // Fallback to actual database values if API fails
      setQuestionStats([
        { difficulty_level: 1, difficulty_name: 'Beginner', question_count: 5 },
        { difficulty_level: 2, difficulty_name: 'Intermediate', question_count: 10 },
        { difficulty_level: 3, difficulty_name: 'Advanced', question_count: 10 }
      ]);
      setTotalQuestions(25); // Updated fallback for Fall semester (25 questions)
    }
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const semesterId = getSemesterId();

      if (!semesterId) {
        setError('Semester not selected. Please select a semester first.');
        setIsLoading(false);
        return;
      }

      // Use smart learning algorithm by passing student_id and semester_id
      const questionsData = await getRandomQuizQuestions(
        5,
        selectedDifficulty,
        studentId || undefined,
        selectedQuestionType,
        semesterId // NEW: Pass semester_id
      );
      setQuestions(questionsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setError('Failed to load quiz questions. Please try again later.');
      setIsLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuestionStartTime(Date.now());
  };

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = async () => {
    if (!selectedAnswer || !studentId) return;

    setIsSubmitting(true);
    const currentQuestion = questions[currentQuestionIndex];
    const attemptTimeSeconds = Math.floor((Date.now() - questionStartTime) / 1000);
    const semesterId = getSemesterId();

    if (!semesterId) {
      setError('Semester not selected. Cannot submit answer.');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await submitQuizAnswer({
        student_id: studentId,
        question_id: currentQuestion.id,
        selected_answer: selectedAnswer,
        attempt_time_seconds: attemptTimeSeconds,
        semester_id: semesterId // NEW: Pass semester_id
      });

      const attempt: QuizAttempt = {
        questionId: currentQuestion.id,
        selectedAnswer,
        isCorrect: result.is_correct,
        pointsEarned: result.points_earned,
        correctAnswer: result.correct_answer,
        explanation: result.explanation,
        startTime: questionStartTime,
        endTime: Date.now()
      };

      setAttempts(prev => [...prev, attempt]);
      setTotalScore(prev => prev + result.points_earned);
      if (result.is_correct) {
        setTotalCorrect(prev => prev + 1);
      }

      // Move to next question or complete quiz
      if (currentQuestionIndex === questions.length - 1) {
        handleQuizComplete();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setQuestionStartTime(Date.now());
      }

    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuizComplete = () => {
    setQuizCompleted(true);
    setShowResults(true);
    // Reload student stats to get updated scores
    loadStudentStats();
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAttempts([]);
    setQuizStarted(false);
    setQuizCompleted(false);
    setTotalScore(0);
    setTotalCorrect(0);
    setTimeRemaining(10 * 60);
    setQuestionStartTime(0);
    setShowResults(false);
    setError(null);
    loadQuestions();
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getOptionLetter = (index: number): 'A' | 'B' | 'C' | 'D' => {
    return ['A', 'B', 'C', 'D'][index] as 'A' | 'B' | 'C' | 'D';
  };

  const getOptions = (question: QuizQuestion) => [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d
  ];

  if (isLoading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-lg text-gray-600">Loading quiz questions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quiz Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={resetQuiz}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-brain text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">SwiftUI Knowledge Quiz</h1>
              <p className="text-lg text-gray-600 mb-8">
                Test your SwiftUI knowledge with {questions.length} carefully crafted questions covering basics to advanced concepts.
              </p>

              {/* Student Stats */}
              {studentStats && (
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Quiz Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {studentStats.quiz_scores?.total_points || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {studentStats.quiz_scores?.total_correct_answers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Correct Answers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {studentStats.quiz_scores?.total_questions_attempted || 0}
                      </div>
                      <div className="text-sm text-gray-600">Questions Attempted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {studentStats.quiz_scores?.accuracy_percentage || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                  </div>
                  
                  {/* Questions Overview Button */}
                  <div className="text-center">
                    {(() => {
                      const questionsAttempted = studentStats.quiz_scores?.total_questions_attempted || 0;
                      const allQuestionsAttempted = questionsAttempted >= totalQuestions;
                      
                      return (
                        <>
                          <button
                            onClick={() => window.location.href = '/questions'}
                            disabled={!allQuestionsAttempted}
                            className={`inline-flex items-center px-6 py-3 font-medium rounded-lg transition-colors ${
                              allQuestionsAttempted
                                ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <i className="fas fa-list-ul mr-2"></i>
                            View All Questions & Results
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            {allQuestionsAttempted 
                              ? 'Review your performance on all quiz questions'
                              : `Attempt all ${totalQuestions} questions to unlock this feature (${questionsAttempted}/${totalQuestions} completed)`
                            }
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Difficulty Selection */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Choose Difficulty Level</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setSelectedDifficulty(undefined)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedDifficulty === undefined
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">Mixed</div>
                      <div className="text-sm text-gray-600">All levels</div>
                      <div className="text-xs text-gray-500 mt-1">{totalQuestions} questions</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty(1)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedDifficulty === 1
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-700">Beginner</div>
                      <div className="text-sm text-gray-600">Level 1</div>
                      <div className="text-xs text-gray-500 mt-1">{questionStats.find(s => s.difficulty_level === 1)?.question_count || 0} questions</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty(2)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedDifficulty === 2
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-700">Intermediate</div>
                      <div className="text-sm text-gray-600">Level 2</div>
                      <div className="text-xs text-gray-500 mt-1">{questionStats.find(s => s.difficulty_level === 2)?.question_count || 0} questions</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedDifficulty(3)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedDifficulty === 3
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-700">Advanced</div>
                      <div className="text-sm text-gray-600">Level 3</div>
                      <div className="text-xs text-gray-500 mt-1">{questionStats.find(s => s.difficulty_level === 3)?.question_count || 0} questions</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Question Type Selection */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Choose Question Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedQuestionType('smart')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedQuestionType === 'smart'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-700">Smart Learning</div>
                      <div className="text-sm text-gray-600">Adaptive algorithm</div>
                      <div className="text-xs text-gray-500 mt-1">60% wrong, 30% new, 10% review</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedQuestionType('random')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedQuestionType === 'random'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-700">Random</div>
                      <div className="text-sm text-gray-600">All questions</div>
                      <div className="text-xs text-gray-500 mt-1">Pure random selection</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedQuestionType('wrong_only')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedQuestionType === 'wrong_only'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-700">Practice Mistakes</div>
                      <div className="text-sm text-gray-600">Wrong answers only</div>
                      <div className="text-xs text-gray-500 mt-1">Focus on improvement</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quiz Info */}
              <div className="bg-blue-50 rounded-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-600">{questions.length} Questions</div>
                    <div className="text-sm text-gray-600">
                      {selectedDifficulty === undefined 
                        ? 'Mixed difficulty levels' 
                        : selectedDifficulty === 1 
                        ? 'Beginner level'
                        : selectedDifficulty === 2
                        ? 'Intermediate level'
                        : 'Advanced level'
                      } • {selectedQuestionType === 'smart' 
                        ? 'Smart learning' 
                        : selectedQuestionType === 'random'
                        ? 'Random questions'
                        : 'Practice mistakes'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-blue-600">10 Minutes</div>
                    <div className="text-sm text-gray-600">Time limit</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-blue-600">5 Points</div>
                    <div className="text-sm text-gray-600">Per correct answer</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const accuracy = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;
    
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-trophy text-green-600 text-2xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Completed!</h1>
              <p className="text-lg text-gray-600 mb-8">Great job! Here are your results:</p>

              {/* Score Display */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{accuracy}%</div>
                  <div className="text-gray-600">Accuracy Score</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{questions.length - totalCorrect}</div>
                    <div className="text-sm text-gray-600">Incorrect</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalScore}</div>
                    <div className="text-sm text-gray-600">Points Earned</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowResults(false)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Review Answers
                </button>
                {(() => {
                  const questionsAttempted = studentStats?.quiz_scores?.total_questions_attempted || 0;
                  const allQuestionsAttempted = questionsAttempted >= totalQuestions;
                  
                  return allQuestionsAttempted ? (
                    <a
                      href="/questions"
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium text-center block"
                    >
                      View All Questions
                    </a>
                  ) : (
                    <div className="text-center">
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed font-medium"
                      >
                        View All Questions
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Attempt all {totalQuestions} questions to unlock this feature ({questionsAttempted}/{totalQuestions} completed)
                      </p>
                    </div>
                  );
                })()}
                <button
                  onClick={resetQuiz}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Take Another Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show review mode
  if (quizCompleted && !showResults) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => setShowResults(true)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Results</span>
            </button>
          </div>

          {/* Review Summary Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Review</h1>
              <p className="text-gray-600 mb-4">Review all questions, your answers, and explanations</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalCorrect}</div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{questions.length - totalCorrect}</div>
                  <div className="text-sm text-gray-600">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round((totalCorrect / questions.length) * 100)}%</div>
                  <div className="text-sm text-gray-600">Accuracy</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((question, questionIndex) => {
              const attempt = attempts[questionIndex];
              const options = getOptions(question);

              return (
                <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      attempt?.isCorrect ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {attempt?.isCorrect ? (
                        <i className="fas fa-check text-green-600"></i>
                      ) : (
                        <i className="fas fa-times text-red-600"></i>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1">
                          Question {questionIndex + 1}: {question.question_text}
                        </h3>
                        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          question.difficulty_level === 1 
                            ? 'bg-green-100 text-green-800'
                            : question.difficulty_level === 2
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty_level === 1 ? 'Beginner' : 
                           question.difficulty_level === 2 ? 'Intermediate' : 'Advanced'}
                        </span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {options.map((option, optionIndex) => {
                          const optionLetter = getOptionLetter(optionIndex);
                          const isCorrect = optionLetter === attempt?.correctAnswer;
                          const isSelected = optionLetter === attempt?.selectedAnswer;
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? 'border-green-500 bg-green-50'
                                  : isSelected
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                    isCorrect
                                      ? 'bg-green-500 text-white'
                                      : isSelected
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {optionLetter}
                                </span>
                                <span className="text-gray-900">{option}</span>
                                {isCorrect && <i className="fas fa-check text-green-500 ml-auto"></i>}
                                {isSelected && !isCorrect && <i className="fas fa-times text-red-500 ml-auto"></i>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {attempt?.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-2">
                            <i className="fas fa-lightbulb text-blue-600 mt-1"></i>
                            <div>
                              <div className="font-medium text-blue-900 mb-1">Explanation</div>
                              <div className="text-blue-800">{attempt.explanation}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active quiz mode
  const currentQuestion = questions[currentQuestionIndex];
  const options = getOptions(currentQuestion);
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quiz Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">SwiftUI Quiz</h2>
                <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatTime(timeRemaining)}</div>
                <div className="text-sm text-gray-600">Time Remaining</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-900">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold">{currentQuestionIndex + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {currentQuestion.question_text}
                  </h3>
                  
                  {/* Difficulty Badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      currentQuestion.difficulty_level === 1 
                        ? 'bg-green-100 text-green-800'
                        : currentQuestion.difficulty_level === 2
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {currentQuestion.difficulty_level === 1 ? 'Beginner' : 
                       currentQuestion.difficulty_level === 2 ? 'Intermediate' : 'Advanced'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-4">
              {options.map((option, index) => {
                const optionLetter = getOptionLetter(index);
                const isSelected = selectedAnswer === optionLetter;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(optionLetter)}
                    className={`w-full text-left p-4 border-2 rounded-lg transition-all duration-200 hover:bg-gray-50 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {optionLetter}
                          </span>
                          <span className="text-gray-900 font-medium">{option}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedAnswer ? 'Answer selected' : 'Please select an answer'}
          </div>

          <button
            onClick={handleNextQuestion}
            disabled={!selectedAnswer || isSubmitting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !selectedAnswer || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </span>
            ) : currentQuestionIndex === questions.length - 1 ? (
              'Complete Quiz'
            ) : (
              'Next Question'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;