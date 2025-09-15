import { Router } from 'express';
import { supabase } from '../config/supabase';
import { requireAdmin, AdminRequest } from '../middleware/adminAuth';

const router = Router();

// Get all students with project submission status (admin only)
router.get('/students', requireAdmin, async (req, res) => {
  try {
    // Get all students with project submission counts
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        *,
        midterm_projects:submissions!submissions_student_id_fkey(count),
        final_projects:submissions!submissions_student_id_fkey(count)
      `)
      .eq('submissions.submission_type', 'project')
      .eq('submissions.project_type', 'midterm')
      .eq('submissions.project_type', 'final')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Complex query failed, trying simpler approach:', error);
      
      // Fallback: Get students and project counts separately
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentsError) {
        throw studentsError;
      }

      // Get project submission status for each student
      const studentsWithProjects = await Promise.all(
        studentsData.map(async (student) => {
          // Check for midterm project (Summer semester)
          const { data: midtermProjects } = await supabase
            .from('submissions')
            .select('id')
            .eq('student_id', student.student_id)
            .eq('submission_type', 'project')
            .eq('project_type', 'midterm');

          // Check for final project (Summer semester)
          const { data: finalProjects } = await supabase
            .from('submissions')
            .select('id')
            .eq('student_id', student.student_id)
            .eq('submission_type', 'project')
            .eq('project_type', 'final');

          // Check for Fall semester team-based projects
          // Get Fall 2025 semester ID
          const { data: fallSemester } = await supabase
            .from('semesters')
            .select('id')
            .eq('code', 'fall_2025')
            .single();

          let fallProjectStatus = {
            has_project1: false,
            has_project2: false,
            has_project3: false,
            project1_team_name: null,
            project2_team_name: null,
            project3_team_name: null
          };

          if (fallSemester) {
            // Check each Fall project (1, 2, 3)
            for (let projectNumber of [1, 2, 3]) {
              // Find if student is in a team that has submitted this project
              const { data: teamSubmission } = await supabase
                .from('project_ratings')
                .select(`
                  teacher_rating,
                  project_teams!inner (
                    team_name,
                    team_members!inner (
                      student_id
                    )
                  )
                `)
                .eq('project_number', projectNumber)
                .eq('semester_id', fallSemester.id)
                .eq('project_teams.team_members.student_id', student.student_id)
                .single();

              if (teamSubmission) {
                const teamName = teamSubmission.project_teams?.team_name;
                if (projectNumber === 1) {
                  fallProjectStatus.has_project1 = true;
                  fallProjectStatus.project1_team_name = teamName;
                } else if (projectNumber === 2) {
                  fallProjectStatus.has_project2 = true;
                  fallProjectStatus.project2_team_name = teamName;
                } else if (projectNumber === 3) {
                  fallProjectStatus.has_project3 = true;
                  fallProjectStatus.project3_team_name = teamName;
                }
              }
            }
          }

          return {
            ...student,
            has_midterm_project: (midtermProjects?.length || 0) > 0,
            has_final_project: (finalProjects?.length || 0) > 0,
            midterm_project_count: midtermProjects?.length || 0,
            final_project_count: finalProjects?.length || 0,
            // Fall semester team project status
            ...fallProjectStatus
          };
        })
      );

      return res.json({
        success: true,
        data: studentsWithProjects
      });
    }

    // Transform the complex query result
    const transformedStudents = students.map(student => ({
      ...student,
      has_midterm_project: (student.midterm_projects?.[0]?.count || 0) > 0,
      has_final_project: (student.final_projects?.[0]?.count || 0) > 0,
      midterm_project_count: student.midterm_projects?.[0]?.count || 0,
      final_project_count: student.final_projects?.[0]?.count || 0
    }));

    res.json({
      success: true,
      data: transformedStudents
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch students'
    });
  }
});

// Delete student (admin only)
router.delete('/students/:studentId', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const { studentId } = req.params;
    
    // Prevent admin from deleting themselves
    if (studentId === req.adminStudentId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own admin account'
      });
    }

    // Check if student exists
    const { data: existingStudent, error: selectError } = await supabase
      .from('students')
      .select('student_id, full_name, is_admin')
      .eq('student_id', studentId)
      .single();

    if (selectError || !existingStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Prevent deletion of other admins
    if (existingStudent.is_admin) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete admin accounts'
      });
    }

    // Delete related data first (check-ins, reviews)
    await supabase
      .from('student_check_ins')
      .delete()
      .eq('student_id', studentId);

    await supabase
      .from('student_reviews')
      .delete()
      .eq('student_id', studentId);

    // Delete the student
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('student_id', studentId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      message: `Student ${studentId} (${existingStudent.full_name}) has been deleted`,
      data: {
        deleted_student: existingStudent
      }
    });

  } catch (error: any) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete student'
    });
  }
});

// Get admin status
router.get('/status', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('student_id, full_name, is_admin')
      .eq('student_id', req.adminStudentId)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        admin: student,
        permissions: ['delete_students', 'view_all_students']
      }
    });
  } catch (error: any) {
    console.error('Error getting admin status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get admin status'
    });
  }
});

// Fix quiz scores - recalculate to award points only once per question
router.post('/fix-quiz-scores', requireAdmin, async (req: AdminRequest, res) => {
  try {
    console.log(`Admin ${req.adminStudentId} requested quiz score fix`);

    // Step 1: Get the total number of active questions to calculate max possible points
    const { count: totalQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (questionsError) {
      throw questionsError;
    }

    const maxPossiblePoints = (totalQuestions || 0) * 5;
    console.log(`Total active questions: ${totalQuestions}, Max possible points: ${maxPossiblePoints}`);

    // Step 2: Get all students who have quiz attempts
    const { data: allAttempts, error: studentsError } = await supabase
      .from('student_quiz_attempts')
      .select('student_id, student_uuid');

    if (studentsError) {
      throw studentsError;
    }

    // Get unique students
    const studentMap = new Map();
    allAttempts?.forEach(attempt => {
      if (!studentMap.has(attempt.student_id)) {
        studentMap.set(attempt.student_id, {
          student_id: attempt.student_id,
          student_uuid: attempt.student_uuid
        });
      }
    });
    const studentsWithAttempts = Array.from(studentMap.values());

    if (!studentsWithAttempts || studentsWithAttempts.length === 0) {
      return res.json({
        success: true,
        message: 'No quiz attempts found to fix',
        data: {
          students_processed: 0,
          total_points_corrected: 0
        }
      });
    }

    let totalStudentsProcessed = 0;
    let totalPointsCorrected = 0;
    const results: any[] = [];

    // Step 2: Process each student
    for (const student of studentsWithAttempts) {
      // Get all correct attempts for this student (only the first correct attempt per question)
      const { data: correctAttempts, error: attemptsError } = await supabase
        .from('student_quiz_attempts')
        .select('question_id, created_at, points_earned')
        .eq('student_id', student.student_id)
        .eq('is_correct', true)
        .order('question_id, created_at');

      if (attemptsError) {
        console.error(`Error fetching attempts for ${student.student_id}:`, attemptsError);
        continue;
      }

      if (!correctAttempts || correctAttempts.length === 0) {
        continue;
      }

      // Group by question_id and keep only the first (earliest) correct attempt
      const uniqueQuestions = new Map();
      for (const attempt of correctAttempts) {
        if (!uniqueQuestions.has(attempt.question_id)) {
          uniqueQuestions.set(attempt.question_id, attempt);
        }
      }

      // Calculate correct scores (5 points per unique question answered correctly)
      const uniqueCorrectAttempts = Array.from(uniqueQuestions.values());
      const correctTotalPoints = uniqueCorrectAttempts.length * 5;

      // Get all attempts for this student to calculate total attempts
      const { data: allAttempts, error: allAttemptsError } = await supabase
        .from('student_quiz_attempts')
        .select('question_id, is_correct, created_at')
        .eq('student_id', student.student_id)
        .order('created_at');

      if (allAttemptsError) {
        console.error(`Error fetching all attempts for ${student.student_id}:`, allAttemptsError);
        continue;
      }

      const totalAttempts = allAttempts?.length || 0;
      const totalCorrectAnswers = uniqueCorrectAttempts.length;

      // Get current score to compare
      const { data: currentScore } = await supabase
        .from('student_quiz_scores')
        .select('total_points, total_questions_attempted, total_correct_answers')
        .eq('student_id', student.student_id)
        .single();

      const oldPoints = currentScore?.total_points || 0;
      const pointsCorrection = correctTotalPoints - oldPoints;

      // Step 3: Fix individual attempt records - set points_earned to 0 for duplicate attempts
      // Keep only the first (earliest) correct attempt with points for each question
      for (const attempt of correctAttempts) {
        const isFirstAttempt = uniqueQuestions.get(attempt.question_id)?.created_at === attempt.created_at;
        const expectedPoints = isFirstAttempt ? 5 : 0;
        
        // Update this attempt if points are incorrect
        if (attempt.points_earned !== expectedPoints) {
          await supabase
            .from('student_quiz_attempts')
            .update({ points_earned: expectedPoints })
            .eq('student_id', student.student_id)
            .eq('question_id', attempt.question_id)
            .eq('created_at', attempt.created_at);
        }
      }

      // Update the score record
      const { error: updateError } = await supabase
        .from('student_quiz_scores')
        .update({
          total_questions_attempted: totalAttempts,
          total_correct_answers: totalCorrectAnswers,
          total_points: correctTotalPoints,
          last_quiz_date: allAttempts?.[allAttempts.length - 1]?.created_at,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', student.student_id);

      if (updateError) {
        console.error(`Error updating score for ${student.student_id}:`, updateError);
        continue;
      }

      totalStudentsProcessed++;
      totalPointsCorrected += Math.abs(pointsCorrection);

      results.push({
        student_id: student.student_id,
        old_points: oldPoints,
        new_points: correctTotalPoints,
        points_corrected: pointsCorrection,
        unique_questions_answered: totalCorrectAnswers,
        total_attempts: totalAttempts
      });

      console.log(`Fixed ${student.student_id}: ${oldPoints} → ${correctTotalPoints} points (${pointsCorrection >= 0 ? '+' : ''}${pointsCorrection})`);
    }

    res.json({
      success: true,
      message: `Quiz scores fixed for ${totalStudentsProcessed} students`,
      data: {
        students_processed: totalStudentsProcessed,
        total_points_corrected: totalPointsCorrected,
        quiz_system_info: {
          total_active_questions: totalQuestions,
          points_per_question: 5,
          max_possible_points: maxPossiblePoints
        },
        details: results
      }
    });

  } catch (error: any) {
    console.error('Error fixing quiz scores:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fix quiz scores'
    });
  }
});

export default router;