import { Request, Response, Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Debug endpoint to check quiz attempts for a specific student
router.get('/debug/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;

    // Get all quiz attempts for this student
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      return res.status(500).json({ error: attemptsError });
    }

    // Get active semesters
    const { data: semesters, error: semestersError } = await supabase
      .from('semesters')
      .select('*')
      .order('created_at', { ascending: false });

    if (semestersError) {
      return res.status(500).json({ error: semestersError });
    }

    // Get points breakdown from database function
    const { data: pointsData, error: pointsError } = await supabase
      .rpc('get_student_points_breakdown', { p_student_id: student_id });

    res.json({
      student_id,
      quiz_attempts: attempts,
      total_attempts: attempts?.length || 0,
      semesters,
      points_breakdown: pointsData,
      points_error: pointsError
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface QuizQuestion {
  id: number;
  question_text: string;
  question_category: string;
  difficulty_level: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QuizAttemptRequest {
  student_id: string;
  full_name?: string;
  question_id: number;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  attempt_time_seconds?: number;
}

/**
 * GET /api/quiz/questions/random
 * Get smart quiz questions prioritizing incorrectly answered questions for learning
 */
router.get('/questions/random', async (req: Request, res: Response) => {
  try {
    const count = Math.min(parseInt(req.query.count as string) || 5, 20); // Max 20 questions per request
    const difficulty = req.query.difficulty ? parseInt(req.query.difficulty as string) : undefined;
    const studentId = req.query.student_id as string;
    const questionType = req.query.question_type as string; // 'random', 'wrong_only', or undefined (smart)

    // Build query for all active questions
    let query = supabase
      .from('quiz_questions')
      .select('*')
      .eq('is_active', true);

    if (difficulty && difficulty >= 1 && difficulty <= 3) {
      query = query.eq('difficulty_level', difficulty);
    }

    // Get all questions
    const { data: allQuestions, error } = await query;

    if (error) {
      console.error('Quiz questions error:', error);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch quiz questions'
      });
    }

    if (!allQuestions || allQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_QUESTIONS_FOUND',
        message: 'No active quiz questions found'
      });
    }

    let selectedQuestions: any[] = [];
    let priorityQuestions: any[] = [];

    // If student_id is provided, implement question selection based on type
    if (studentId) {
      // Get student's incorrect answers (questions they got wrong)
      const { data: incorrectAttempts, error: incorrectError } = await supabase
        .from('student_quiz_attempts')
        .select('question_id, is_correct, created_at')
        .eq('student_id', studentId)
        .eq('is_correct', false)
        .order('created_at', { ascending: false });

      // Get student's correct answers to avoid re-asking recently mastered questions
      const { data: correctAttempts, error: correctError } = await supabase
        .from('student_quiz_attempts')
        .select('question_id, is_correct, created_at')
        .eq('student_id', studentId)
        .eq('is_correct', true)
        .order('created_at', { ascending: false });

      if (incorrectError || correctError) {
        console.error('Student attempts error:', incorrectError || correctError);
        // Fall back to random selection if there's an error
      } else {
        // Create question priority lists
        const incorrectQuestionIds = new Set(incorrectAttempts?.map(a => a.question_id) || []);
        const recentlyCorrectIds = new Set(
          correctAttempts?.slice(0, 10).map(a => a.question_id) || [] // Last 10 correct answers
        );

        // Prioritize questions the student got wrong but haven't mastered recently
        priorityQuestions = allQuestions.filter(q => 
          incorrectQuestionIds.has(q.id) && !recentlyCorrectIds.has(q.id)
        );

        // Questions never attempted by this student
        const attemptedQuestionIds = new Set([
          ...(incorrectAttempts?.map(a => a.question_id) || []),
          ...(correctAttempts?.map(a => a.question_id) || [])
        ]);
        const newQuestions = allQuestions.filter(q => !attemptedQuestionIds.has(q.id));

        // Recently correct questions (lower priority for learning reinforcement)
        const recentlyCorrectQuestions = allQuestions.filter(q => recentlyCorrectIds.has(q.id));

        // Question selection based on type
        if (questionType === 'wrong_only') {
          // Only questions the student got wrong
          selectedQuestions = priorityQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
          
          // If not enough wrong questions, inform user
          if (selectedQuestions.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'NO_WRONG_QUESTIONS',
              message: 'No previously incorrect questions found. Try taking some quizzes first!'
            });
          }
        } else if (questionType === 'random') {
          // Pure random selection from all questions
          selectedQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, count);
        } else {
          // Smart selection algorithm (default):
          // 60% priority questions (previously incorrect)
          // 30% new questions (never attempted)
          // 10% recently correct (for reinforcement)
          const priorityCount = Math.ceil(count * 0.6);
          const newCount = Math.ceil(count * 0.3);
          const reinforcementCount = count - priorityCount - newCount;

          // Select questions with weighted randomization
          const shuffledPriority = priorityQuestions.sort(() => 0.5 - Math.random());
          const shuffledNew = newQuestions.sort(() => 0.5 - Math.random());
          const shuffledReinforcement = recentlyCorrectQuestions.sort(() => 0.5 - Math.random());

          selectedQuestions = [
            ...shuffledPriority.slice(0, priorityCount),
            ...shuffledNew.slice(0, newCount),
            ...shuffledReinforcement.slice(0, reinforcementCount)
          ];

          // Fill remaining slots with random questions if not enough in priority categories
          if (selectedQuestions.length < count) {
            const usedIds = new Set(selectedQuestions.map(q => q.id));
            const remainingQuestions = allQuestions.filter(q => !usedIds.has(q.id));
            const shuffledRemaining = remainingQuestions.sort(() => 0.5 - Math.random());
            selectedQuestions = [
              ...selectedQuestions,
              ...shuffledRemaining.slice(0, count - selectedQuestions.length)
            ];
          }

          // Final shuffle to avoid predictable ordering
          selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
        }
      }
    }

    // Fall back to random selection if no student_id or smart selection failed
    if (selectedQuestions.length === 0) {
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      selectedQuestions = shuffled.slice(0, count);
    }

    // Remove correct_answer and explanation from response for security
    const sanitizedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_category: q.question_category,
      difficulty_level: q.difficulty_level,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      // Don't include correct_answer or explanation in the response
    }));

    // Determine selection method for response
    let selectionMethod = 'random';
    if (studentId) {
      if (questionType === 'wrong_only') {
        selectionMethod = 'wrong_only';
      } else if (questionType === 'random') {
        selectionMethod = 'random';
      } else {
        selectionMethod = 'smart_learning';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        questions: sanitizedQuestions,
        total_available: allQuestions.length,
        selection_method: selectionMethod,
        question_type: questionType || 'smart',
        wrong_questions_count: studentId ? priorityQuestions?.length || 0 : 0
      }
    });

  } catch (error) {
    console.error('Random questions error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/quiz/submit-answer
 * Submit a quiz answer and get immediate feedback
 */
router.post('/submit-answer', async (req: Request, res: Response) => {
  try {
    const { 
      student_id, 
      full_name, 
      question_id, 
      selected_answer, 
      attempt_time_seconds 
    }: QuizAttemptRequest = req.body;

    if (!student_id || !question_id || !selected_answer) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'student_id, question_id, and selected_answer are required'
      });
    }

    if (!['A', 'B', 'C', 'D'].includes(selected_answer)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ANSWER',
        message: 'selected_answer must be A, B, C, or D'
      });
    }

    // Check if student exists (no auto-registration)
    const { data: existingStudent, error: studentCheckError } = await supabase
      .from('students')
      .select('id, student_id, full_name')
      .eq('student_id', student_id)
      .single();

    if (studentCheckError && studentCheckError.code === 'PGRST116') {
      // Student doesn't exist - prevent new signups
      return res.status(403).json({
        success: false,
        error: 'STUDENT_NOT_REGISTERED',
        message: `Student ID '${student_id}' is not registered. Please contact your instructor.`
      });
    } else if (studentCheckError) {
      console.error('Student lookup error:', studentCheckError);
      return res.status(500).json({
        success: false,
        error: 'STUDENT_LOOKUP_FAILED',
        message: 'Failed to lookup student'
      });
    }

    const studentUuid = existingStudent.id;

    // Get the question to check the correct answer
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer, explanation')
      .eq('id', question_id)
      .eq('is_active', true)
      .single();

    if (questionError || !question) {
      return res.status(404).json({
        success: false,
        error: 'QUESTION_NOT_FOUND',
        message: 'Quiz question not found or inactive'
      });
    }

    // Check if answer is correct and calculate points
    const isCorrect = selected_answer === question.correct_answer;

    // Award points only on the first correct attempt for this question
    let alreadyMastered = false;
    if (isCorrect) {
      const { data: priorCorrect, error: priorCorrectError } = await supabase
        .from('student_quiz_attempts')
        .select('id')
        .eq('student_id', student_id)
        .eq('question_id', question_id)
        .eq('is_correct', true)
        .limit(1);

      if (!priorCorrectError && priorCorrect && priorCorrect.length > 0) {
        alreadyMastered = true;
      }
    }

    const pointsEarned = isCorrect && !alreadyMastered ? 5 : 0; // 5 points only for first correct

    // Record the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('student_quiz_attempts')
      .insert({
        student_id,
        student_uuid: studentUuid,
        question_id,
        selected_answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        attempt_time_seconds
      })
      .select('*')
      .single();

    if (attemptError || !attempt) {
      console.error('Attempt recording error:', attemptError);
      return res.status(500).json({
        success: false,
        error: 'ATTEMPT_RECORDING_FAILED',
        message: 'Failed to record quiz attempt'
      });
    }

    // The trigger function will automatically update student_quiz_scores

    res.status(201).json({
      success: true,
      data: {
        attempt,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        correct_answer: question.correct_answer,
        explanation: question.explanation
      },
      message: isCorrect 
        ? (pointsEarned > 0 
            ? `Correct! You earned ${pointsEarned} points.` 
            : 'Correct! No additional points awarded (already mastered).')
        : `Incorrect. The correct answer was ${question.correct_answer}.`
    });

  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/quiz/student/:student_id/scores
 * Get student's quiz scores and recent attempts
 */
router.get('/student/:student_id/scores', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id parameter is required'
      });
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, full_name')
      .eq('student_id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found`
      });
    }

    // Get quiz scores
    const { data: quizScores, error: scoresError } = await supabase
      .from('student_quiz_scores')
      .select('*')
      .eq('student_id', student_id)
      .single();

    // Get recent attempts
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attemptsError) {
      console.error('Recent attempts error:', attemptsError);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch recent attempts'
      });
    }

    // Get total attempts count
    const { count: totalAttempts, error: countError } = await supabase
      .from('student_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student_id);

    if (countError) {
      console.error('Attempts count error:', countError);
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          uuid: student.id
        },
        quiz_scores: quizScores || {
          student_id,
          student_uuid: student.id,
          total_questions_attempted: 0,
          total_correct_answers: 0,
          total_points: 0,
          accuracy_percentage: 0,
          last_quiz_date: null
        },
        recent_attempts: recentAttempts || [],
        total_attempts: totalAttempts || 0,
        showing: {
          limit,
          offset
        }
      }
    });

  } catch (error) {
    console.error('Student quiz scores error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/quiz/student/:student_id/attempts
 * Get student's quiz attempt history
 */
router.get('/student/:student_id/attempts', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id parameter is required'
      });
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, full_name')
      .eq('student_id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found`
      });
    }

    // Get attempts with question details
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select(`
        *,
        quiz_questions (
          question_text,
          question_category,
          difficulty_level,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation
        )
      `)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attemptsError) {
      console.error('Quiz attempts error:', attemptsError);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch quiz attempts'
      });
    }

    // Get total attempts count
    const { count: totalAttempts, error: countError } = await supabase
      .from('student_quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student_id);

    if (countError) {
      console.error('Attempts count error:', countError);
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          uuid: student.id
        },
        attempts: attempts || [],
        total_attempts: totalAttempts || 0,
        showing: {
          limit,
          offset
        }
      }
    });

  } catch (error) {
    console.error('Student quiz attempts error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/quiz/questions/all/:student_id
 * Get all questions with student's attempt results
 */
router.get('/questions/all/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id parameter is required'
      });
    }

    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_id, full_name')
      .eq('student_id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found`
      });
    }

    // Get all active questions
    const { data: allQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('is_active', true)
      .order('difficulty_level')
      .order('id');

    if (questionsError) {
      console.error('Questions error:', questionsError);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch questions'
      });
    }

    // Get student's attempts for all questions
    const { data: attempts, error: attemptsError } = await supabase
      .from('student_quiz_attempts')
      .select('question_id, selected_answer, is_correct, points_earned, created_at')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Attempts error:', attemptsError);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch student attempts'
      });
    }

    // Group attempts by question_id
    const attemptsByQuestion = new Map();
    attempts?.forEach(attempt => {
      if (!attemptsByQuestion.has(attempt.question_id)) {
        attemptsByQuestion.set(attempt.question_id, []);
      }
      attemptsByQuestion.get(attempt.question_id).push(attempt);
    });

    // Combine questions with attempt data
    const questionsWithAttempts = allQuestions?.map(question => {
      const questionAttempts = attemptsByQuestion.get(question.id) || [];
      const latestAttempt = questionAttempts[0]; // Most recent attempt
      const totalAttempts = questionAttempts.length;
      const correctAttempts = questionAttempts.filter((a: any) => a.is_correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
      const totalPoints = questionAttempts.reduce((sum: number, a: any) => sum + a.points_earned, 0);

      return {
        id: question.id,
        question_text: question.question_text,
        question_category: question.question_category,
        difficulty_level: question.difficulty_level,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        attempt_summary: {
          total_attempts: totalAttempts,
          correct_attempts: correctAttempts,
          accuracy_percentage: accuracy,
          total_points: totalPoints,
          latest_attempt: latestAttempt ? {
            selected_answer: latestAttempt.selected_answer,
            is_correct: latestAttempt.is_correct,
            points_earned: latestAttempt.points_earned,
            created_at: latestAttempt.created_at
          } : null,
          status: totalAttempts === 0 ? 'never_attempted' : 
                  correctAttempts > 0 ? 'mastered' : 'needs_practice'
        }
      };
    });

    // Calculate overall statistics
    const totalQuestions = allQuestions?.length || 0;
    const attemptedQuestions = questionsWithAttempts?.filter(q => q.attempt_summary.total_attempts > 0).length || 0;
    const masteredQuestions = questionsWithAttempts?.filter(q => q.attempt_summary.correct_attempts > 0).length || 0;
    const neverAttempted = totalQuestions - attemptedQuestions;

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          uuid: student.id
        },
        questions: questionsWithAttempts,
        summary: {
          total_questions: totalQuestions,
          attempted_questions: attemptedQuestions,
          mastered_questions: masteredQuestions,
          never_attempted: neverAttempted,
          overall_accuracy: attemptedQuestions > 0 ? Math.round((masteredQuestions / attemptedQuestions) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('All questions error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/quiz/questions/stats
 * Get question statistics by difficulty level
 */
router.get('/questions/stats', async (req: Request, res: Response) => {
  try {
    // Get total count of active questions
    const { count: totalQuestions, error: totalError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (totalError) {
      console.error('Total questions count error:', totalError);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch question statistics'
      });
    }

    // Get count by difficulty level
    const difficultyStats = [];
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
      const { count, error } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('difficulty_level', difficulty);

      if (error) {
        console.error(`Difficulty ${difficulty} count error:`, error);
        return res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch question statistics'
        });
      }

      difficultyStats.push({
        difficulty_level: difficulty,
        difficulty_name: difficulty === 1 ? 'Beginner' : difficulty === 2 ? 'Intermediate' : 'Advanced',
        question_count: count || 0
      });
    }

    res.status(200).json({
      success: true,
      data: {
        total_questions: totalQuestions || 0,
        difficulty_breakdown: difficultyStats,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Question stats error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;