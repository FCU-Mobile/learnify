import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';

const router = Router();

// Validation schemas
const teacherRatingSchema = z.object({
  team_id: z.number().int().positive(),
  project_number: z.number().int().min(1).max(3),
  rating: z.number().min(0).max(20),
  teacher_id: z.string().min(1),
  semester_id: z.string().uuid()
});

const studentRatingSchema = z.object({
  team_id: z.number().int().positive(),
  project_number: z.number().int().min(1).max(3),
  stars: z.number().int().min(1).max(5),
  voter_id: z.string().min(1),
  semester_id: z.string().uuid()
});

const calculateScoresSchema = z.object({
  project_number: z.number().int().min(1).max(3),
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
    const { team_id: teamId, project_number: projectNumber, rating, teacher_id: teacherId, semester_id: semesterId } = validatedBody;

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(teacherId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_REQUIRED',
        message: 'Only admin users can submit teacher ratings'
      });
    }

    // Insert or update teacher rating
    const { data: ratingData, error } = await supabase
      .from('project_ratings')
      .upsert({
        team_id: teamId,
        project_number: projectNumber,
        teacher_rating: rating,
        teacher_id: teacherId,
        semester_id: semesterId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'team_id,project_number,semester_id'
      })
      .select()
      .single();

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
    const validatedBody = studentRatingSchema.parse(req.body);
    const { team_id: teamId, project_number: projectNumber, stars, voter_id: voterId, semester_id: semesterId } = validatedBody;

    // Check if student has already voted for this team/project
    const { data: existingVote } = await supabase
      .from('project_star_ratings')
      .select('id')
      .eq('team_id', teamId)
      .eq('project_number', projectNumber)
      .eq('voter_id', voterId)
      .eq('semester_id', semesterId)
      .single();

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_VOTED',
        message: 'You have already rated this project'
      });
    }

    // Insert star rating
    const { data: starRating, error } = await supabase
      .from('project_star_ratings')
      .insert({
        team_id: teamId,
        project_number: projectNumber,
        stars: stars,
        voter_id: voterId,
        semester_id: semesterId
      })
      .select()
      .single();

    if (error) {
      console.error('Student rating error:', error);
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
    const validatedBody = calculateScoresSchema.parse(req.body);
    const { project_number: projectNumber, semester_id: semesterId, admin_id: adminId } = validatedBody;

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(adminId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_REQUIRED',
        message: 'Only admin users can calculate scores'
      });
    }

    // Get all teams and their total star ratings for this project
    const { data: starData, error: starError } = await supabase
      .from('project_star_ratings')
      .select('team_id, stars')
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

    // Calculate total stars per team
    const teamStars = new Map<number, number>();
    starData?.forEach(rating => {
      const currentStars = teamStars.get(rating.team_id) || 0;
      teamStars.set(rating.team_id, currentStars + rating.stars);
    });

    // Sort teams by total stars (descending)
    const sortedTeams = Array.from(teamStars.entries())
      .sort(([, starsA], [, starsB]) => starsB - starsA);

    // Assign scores: 1st place = 10%, 2nd = 8%, 3rd = 6%, others = 0%
    const scoreMap = new Map<number, number>();
    sortedTeams.forEach(([teamId, stars], index) => {
      if (index === 0) scoreMap.set(teamId, 10); // 1st place
      else if (index === 1) scoreMap.set(teamId, 8); // 2nd place
      else if (index === 2) scoreMap.set(teamId, 6); // 3rd place
      else scoreMap.set(teamId, 0); // No voting score
    });

    // Save results to database
    const votingResults = Array.from(scoreMap.entries()).map(([teamId, votingScore]) => ({
      team_id: teamId,
      project_number: projectNumber,
      total_stars: teamStars.get(teamId) || 0,
      voting_score: votingScore,
      semester_id: semesterId,
      calculated_by: adminId,
      calculated_at: new Date().toISOString()
    }));

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

    res.status(200).json({
      success: true,
      data: {
        results: results,
        rankings: sortedTeams.map(([teamId, stars], index) => ({
          team_id: teamId,
          rank: index + 1,
          total_stars: stars,
          voting_score: scoreMap.get(teamId)
        }))
      },
      message: `Voting scores calculated for ${sortedTeams.length} teams`
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
      .select('team_id, stars, voter_id')
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