import { Request, Response, Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  total_marks: number;
  total_check_ins: number;
  latest_check_in: string | null;
  rank: number;
  points_breakdown?: {
    check_in_points: number;
    review_points: number;
    midterm_project_points: number;
    final_project_points: number;
    project_notes_points: number;
    voting_points: number;
    quiz_points: number;
    bonus_points: number;
  };
}

/**
 * Shared function to get leaderboard data
 */
async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  // Get all students
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('student_id, full_name, created_at')
    .order('created_at', { ascending: true });

  if (studentsError) {
    console.error('Database error:', studentsError);
    throw new Error('Failed to fetch students data');
  }

  if (!studentsData) {
    return [];
  }

  // Get points breakdown for each student using the database function
  const leaderboardEntries: Omit<LeaderboardEntry, 'rank'>[] = await Promise.all(
    studentsData.map(async (student) => {
      // Get points breakdown from database function
      const { data: pointsData, error: pointsError } = await supabase
        .rpc('get_student_points_breakdown', { p_student_id: student.student_id });

      if (pointsError || !pointsData || pointsData.length === 0) {
        console.error('Error getting points breakdown for student:', student.student_id, pointsError);
        // Fallback with zero points
        const fallbackBreakdown = {
          check_in_points: 0,
          review_points: 0,
          midterm_project_points: 0,
          final_project_points: 0,
          project_notes_points: 0,
          voting_points: 0,
          quiz_points: 0,
          bonus_points: 0
        };
        return {
          student_id: student.student_id,
          full_name: student.full_name,
          total_marks: 0,
          total_check_ins: 0,
          latest_check_in: null,
          points_breakdown: fallbackBreakdown
        };
      }

      const breakdown = pointsData[0];
      
      // Get check-ins data for latest check-in info
      const { data: checkInsData } = await supabase
        .from('student_check_ins')
        .select('created_at')
        .eq('student_id', student.student_id)
        .order('created_at', { ascending: false });

      const totalCheckIns = checkInsData?.length || 0;
      const latestCheckIn = checkInsData && checkInsData.length > 0 ? checkInsData[0].created_at : null;

      return {
        student_id: student.student_id,
        full_name: student.full_name,
        total_marks: breakdown.total_points,
        total_check_ins: totalCheckIns,
        latest_check_in: latestCheckIn,
        points_breakdown: {
          check_in_points: breakdown.check_in_points,
          review_points: breakdown.review_points,
          midterm_project_points: breakdown.midterm_project_points,
          final_project_points: breakdown.final_project_points,
          project_notes_points: breakdown.project_notes_points,
          voting_points: breakdown.voting_points,
          quiz_points: breakdown.quiz_points,
          bonus_points: breakdown.bonus_points
        }
      };
    })
  );

  // Sort by ranking criteria
  const sortedEntries = leaderboardEntries.sort((a, b) => {
    // Primary: Total marks (descending)
    if (a.total_marks !== b.total_marks) {
      return b.total_marks - a.total_marks;
    }
    
    // Tiebreaker 1: Number of check-ins (descending)
    if (a.total_check_ins !== b.total_check_ins) {
      return b.total_check_ins - a.total_check_ins;
    }
    
    // Tiebreaker 2: Most recent check-in (more recent first)
    if (a.latest_check_in && b.latest_check_in) {
      const dateA = new Date(a.latest_check_in);
      const dateB = new Date(b.latest_check_in);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
    } else if (a.latest_check_in && !b.latest_check_in) {
      return -1;
    } else if (!a.latest_check_in && b.latest_check_in) {
      return 1;
    }
    
    // Tiebreaker 3: Alphabetical by name
    return a.full_name.localeCompare(b.full_name);
  });

  // Add rank numbers
  const rankedEntries: LeaderboardEntry[] = sortedEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));

  return rankedEntries;
}

/**
 * GET /api/leaderboard
 * Get ranked leaderboard of all students based on their current marks
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    // Get query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    // Get leaderboard data using shared function
    const rankedEntries = await getLeaderboardData();

    // Apply pagination
    const paginatedEntries = rankedEntries.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      data: {
        leaderboard: paginatedEntries,
        total_students: rankedEntries.length,
        showing: {
          limit,
          offset,
          total_pages: Math.ceil(rankedEntries.length / limit),
          current_page: Math.floor(offset / limit) + 1
        }
      }
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/student/:student_id
 * Get specific student's ranking and nearby competitors
 */
router.get('/leaderboard/student/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const context = Math.min(parseInt(req.query.context as string) || 5, 20); // Students above/below

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id parameter is required'
      });
    }

    // Get the full leaderboard using the same logic as the main endpoint
    const fullLeaderboard = await getLeaderboardData();
    
    // Find the student
    const studentIndex = fullLeaderboard.findIndex(entry => entry.student_id === student_id);
    
    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found in leaderboard`
      });
    }

    const studentEntry = fullLeaderboard[studentIndex];
    
    // Get context around the student
    const startIndex = Math.max(0, studentIndex - context);
    const endIndex = Math.min(fullLeaderboard.length, studentIndex + context + 1);
    const contextEntries = fullLeaderboard.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        student: studentEntry,
        context: contextEntries,
        total_students: fullLeaderboard.length,
        student_index: studentIndex
      }
    });

  } catch (error) {
    console.error('Student leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/leaderboard/calculate-bonus/:projectType
 * Manually calculate and award bonus points for most voted project
 */
router.post('/calculate-bonus/:projectType', async (req: Request, res: Response) => {
  try {
    const { projectType } = req.params;

    if (!['midterm', 'final'].includes(projectType)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PROJECT_TYPE',
        message: 'Project type must be "midterm" or "final"'
      });
    }

    // Call the database function to award bonus
    const { data, error } = await supabase
      .rpc('award_vote_winner_bonus', { p_project_type: projectType });

    if (error) {
      console.error('Bonus calculation error:', error);
      return res.status(500).json({
        success: false,
        error: 'CALCULATION_ERROR',
        message: 'Failed to calculate bonus points'
      });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No bonus awarded for ${projectType} projects (no votes or bonus already awarded)`,
        data: null
      });
    }

    const bonusResult = data[0];
    
    res.status(200).json({
      success: true,
      message: `Bonus points awarded successfully for ${projectType} project`,
      data: {
        submission_id: bonusResult.submission_id,
        bonus_awarded: bonusResult.bonus_awarded,
        vote_count: bonusResult.vote_count,
        project_type: projectType
      }
    });

  } catch (error) {
    console.error('Bonus calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;