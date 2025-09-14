import { Request, Response, Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

interface FallLeaderboardEntry {
  student_id: string;
  student_name: string;
  quiz_points: number;
  project1_rating: number;
  project2_rating: number;
  project3_rating: number;
  total_score: number;
  rank: number;
}

/**
 * GET /api/fall-leaderboard
 * Get Fall semester leaderboard based on quiz points and project ratings
 * Query parameters:
 * - limit: Number of entries to return (default 50, max 100)
 * - offset: Number of entries to skip (default 0)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    console.log(`🏆 [${new Date().toLocaleTimeString()}] GET /api/fall-leaderboard - limit: ${limit}, offset: ${offset}, user-agent: ${req.headers['user-agent']?.substring(0, 30) || 'unknown'}`);

    // Call the Fall leaderboard function
    const { data: leaderboardData, error } = await supabase
      .rpc('get_fall_semester_leaderboard');

    if (error) {
      console.error('Fall leaderboard function error:', error);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch Fall semester leaderboard'
      });
    }

    if (!leaderboardData) {
      return res.status(200).json({
        success: true,
        data: {
          leaderboard: [],
          total_students: 0,
          showing: {
            limit,
            offset,
            total_pages: 0,
            current_page: 1
          }
        }
      });
    }

    // Apply pagination
    const paginatedEntries = leaderboardData.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      data: {
        leaderboard: paginatedEntries,
        total_students: leaderboardData.length,
        showing: {
          limit,
          offset,
          total_pages: Math.ceil(leaderboardData.length / limit),
          current_page: Math.floor(offset / limit) + 1
        }
      }
    });

  } catch (error) {
    console.error('Fall leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/fall-leaderboard/student/:student_id
 * Get specific student's ranking and nearby competitors in Fall semester
 * Query parameters:
 * - context: Number of students above/below to include (default 5, max 20)
 */
router.get('/student/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const context = Math.min(parseInt(req.query.context as string) || 5, 20);

    if (!student_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id parameter is required'
      });
    }

    console.log(`🏆 [${new Date().toLocaleTimeString()}] GET /api/fall-leaderboard/student/${student_id} - context: ${context}`);

    // Get the full Fall leaderboard
    const { data: fullLeaderboard, error } = await supabase
      .rpc('get_fall_semester_leaderboard');

    if (error) {
      console.error('Fall leaderboard function error:', error);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch Fall semester leaderboard'
      });
    }

    if (!fullLeaderboard || fullLeaderboard.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found in Fall semester leaderboard`
      });
    }

    // Find the student
    const studentIndex = fullLeaderboard.findIndex((entry: FallLeaderboardEntry) => entry.student_id === student_id);

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'STUDENT_NOT_FOUND',
        message: `Student ${student_id} not found in Fall semester leaderboard`
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
    console.error('Fall leaderboard student error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;