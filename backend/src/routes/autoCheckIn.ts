import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * POST /api/auto/check-in
 * Auto-registration check-in - creates student on first use
 * Headers:
 * - x-semester-code: Code of specific semester e.g. 'fall_2025' (optional)
 */
router.post('/auto/check-in', async (req: Request, res: Response) => {
  try {
    const { student_id, full_name } = req.body;
    
    // Get semester from header
    const semester_code = req.headers['x-semester-code'] as string;
    
    if (!student_id || typeof student_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_STUDENT_ID',
        message: 'student_id is required'
      });
    }

    // Look up student in simplified students table
    let { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, student_id, full_name')
      .eq('student_id', student_id)
      .single();

    // If student doesn't exist, prevent new signups
    if (studentError || !student) {
      console.log(`❌ Unknown student attempted check-in: ${student_id}`);
      return res.status(403).json({
        success: false,
        error: 'STUDENT_NOT_REGISTERED',
        message: `Student ID '${student_id}' is not registered. Please contact your instructor.`
      });
    }

    // Get semester ID for assignment
    let semesterId: string | null = null;
    
    if (semester_code) {
      // Look up semester by code
      const { data: semesterData, error: semesterError } = await supabaseAdmin
        .from('semesters')
        .select('id')
        .eq('code', semester_code)
        .eq('is_active', true)
        .single();
      
      if (!semesterError && semesterData) {
        semesterId = semesterData.id;
      }
    } else {
      // Get current semester
      const { data: currentSemesterData, error: currentSemesterError } = await supabaseAdmin
        .from('semesters')
        .select('id')
        .eq('is_current', true)
        .eq('is_active', true)
        .single();
      
      if (!currentSemesterError && currentSemesterData) {
        semesterId = currentSemesterData.id;
      }
    }

    // Create check-in record with semester assignment
    const insertData: any = {
      student_id: student.student_id,
      student_uuid: student.id,
      created_at: new Date().toISOString()
    };
    
    if (semesterId) {
      insertData.semester_id = semesterId;
    }
    
    const { data: checkIn, error: checkInError } = await supabaseAdmin
      .from('student_check_ins')
      .insert(insertData)
      .select('id, student_id, created_at')
      .single();

    if (checkInError || !checkIn) {
      console.error('Failed to create check-in:', checkInError);
      return res.status(500).json({
        success: false,
        error: 'CHECK_IN_FAILED',
        message: 'Failed to create check-in record'
      });
    }

    console.log(`✅ Check-in recorded: ${student.student_id} (ID: ${checkIn.id})`);

    res.status(201).json({
      success: true,
      data: {
        check_in_id: checkIn.id,
        student_id: student.student_id,
        student_name: student.full_name,
        checked_in_at: checkIn.created_at
      },
      message: `Check-in recorded for ${student.full_name || student.student_id}`
    });

  } catch (error) {
    console.error('Auto check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto/check-ins/:student_id
 * Get check-in history for a student
 * Headers:
 * - x-semester-code: Code of specific semester e.g. 'fall_2025' (optional)
 * Query parameters:
 * - limit: Number of entries to return (default 10)
 * - offset: Number of entries to skip (default 0)
 */
router.get('/auto/check-ins/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Get semester from header
    const semester_code = req.headers['x-semester-code'] as string;
    
    // Look up student
    const { data: student, error: studentError } = await supabaseAdmin
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

    // Get semester ID if filtering by semester
    let targetSemesterId: string | null = null;
    
    if (semester_code) {
      if (semester_code.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        targetSemesterId = semester_code;
      } else {
        const { data: semesterData } = await supabaseAdmin
          .from('semesters')
          .select('id')
          .eq('code', semester_code)
          .eq('is_active', true)
          .single();
        
        if (semesterData) {
          targetSemesterId = semesterData.id;
        }
      }
    }

    // Build check-ins query with optional semester filter
    let checkInsQuery = supabaseAdmin
      .from('student_check_ins')
      .select('id, created_at')
      .eq('student_id', student_id);
    
    if (targetSemesterId) {
      checkInsQuery = checkInsQuery.eq('semester_id', targetSemesterId);
    }
    
    const { data: checkIns, error: checkInError } = await checkInsQuery
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (checkInError) {
      return res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch check-ins'
      });
    }

    // Build count query with optional semester filter
    let countQuery = supabaseAdmin
      .from('student_check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student_id);
    
    if (targetSemesterId) {
      countQuery = countQuery.eq('semester_id', targetSemesterId);
    }
    
    const { count, error: countError } = await countQuery;

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          uuid: student.id
        },
        check_ins: checkIns || [],
        total_check_ins: count || 0,
        showing: {
          limit: Number(limit),
          offset: Number(offset)
        }
      }
    });

  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto/students/:student_id
 * Get individual student information for authentication
 */
router.get('/auto/students/:student_id', async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params;
    
    // Look up student
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, student_id, full_name, created_at, is_admin')
      .eq('student_id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(403).json({
        success: false,
        error: 'STUDENT_NOT_REGISTERED',
        message: `Student ID '${student_id}' is not registered. Please contact your instructor.`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          full_name: student.full_name,
          uuid: student.id,
          created_at: student.created_at,
          is_admin: student.is_admin || false
        }
      }
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/auto/students
 * Get all students (for admin purposes)
 */
router.get('/auto/students', async (req: Request, res: Response) => {
  try {
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('id, student_id, full_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch students'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        students: students || [],
        total: students?.length || 0
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }
});

export { router as autoCheckInRouter };