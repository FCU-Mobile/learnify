import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * GET /api/semesters
 * Get all semesters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: semesters, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching semesters:', error);
      return res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch semesters'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        semesters: semesters || []
      }
    });

  } catch (error) {
    console.error('Semesters error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/semesters/current
 * Get current semester
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { data: semester, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('is_current', true)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching current semester:', error);
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'No current semester found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        semester
      }
    });

  } catch (error) {
    console.error('Current semester error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/semesters/:code
 * Get semester by code
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const { data: semester, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !semester) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Semester with code '${code}' not found`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        semester
      }
    });

  } catch (error) {
    console.error('Get semester error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/semesters/:code/set-current
 * Set a semester as current (admin only)
 */
router.post('/:code/set-current', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { admin_student_id } = req.body;

    // Verify admin permissions (basic check - you might want to enhance this)
    if (!admin_student_id) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Admin student ID required'
      });
    }

    // Verify the semester exists
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, code, name')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (semesterError || !semester) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Semester with code '${code}' not found`
      });
    }

    // First, set all semesters to not current
    const { error: updateAllError } = await supabase
      .from('semesters')
      .update({ is_current: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (updateAllError) {
      console.error('Error clearing current semester flags:', updateAllError);
      return res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Failed to update semester flags'
      });
    }

    // Then set the specified semester as current
    const { error: setCurrentError } = await supabase
      .from('semesters')
      .update({ is_current: true })
      .eq('code', code);

    if (setCurrentError) {
      console.error('Error setting current semester:', setCurrentError);
      return res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Failed to set current semester'
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully set '${semester.name}' as the current semester`,
      data: {
        semester: {
          id: semester.id,
          code: semester.code,
          name: semester.name,
          is_current: true
        }
      }
    });

  } catch (error) {
    console.error('Set current semester error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/semesters/:code/config
 * Get scoring configuration for a semester
 */
router.get('/:code/config', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // First get the semester
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, code, name')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (semesterError || !semester) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Semester with code '${code}' not found`
      });
    }

    // Get the scoring configuration
    const { data: config, error: configError } = await supabase
      .from('semester_scoring_config')
      .select('*')
      .eq('semester_id', semester.id)
      .single();

    if (configError) {
      console.error('Error fetching semester config:', configError);
      return res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch semester configuration'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        semester,
        config: config || null
      }
    });

  } catch (error) {
    console.error('Get semester config error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/semesters/:code/stats
 * Get statistics for a specific semester
 */
router.get('/:code/stats', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    // First get the semester
    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, code, name')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (semesterError || !semester) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Semester with code '${code}' not found`
      });
    }

    // Get stats for this semester
    const [
      { count: totalCheckIns },
      { count: totalSubmissions },
      { count: totalVotes },
      { count: totalNotes }
    ] = await Promise.all([
      supabase.from('student_check_ins').select('*', { count: 'exact', head: true }).eq('semester_id', semester.id),
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('semester_id', semester.id),
      supabase.from('project_votes').select('*', { count: 'exact', head: true }).eq('semester_id', semester.id),
      supabase.from('project_notes').select('*', { count: 'exact', head: true }).eq('semester_id', semester.id)
    ]);

    res.status(200).json({
      success: true,
      data: {
        semester,
        stats: {
          total_check_ins: totalCheckIns || 0,
          total_submissions: totalSubmissions || 0,
          total_votes: totalVotes || 0,
          total_notes: totalNotes || 0
        }
      }
    });

  } catch (error) {
    console.error('Get semester stats error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;