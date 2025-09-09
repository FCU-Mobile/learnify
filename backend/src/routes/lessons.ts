import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// Interface for lesson data
interface Lesson {
  id: string;
  lesson_number: number;
  name: string;
  description: string;
  scheduled_date: string;
  status: 'normal' | 'skipped' | 'cancelled';
  topic_name: string;
  icon: string;
  color: string;
  button_color: string;
  further_reading_url?: string;
  lesson_content?: string[];
  created_at: string;
  updated_at: string;
}

interface LessonPlanItem {
  id: string;
  lesson_id: string;
  title: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

interface StudentProgress {
  lesson_plan_item_id: string;
  completed: boolean;
  completed_at?: string;
}

// GET /api/lessons - Get all lessons with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, include_plan } = req.query;
    const semester = req.headers['x-semester'] as string;
    
    // Build query
    let query = supabase
      .from('lessons')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('name', { ascending: true });
    
    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }
    
    // Filter by semester if provided
    if (semester && typeof semester === 'string') {
      // Get semester ID from code
      const { data: semesterData } = await supabase
        .from('semesters')
        .select('id')
        .eq('code', semester)
        .single();
      
      if (semesterData) {
        query = query.eq('semester_id', semesterData.id);
      }
    }
    
    const { data: lessons, error: lessonsError } = await query;
    
    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lessons',
        details: lessonsError.message 
      });
    }
    
    // If include_plan is requested, fetch lesson plan items with class progress for each lesson
    if (include_plan === 'true' && lessons) {
      const lessonsWithPlans = await Promise.all(
        lessons.map(async (lesson) => {
          const { data: planData, error: planError } = await supabase
            .from('lesson_progress_view')
            .select('*')
            .eq('lesson_id', lesson.id)
            .order('sort_order', { ascending: true });
          
          if (planError) {
            console.error(`Error fetching plan for lesson ${lesson.id}:`, planError);
            return { ...lesson, plan: [] };
          }
          
          const planWithProgress = (planData || []).map(item => ({
            id: item.lesson_plan_item_id,
            title: item.item_title,
            required: item.is_required,
            completed: item.completed || false
          }));
          
          return { ...lesson, plan: planWithProgress };
        })
      );
      
      return res.json({
        success: true,
        data: lessonsWithPlans
      });
    }
    
    res.json({
      success: true,
      data: lessons || []
    });
    
  } catch (error) {
    console.error('Error in GET /lessons:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// GET /api/lessons/current - Get the current lesson (class-wide progress)
router.get('/current', async (req: Request, res: Response) => {
  try {
    const semester = req.headers['x-semester'] as string;
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Build query with optional semester filtering
    let query = supabase
      .from('lessons')
      .select('*')
      .gte('scheduled_date', today)
      .neq('status', 'skipped')
      .order('scheduled_date', { ascending: true })
      .order('name', { ascending: true })
      .limit(1);
    
    // Add semester filter if provided
    if (semester && typeof semester === 'string') {
      // Get semester ID from code
      const { data: semesterData } = await supabase
        .from('semesters')
        .select('id')
        .eq('code', semester)
        .single();
      
      if (semesterData) {
        query = query.eq('semester_id', semesterData.id);
      }
    }
    
    const { data: lessons, error: lessonsError } = await query;
    
    if (lessonsError) {
      console.error('Error fetching current lesson:', lessonsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch current lesson',
        details: lessonsError.message
      });
    }
    
    if (!lessons || lessons.length === 0) {
      // If no upcoming lessons, get the last non-skipped lesson
      let lastQuery = supabase
        .from('lessons')
        .select('*')
        .neq('status', 'skipped')
        .order('scheduled_date', { ascending: false })
        .order('name', { ascending: true })
        .limit(1);
      
      // Add semester filter if provided
      if (semester && typeof semester === 'string') {
        // Get semester ID from code
        const { data: semesterData } = await supabase
          .from('semesters')
          .select('id')
          .eq('code', semester)
          .single();
        
        if (semesterData) {
          lastQuery = lastQuery.eq('semester_id', semesterData.id);
        }
      }
      
      const { data: lastLessons, error: lastError } = await lastQuery;
      
      if (lastError) {
        console.error('Error fetching last lesson:', lastError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch lessons'
        });
      }
      
      if (!lastLessons || lastLessons.length === 0) {
        return res.json({
          success: true,
          data: null
        });
      }
      
      const lesson = lastLessons[0];
      
      // Get lesson plan items with class progress
      const { data: planData } = await supabase
        .from('lesson_progress_view')
        .select('*')
        .eq('lesson_id', lesson.id)
        .order('sort_order', { ascending: true });
      
      const planWithProgress = (planData || []).map(item => ({
        id: item.lesson_plan_item_id,
        title: item.item_title,
        required: item.is_required,
        completed: item.completed || false
      }));
      
      return res.json({
        success: true,
        data: {
          ...lesson,
          plan: planWithProgress
        }
      });
    }
    
    const lesson = lessons[0];
    
    // Get lesson plan items with class progress
    const { data: planData } = await supabase
      .from('lesson_progress_view')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('sort_order', { ascending: true });
    
    const planWithProgress = (planData || []).map(item => ({
      id: item.lesson_plan_item_id,
      title: item.item_title,
      required: item.is_required,
      completed: item.completed || false
    }));
    
    res.json({
      success: true,
      data: {
        ...lesson,
        plan: planWithProgress
      }
    });
    
  } catch (error) {
    console.error('Error in GET /lessons/current:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/lessons/:id - Get a specific lesson with class-wide progress
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (lessonError || !lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    // Get lesson plan items with class progress
    const { data: planData } = await supabase
      .from('lesson_progress_view')
      .select('*')
      .eq('lesson_id', id)
      .order('sort_order', { ascending: true });
    
    const planWithProgress = (planData || []).map(item => ({
      id: item.lesson_plan_item_id,
      title: item.item_title,
      required: item.is_required,
      completed: item.completed || false
    }));
    
    res.json({
      success: true,
      data: {
        ...lesson,
        plan: planWithProgress
      }
    });
    
  } catch (error) {
    console.error('Error in GET /lessons/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/:id/status - Update lesson status (admin only)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['normal', 'skipped', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (normal, skipped, cancelled)'
      });
    }
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lesson status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lesson status',
        details: error.message
      });
    }
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    res.json({
      success: true,
      data: lesson
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/:id/status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/:id/url - Update lesson further reading URL (teacher only)
router.put('/:id/url', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_id, further_reading_url } = req.body;
    
    if (!teacher_id) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id is required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can update lesson URLs'
      });
    }
    
    // Validate URL format if provided
    if (further_reading_url && further_reading_url.trim() !== '') {
      try {
        new URL(further_reading_url);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }
    }
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({ further_reading_url: further_reading_url || null })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lesson URL:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lesson URL',
        details: error.message
      });
    }
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    res.json({
      success: true,
      data: lesson
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/:id/url:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/:id/title - Update lesson title (teacher only)
router.put('/:id/title', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_id, name } = req.body;
    
    if (!teacher_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id and name are required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can update lesson titles'
      });
    }
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lesson title:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lesson title',
        details: error.message
      });
    }
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    res.json({
      success: true,
      data: lesson
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/:id/title:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/:id/date - Update lesson date (teacher only)
router.put('/:id/date', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teacher_id, scheduled_date } = req.body;
    
    if (!teacher_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id and scheduled_date are required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can update lesson dates'
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduled_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD'
      });
    }
    
    // Validate that it's a valid date
    const parsedDate = new Date(scheduled_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date value'
      });
    }
    
    const { data: lesson, error } = await supabase
      .from('lessons')
      .update({ scheduled_date })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating lesson date:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update lesson date',
        details: error.message
      });
    }
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }
    
    res.json({
      success: true,
      data: lesson
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/:id/date:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/:id/plan-items/reorder - Reorder lesson plan items within same lesson (teacher only)
router.put('/:id/plan-items/reorder', async (req: Request, res: Response) => {
  try {
    const { id: lessonId } = req.params;
    const { teacher_id, item_id, new_sort_order } = req.body;
    
    if (!teacher_id || !item_id || new_sort_order === undefined) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id, item_id, and new_sort_order are required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can reorder lesson plan items'
      });
    }
    
    // Get the item to reorder
    const { data: itemToMove, error: itemError } = await supabase
      .from('lesson_plan_items')
      .select('*')
      .eq('id', item_id)
      .eq('lesson_id', lessonId)
      .single();
    
    if (itemError || !itemToMove) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan item not found in this lesson'
      });
    }
    
    const oldSortOrder = itemToMove.sort_order;
    
    // Get all items in the lesson
    const { data: allItems, error: allItemsError } = await supabase
      .from('lesson_plan_items')
      .select('id, sort_order')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });
    
    if (allItemsError || !allItems) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch lesson plan items'
      });
    }
    
    // Validate new_sort_order
    if (new_sort_order < 0 || new_sort_order >= allItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sort order position'
      });
    }
    
    // Reorder items
    if (oldSortOrder !== new_sort_order) {
      if (oldSortOrder < new_sort_order) {
        // Moving down: shift items up
        for (const item of allItems) {
          if (item.id === item_id) {
            await supabase
              .from('lesson_plan_items')
              .update({ sort_order: new_sort_order })
              .eq('id', item_id);
          } else if (item.sort_order > oldSortOrder && item.sort_order <= new_sort_order) {
            await supabase
              .from('lesson_plan_items')
              .update({ sort_order: item.sort_order - 1 })
              .eq('id', item.id);
          }
        }
      } else {
        // Moving up: shift items down
        for (const item of allItems) {
          if (item.id === item_id) {
            await supabase
              .from('lesson_plan_items')
              .update({ sort_order: new_sort_order })
              .eq('id', item_id);
          } else if (item.sort_order >= new_sort_order && item.sort_order < oldSortOrder) {
            await supabase
              .from('lesson_plan_items')
              .update({ sort_order: item.sort_order + 1 })
              .eq('id', item.id);
          }
        }
      }
    }
    
    // Get updated lesson plan
    const { data: updatedItems, error: updatedError } = await supabase
      .from('lesson_plan_items')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true });
    
    if (updatedError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch updated lesson plan'
      });
    }
    
    res.json({
      success: true,
      data: {
        lesson_id: lessonId,
        reordered_items: updatedItems
      }
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/:id/plan-items/reorder:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/lessons/plan-items/:itemId/move - Move lesson plan item to different lesson (teacher only)
router.put('/plan-items/:itemId/move', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { teacher_id, target_lesson_id, new_sort_order } = req.body;
    
    if (!teacher_id || !target_lesson_id) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id and target_lesson_id are required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can move lesson plan items'
      });
    }
    
    // Get the current lesson plan item
    const { data: currentItem, error: currentError } = await supabase
      .from('lesson_plan_items')
      .select('*')
      .eq('id', itemId)
      .single();
    
    if (currentError || !currentItem) {
      return res.status(404).json({
        success: false,
        error: 'Lesson plan item not found'
      });
    }
    
    // Verify target lesson exists
    const { data: targetLesson, error: targetError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', target_lesson_id)
      .single();
    
    if (targetError || !targetLesson) {
      return res.status(404).json({
        success: false,
        error: 'Target lesson not found'
      });
    }
    
    // If no sort order provided, append to end of target lesson
    let finalSortOrder = new_sort_order;
    if (finalSortOrder === undefined) {
      const { data: maxOrder } = await supabase
        .from('lesson_plan_items')
        .select('sort_order')
        .eq('lesson_id', target_lesson_id)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      finalSortOrder = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0;
    }
    
    // Start transaction-like operations
    // Update the item's lesson_id and sort_order
    const { data: updatedItem, error: updateError } = await supabase
      .from('lesson_plan_items')
      .update({ 
        lesson_id: target_lesson_id,
        sort_order: finalSortOrder
      })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error moving lesson plan item:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to move lesson plan item',
        details: updateError.message
      });
    }
    
    // Reorder items in target lesson if needed (move existing items down)
    if (new_sort_order !== undefined) {
      const { data: itemsToReorder } = await supabase
        .from('lesson_plan_items')
        .select('id, sort_order')
        .eq('lesson_id', target_lesson_id)
        .neq('id', itemId)
        .gte('sort_order', new_sort_order)
        .order('sort_order', { ascending: true });
      
      if (itemsToReorder && itemsToReorder.length > 0) {
        for (const item of itemsToReorder) {
          await supabase
            .from('lesson_plan_items')
            .update({ sort_order: item.sort_order + 1 })
            .eq('id', item.id);
        }
      }
    }
    
    // Clean up sort order gaps in source lesson
    const { data: sourceItems } = await supabase
      .from('lesson_plan_items')
      .select('id, sort_order')
      .eq('lesson_id', currentItem.lesson_id)
      .order('sort_order', { ascending: true });
    
    if (sourceItems && sourceItems.length > 0) {
      for (let i = 0; i < sourceItems.length; i++) {
        if (sourceItems[i].sort_order !== i) {
          await supabase
            .from('lesson_plan_items')
            .update({ sort_order: i })
            .eq('id', sourceItems[i].id);
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        moved_item: updatedItem,
        source_lesson_id: currentItem.lesson_id,
        target_lesson_id: target_lesson_id
      }
    });
    
  } catch (error) {
    console.error('Error in PUT /lessons/plan-items/:itemId/move:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/lessons/:id/progress - Update class-wide progress on lesson plan item (teacher only)
router.post('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id: lesson_id } = req.params;
    const { teacher_id, lesson_plan_item_id, completed } = req.body;
    
    if (!teacher_id || !lesson_plan_item_id || typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'teacher_id, lesson_plan_item_id, and completed (boolean) are required'
      });
    }
    
    // Verify teacher is admin
    const { data: teacher, error: teacherError } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', teacher_id)
      .single();
    
    if (teacherError || !teacher || !teacher.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can update lesson progress'
      });
    }
    
    // Verify the lesson plan item belongs to this lesson
    const { data: planItem, error: planError } = await supabase
      .from('lesson_plan_items')
      .select('id')
      .eq('id', lesson_plan_item_id)
      .eq('lesson_id', lesson_id)
      .single();
    
    if (planError || !planItem) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lesson plan item for this lesson'
      });
    }
    
    // Upsert class progress record
    const progressData = {
      lesson_plan_item_id,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by_teacher_id: teacher_id
    };
    
    const { data: progress, error } = await supabase
      .from('class_lesson_progress')
      .upsert(progressData, { 
        onConflict: 'lesson_plan_item_id' 
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating class progress:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update progress',
        details: error.message
      });
    }
    
    res.json({
      success: true,
      data: progress
    });
    
  } catch (error) {
    console.error('Error in POST /lessons/:id/progress:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;