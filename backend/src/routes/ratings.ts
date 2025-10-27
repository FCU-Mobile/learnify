import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';

const router = Router();

// Validation schemas
const teacherRatingSchema = z.object({
  team_id: z.number().int().positive().nullable().optional(),
  submission_id: z.number().int().positive().nullable().optional(),
  project_number: z.number().int().min(1).max(2),  // 2-project system
  rating: z.number().min(0).max(40),  // Validated further based on project_number
  teacher_id: z.string().min(1),
  semester_id: z.string().uuid()
}).refine(
  (data) => (data.team_id != null) !== (data.submission_id != null),
  { message: 'Either team_id or submission_id must be provided, but not both' }
).refine(
  (data) => {
    // Project 1: max 30% (teacher rating, 10% for peer voting)
    // Project 2: max 40% (teacher rating, 10% for peer voting)
    const maxRating = data.project_number === 1 ? 30 : 40;
    return data.rating <= maxRating;
  },
  (data) => ({
    message: `Project ${data.project_number} teacher rating cannot exceed ${data.project_number === 1 ? 30 : 40}%`
  })
);

const studentRatingSchema = z.object({
  team_id: z.number().int().positive().nullable().optional(),
  submission_id: z.number().int().positive().nullable().optional(),
  project_number: z.number().int().min(1).max(2),  // 2-project system
  stars: z.number().int().min(1).max(5),
  voter_id: z.string().min(1),
  semester_id: z.string().uuid()
}).refine(
  (data) => (data.team_id != null) !== (data.submission_id != null),
  { message: 'Either team_id or submission_id must be provided, but not both' }
);

const calculateScoresSchema = z.object({
  project_number: z.number().int().min(1).max(2),  // 2-project system
  semester_id: z.string().uuid(),
  admin_id: z.string().min(1)
});

// Helper function to verify admin permissions
async function verifyAdminPermissions(adminId: string): Promise<boolean> {
  try {
    const { data: admin } = await supabase
      .from('students')
      .select('is_admin')
      .eq('student_id', adminId)
      .single();

    return admin?.is_admin === true;
  } catch (error) {
    return false;
  }
}

/**
 * POST /api/ratings/teacher
 * Submit or update teacher rating for a team project
 */
router.post('/teacher', async (req: Request, res: Response) => {
  try {
    const validatedBody = teacherRatingSchema.parse(req.body);
    const { team_id: teamId, submission_id: submissionId, project_number: projectNumber, rating, teacher_id: teacherId, semester_id: semesterId } = validatedBody;

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(teacherId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_REQUIRED',
        message: 'Only admin users can submit teacher ratings'
      });
    }

    // Build the upsert data
    const upsertData: any = {
      project_number: projectNumber,
      teacher_rating: rating,
      teacher_id: teacherId,
      semester_id: semesterId,
      updated_at: new Date().toISOString()
    };

    // Add either team_id or submission_id
    if (teamId) {
      upsertData.team_id = teamId;
      upsertData.submission_id = null;
    } else {
      upsertData.submission_id = submissionId;
      upsertData.team_id = null;
    }

    // Check if rating already exists
    let existingQuery = supabase
      .from('project_ratings')
      .select('id')
      .eq('project_number', projectNumber)
      .eq('semester_id', semesterId);

    if (teamId) {
      existingQuery = existingQuery.eq('team_id', teamId);
    } else {
      existingQuery = existingQuery.eq('submission_id', submissionId);
    }

    const { data: existingRating } = await existingQuery.single();

    let ratingData;
    let error;

    if (existingRating) {
      // Update existing rating
      const updateResult = await supabase
        .from('project_ratings')
        .update({
          teacher_rating: rating,
          teacher_id: teacherId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      ratingData = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new rating
      const insertResult = await supabase
        .from('project_ratings')
        .insert(upsertData)
        .select()
        .single();

      ratingData = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Teacher rating error:', error);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to save teacher rating'
      });
    }

    res.status(200).json({
      success: true,
      data: ratingData,
      message: 'Teacher rating saved successfully'
    });

  } catch (error: any) {
    console.error('Teacher rating validation error:', error);
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message || 'Invalid request data'
    });
  }
});

/**
 * POST /api/ratings/student
 * Submit student star rating for a team project
 */
router.post('/student', async (req: Request, res: Response) => {
  try {
    console.log('Student rating request body:', JSON.stringify(req.body, null, 2));
    const validatedBody = studentRatingSchema.parse(req.body);
    const { team_id: teamId, submission_id: submissionId, project_number: projectNumber, stars, voter_id: voterId, semester_id: semesterId } = validatedBody;
    console.log('Validated semester_id:', semesterId);

    // Check if student has already voted for this team/project/submission
    let existingVoteQuery = supabase
      .from('project_star_ratings')
      .select('id')
      .eq('project_number', projectNumber)
      .eq('voter_id', voterId)
      .eq('semester_id', semesterId);

    if (teamId) {
      existingVoteQuery = existingVoteQuery.eq('team_id', teamId);
    } else {
      existingVoteQuery = existingVoteQuery.eq('submission_id', submissionId);
    }

    const { data: existingVote } = await existingVoteQuery.single();

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_VOTED',
        message: 'You have already rated this project'
      });
    }

    // Build insert data
    const insertData: any = {
      project_number: projectNumber,
      stars: stars,
      voter_id: voterId,
      semester_id: semesterId
    };

    if (teamId) {
      insertData.team_id = teamId;
      insertData.submission_id = null;
    } else {
      insertData.submission_id = submissionId;
      insertData.team_id = null;
    }

    // Insert star rating
    const { data: starRating, error } = await supabase
      .from('project_star_ratings')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Student rating error:', error);
      console.error('Failed insert data:', JSON.stringify(insertData, null, 2));

      // If it's a foreign key violation on semester_id, provide more details
      if (error.code === '23503' && error.message.includes('semester_id')) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_SEMESTER',
          message: `Invalid semester_id: ${semesterId}. Please refresh the page to load the latest semesters.`,
          details: {
            received_semester_id: semesterId,
            error_code: error.code
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to save student rating'
      });
    }

    res.status(201).json({
      success: true,
      data: starRating,
      message: 'Student rating saved successfully'
    });

  } catch (error: any) {
    console.error('Student rating validation error:', error);
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message || 'Invalid request data'
    });
  }
});

/**
 * POST /api/ratings/calculate-scores
 * Calculate and assign voting scores based on star ratings
 */
router.post('/calculate-scores', async (req: Request, res: Response) => {
  try {
    console.log('Calculate scores request body:', JSON.stringify(req.body, null, 2));
    const validatedBody = calculateScoresSchema.parse(req.body);
    const { project_number: projectNumber, semester_id: semesterId, admin_id: adminId } = validatedBody;
    console.log('Checking admin permissions for:', adminId);

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(adminId);
    console.log('Admin verification result:', isAdmin);
    if (!isAdmin) {
      console.error('Admin verification failed for student_id:', adminId);
      return res.status(403).json({
        success: false,
        error: 'ADMIN_REQUIRED',
        message: 'Only admin users can calculate scores'
      });
    }

    // Get all star ratings for this project (both team and individual)
    const { data: starData, error: starError } = await supabase
      .from('project_star_ratings')
      .select('team_id, submission_id, stars')
      .eq('project_number', projectNumber)
      .eq('semester_id', semesterId);

    if (starError) {
      console.error('Error fetching star ratings:', starError);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch star ratings'
      });
    }

    // Calculate total stars per entity (team or submission)
    // Use composite key to distinguish between team and individual projects
    interface EntityData {
      id: number;
      type: 'team' | 'submission';
      stars: number;
    }

    const entityStars = new Map<string, EntityData>();
    starData?.forEach(rating => {
      // Determine if this is a team or individual project rating
      if (rating.team_id) {
        const key = `team_${rating.team_id}`;
        const existing = entityStars.get(key);
        if (existing) {
          existing.stars += rating.stars;
        } else {
          entityStars.set(key, { id: rating.team_id, type: 'team', stars: rating.stars });
        }
      } else if (rating.submission_id) {
        const key = `submission_${rating.submission_id}`;
        const existing = entityStars.get(key);
        if (existing) {
          existing.stars += rating.stars;
        } else {
          entityStars.set(key, { id: rating.submission_id, type: 'submission', stars: rating.stars });
        }
      }
    });

    // Sort entities by total stars (descending)
    const sortedEntities = Array.from(entityStars.entries())
      .sort(([, a], [, b]) => b.stars - a.stars);

    // Assign scores: 1st place = 10, 2nd = 8, 3rd = 6, others = 0
    const scoreMap = new Map<string, number>();
    sortedEntities.forEach(([key, entity], index) => {
      if (index === 0) scoreMap.set(key, 10); // 1st place
      else if (index === 1) scoreMap.set(key, 8); // 2nd place
      else if (index === 2) scoreMap.set(key, 6); // 3rd place
      else scoreMap.set(key, 0); // No voting score
    });

    // Save results to database
    const votingResults = Array.from(scoreMap.entries()).map(([key, votingScore]) => {
      const entity = entityStars.get(key)!;
      return {
        team_id: entity.type === 'team' ? entity.id : null,
        submission_id: entity.type === 'submission' ? entity.id : null,
        project_number: projectNumber,
        total_stars: entity.stars,
        voting_score: votingScore,
        semester_id: semesterId,
        calculated_by: adminId,
        calculated_at: new Date().toISOString()
      };
    });

    // Clear existing results and insert new ones
    const { error: deleteError } = await supabase
      .from('project_voting_results')
      .delete()
      .eq('project_number', projectNumber)
      .eq('semester_id', semesterId);

    if (deleteError) {
      console.error('Error clearing old results:', deleteError);
    }

    const { data: results, error: insertError } = await supabase
      .from('project_voting_results')
      .insert(votingResults)
      .select();

    if (insertError) {
      console.error('Error saving voting results:', insertError);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to save voting results'
      });
    }

    // Update bonus_points in submissions table for individual projects (Project 2)
    if (projectNumber === 2) {
      for (const [key, votingScore] of scoreMap.entries()) {
        const entity = entityStars.get(key)!;
        if (entity.type === 'submission' && votingScore > 0) {
          const { error: updateError } = await supabase
            .from('submissions')
            .update({
              bonus_points: votingScore,
              bonus_awarded_date: new Date().toISOString()
            })
            .eq('id', entity.id);

          if (updateError) {
            console.error(`Error updating bonus_points for submission ${entity.id}:`, updateError);
          } else {
            console.log(`Updated submission ${entity.id} with ${votingScore} bonus points`);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results: results,
        rankings: sortedEntities.map(([key, entity], index) => ({
          team_id: entity.type === 'team' ? entity.id : null,
          submission_id: entity.type === 'submission' ? entity.id : null,
          rank: index + 1,
          total_stars: entity.stars,
          voting_score: scoreMap.get(key)
        }))
      },
      message: `Voting scores calculated for ${sortedEntities.length} ${projectNumber === 1 ? 'teams' : 'submissions'}`
    });

  } catch (error: any) {
    console.error('Calculate scores error:', error);
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message || 'Invalid request data'
    });
  }
});

/**
 * GET /api/ratings/results
 * Get rating and voting results for a project
 */
router.get('/results', async (req: Request, res: Response) => {
  try {
    const { project_number, semester_id } = req.query;

    if (!project_number || !semester_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'project_number and semester_id are required'
      });
    }

    const projectNumber = parseInt(project_number as string);

    // Get teacher ratings
    const { data: teacherRatings, error: teacherError } = await supabase
      .from('project_ratings')
      .select('*')
      .eq('project_number', projectNumber)
      .eq('semester_id', semester_id as string);

    // Get voting results
    const { data: votingResults, error: votingError } = await supabase
      .from('project_voting_results')
      .select('*')
      .eq('project_number', projectNumber)
      .eq('semester_id', semester_id as string);

    // Get star ratings summary
    const { data: starRatings, error: starError } = await supabase
      .from('project_star_ratings')
      .select('team_id, submission_id, stars, voter_id')
      .eq('project_number', projectNumber)
      .eq('semester_id', semester_id as string);

    if (teacherError || votingError || starError) {
      console.error('Error fetching results:', { teacherError, votingError, starError });
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch rating results'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        teacher_ratings: teacherRatings || [],
        voting_results: votingResults || [],
        star_ratings: starRatings || [],
        project_number: projectNumber,
        semester_id: semester_id
      }
    });

  } catch (error: any) {
    console.error('Get results error:', error);
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR', 
      message: error.message || 'Invalid request parameters'
    });
  }
});

export default router;