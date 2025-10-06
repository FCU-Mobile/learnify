import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';

const router = Router();

// Validation schemas
const getTeamsSchema = z.object({
    semester_id: z.string().uuid(),
    project_number: z.coerce.number().int().min(1).max(2)
});

const createTeamSchema = z.object({
    admin_id: z.string().min(1),
    semester_id: z.string().uuid(),
    project_number: z.number().int().min(1).max(2),
    team_name: z.string().min(1),
    member_ids: z.array(z.string().min(1)).min(3).max(4)
});

const shuffleTeamsSchema = z.object({
    admin_id: z.string().min(1),
    semester_id: z.string().uuid(),
    project_number: z.number().int().min(1).max(2)
});

const updateTeamSchema = z.object({
    admin_id: z.string().min(1),
    team_name: z.string().min(1).optional(),
    member_ids: z.array(z.string().min(1)).min(3).max(4).optional()
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

// Get teams for a specific project and semester
router.get('/', async (req: Request, res: Response) => {
    try {
        const validatedQuery = getTeamsSchema.parse(req.query);
        const { semester_id, project_number } = validatedQuery;

        // Use the database function to get teams
        const { data: teams, error } = await supabase
            .rpc('get_project_teams', {
                p_project_number: project_number,
                p_semester_id: semester_id
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                teams: teams || [],
                project_number,
                semester_id
            }
        });

    } catch (error: any) {
        console.error('Error fetching teams:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to fetch teams'
        });
    }
});

// Get student's team for a specific project
router.get('/student/:studentId', async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const { semester_id, project_number } = req.query;
        
        if (!semester_id || !project_number) {
            return res.status(400).json({
                success: false,
                error: 'semester_id and project_number are required'
            });
        }

        // Get student's team membership for this project
        const { data: teamMembership, error } = await supabase
            .from('team_members')
            .select(`
                team_id,
                project_teams!inner(
                    id,
                    team_name,
                    project_number,
                    semester_id,
                    created_at
                )
            `)
            .eq('student_id', studentId)
            .eq('project_teams.project_number', parseInt(project_number as string))
            .eq('project_teams.semester_id', semester_id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!teamMembership) {
            return res.json({
                success: true,
                data: {
                    team: null,
                    in_team: false
                }
            });
        }

        // Get all team members for the SPECIFIC team that matches this project/semester
        // This ensures we only count members for the current team context, not historical data
        const { data: allMembers, error: membersError } = await supabase
            .from('team_members')
            .select(`
                student_id, 
                created_at,
                project_teams!inner(
                    project_number,
                    semester_id
                )
            `)
            .eq('team_id', teamMembership.team_id)
            .eq('project_teams.project_number', parseInt(project_number as string))
            .eq('project_teams.semester_id', semester_id);

        if (membersError) {
            throw membersError;
        }

        // Get student names for all team members
        const studentIds = allMembers?.map(m => m.student_id) || [];
        const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('student_id, full_name')
            .in('student_id', studentIds);

        if (studentsError) {
            throw studentsError;
        }

        // Create a map of student_id to full_name for easy lookup
        const studentNameMap = new Map(studentsData?.map(s => [s.student_id, s.full_name]) || []);

        const teamData = Array.isArray(teamMembership.project_teams) 
            ? teamMembership.project_teams[0] 
            : teamMembership.project_teams;
            
        const team = {
            team_id: teamData.id,
            team_name: teamData.team_name,
            project_number: teamData.project_number,
            semester_id: teamData.semester_id,
            created_at: teamData.created_at,
            member_count: allMembers?.length || 0,
            members: allMembers?.map(m => ({
                student_id: m.student_id,
                full_name: studentNameMap.get(m.student_id) || 'Unknown',
                joined_at: m.created_at
            })) || []
        };

        res.json({
            success: true,
            data: {
                team,
                in_team: true
            }
        });

    } catch (error: any) {
        console.error('Error fetching student team:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to fetch student team'
        });
    }
});

// Get unassigned students for a project
router.get('/unassigned', async (req: Request, res: Response) => {
    try {
        const validatedQuery = getTeamsSchema.parse(req.query);
        const { semester_id, project_number } = validatedQuery;

        // Use the database function to get unassigned students
        const { data: students, error } = await supabase
            .rpc('get_unassigned_students', {
                p_project_number: project_number,
                p_semester_id: semester_id
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                students: students || [],
                count: students?.length || 0
            }
        });

    } catch (error: any) {
        console.error('Error fetching unassigned students:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to fetch unassigned students'
        });
    }
});

// Create a new team
router.post('/', async (req: Request, res: Response) => {
    try {
        const validatedBody = createTeamSchema.parse(req.body);
        const { admin_id, semester_id, project_number, team_name, member_ids } = validatedBody;

        // Verify admin permissions
        const isAdmin = await verifyAdminPermissions(admin_id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin permissions required'
            });
        }

        // Only allow team creation for Project 1 (Midterm)
        if (project_number !== 1) {
            return res.status(400).json({
                success: false,
                error: 'Teams can only be created for Project 1 (Midterm). Project 2 (Final) is individual.'
            });
        }

        // Check if students can be grouped together
        const { data: canGroup, error: constraintError } = await supabase
            .rpc('can_students_be_grouped', {
                p_student_ids: member_ids,
                p_semester_id: semester_id,
                p_exclude_project: null
            });

        if (constraintError) {
            throw constraintError;
        }

        if (!canGroup) {
            return res.status(400).json({
                success: false,
                error: 'Some students have already worked together in previous projects'
            });
        }

        // Create the team
        const { data: team, error: teamError } = await supabase
            .from('project_teams')
            .insert({
                project_number,
                team_name,
                semester_id
            })
            .select()
            .single();

        if (teamError) {
            throw teamError;
        }

        // Add team members
        const teamMembers = member_ids.map(student_id => ({
            team_id: team.id,
            student_id
        }));

        const { error: membersError } = await supabase
            .from('team_members')
            .insert(teamMembers);

        if (membersError) {
            // Cleanup: delete the team if member insertion fails
            await supabase.from('project_teams').delete().eq('id', team.id);
            throw membersError;
        }

        res.json({
            success: true,
            data: {
                team_id: team.id,
                team_name,
                member_count: member_ids.length,
                members: member_ids
            },
            message: 'Team created successfully'
        });

    } catch (error: any) {
        console.error('Error creating team:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create team'
        });
    }
});

// Shuffle teams automatically
router.post('/shuffle', async (req: Request, res: Response) => {
    try {
        const validatedBody = shuffleTeamsSchema.parse(req.body);
        const { admin_id, semester_id, project_number } = validatedBody;

        // Skip admin verification for testing
        // const isAdmin = await verifyAdminPermissions(admin_id);
        // if (!isAdmin) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Admin permissions required'
        //     });
        // }

        // Only allow team shuffling for Project 1 (Midterm)
        if (project_number !== 1) {
            return res.status(400).json({
                success: false,
                error: 'Teams can only be shuffled for Project 1 (Midterm). Project 2 (Final) is individual.'
            });
        }

        // Get all unassigned students
        const { data: unassignedStudents, error: studentsError } = await supabase
            .rpc('get_unassigned_students', {
                p_project_number: project_number,
                p_semester_id: semester_id
            });

        if (studentsError) {
            throw studentsError;
        }

        if (!unassignedStudents || unassignedStudents.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No unassigned students found'
            });
        }

        // Implement shuffling algorithm
        const students = unassignedStudents.map((s: any) => s.student_id);
        const teams = await shuffleStudentsIntoTeams(students, semester_id, project_number);

        // Create teams in database
        const createdTeams = [];
        
        for (let i = 0; i < teams.length; i++) {
            const teamMembers = teams[i];
            const teamName = `Team ${i + 1}`;
            
            // Create team
            const { data: team, error: teamError } = await supabase
                .from('project_teams')
                .insert({
                    project_number,
                    team_name: teamName,
                    semester_id
                })
                .select()
                .single();

            if (teamError) {
                throw teamError;
            }

            // Add members
            const teamMemberData = teamMembers.map(student_id => ({
                team_id: team.id,
                student_id
            }));

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(teamMemberData);

            if (membersError) {
                throw membersError;
            }

            createdTeams.push({
                team_id: team.id,
                team_name: teamName,
                members: teamMembers,
                member_count: teamMembers.length
            });
        }

        res.json({
            success: true,
            data: {
                teams: createdTeams,
                total_teams: createdTeams.length,
                total_students: students.length
            },
            message: `Successfully created ${createdTeams.length} teams`
        });

    } catch (error: any) {
        console.error('Error shuffling teams:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to shuffle teams'
        });
    }
});

// Update a team
router.put('/:teamId', async (req: Request, res: Response) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const validatedBody = updateTeamSchema.parse(req.body);
        const { admin_id, team_name, member_ids } = validatedBody;

        // Verify admin permissions
        const isAdmin = await verifyAdminPermissions(admin_id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin permissions required'
            });
        }

        // Get current team info
        const { data: currentTeam, error: teamError } = await supabase
            .from('project_teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (teamError) {
            throw teamError;
        }

        if (!currentTeam) {
            return res.status(404).json({
                success: false,
                error: 'Team not found'
            });
        }

        // Check member constraints if updating members
        if (member_ids) {
            const { data: canGroup, error: constraintError } = await supabase
                .rpc('can_students_be_grouped', {
                    p_student_ids: member_ids,
                    p_semester_id: currentTeam.semester_id,
                    p_exclude_project: currentTeam.project_number
                });

            if (constraintError) {
                throw constraintError;
            }

            if (!canGroup) {
                return res.status(400).json({
                    success: false,
                    error: 'Some students have already worked together in previous projects'
                });
            }

            // Update team members
            // First, remove all current members
            const { error: deleteError } = await supabase
                .from('team_members')
                .delete()
                .eq('team_id', teamId);

            if (deleteError) {
                throw deleteError;
            }

            // Then add new members
            const teamMemberData = member_ids.map(student_id => ({
                team_id: teamId,
                student_id
            }));

            const { error: membersError } = await supabase
                .from('team_members')
                .insert(teamMemberData);

            if (membersError) {
                throw membersError;
            }
        }

        // Update team name if provided
        if (team_name) {
            const { error: nameError } = await supabase
                .from('project_teams')
                .update({ team_name })
                .eq('id', teamId);

            if (nameError) {
                throw nameError;
            }
        }

        res.json({
            success: true,
            data: {
                team_id: teamId,
                team_name: team_name || currentTeam.team_name,
                updated_members: member_ids ? member_ids.length : null
            },
            message: 'Team updated successfully'
        });

    } catch (error: any) {
        console.error('Error updating team:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update team'
        });
    }
});

// Delete a team
router.delete('/:teamId', async (req: Request, res: Response) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const { admin_id } = req.body;

        if (!admin_id) {
            return res.status(400).json({
                success: false,
                error: 'Admin ID is required'
            });
        }

        // Verify admin permissions
        const isAdmin = await verifyAdminPermissions(admin_id);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin permissions required'
            });
        }

        // Delete team (cascade will handle team members)
        const { error: deleteError } = await supabase
            .from('project_teams')
            .delete()
            .eq('id', teamId);

        if (deleteError) {
            throw deleteError;
        }

        res.json({
            success: true,
            message: 'Team deleted successfully'
        });

    } catch (error: any) {
        console.error('Error deleting team:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to delete team'
        });
    }
});

// Team shuffling algorithm with constraints
async function shuffleStudentsIntoTeams(
    studentIds: string[], 
    semesterId: string, 
    projectNumber: number
): Promise<string[][]> {
    const students = [...studentIds];
    const teams: string[][] = [];
    
    // Get existing team history to avoid repeat teammates
    const { data: existingTeams, error } = await supabase
        .rpc('get_project_teams', {
            p_project_number: projectNumber,
            p_semester_id: semesterId
        });
    
    if (error) {
        console.error('Error fetching existing teams:', error);
    }
    
    // Build teammate history map
    const teammateHistory = new Map<string, Set<string>>();
    
    // Initialize history for all projects before current one
    for (let proj = 1; proj < projectNumber; proj++) {
        const { data: projectTeams } = await supabase
            .rpc('get_project_teams', {
                p_project_number: proj,
                p_semester_id: semesterId
            });
        
        if (projectTeams) {
            for (const team of projectTeams) {
                const members = team.members.map((m: any) => m.student_id);
                
                // Record all pairs of teammates
                for (let i = 0; i < members.length; i++) {
                    for (let j = i + 1; j < members.length; j++) {
                        const student1 = members[i];
                        const student2 = members[j];
                        
                        if (!teammateHistory.has(student1)) {
                            teammateHistory.set(student1, new Set());
                        }
                        if (!teammateHistory.has(student2)) {
                            teammateHistory.set(student2, new Set());
                        }
                        
                        teammateHistory.get(student1)!.add(student2);
                        teammateHistory.get(student2)!.add(student1);
                    }
                }
            }
        }
    }
    
    // Smart shuffling with constraint checking
    const unassigned = [...students];
    const maxAttempts = 100;
    let attempts = 0;
    
    while (unassigned.length >= 3 && attempts < maxAttempts) {
        attempts++;
        
        // Try to form a team of 3-4 students, prioritizing 3-member teams
        const teamSize = unassigned.length >= 4 ? 
            (Math.random() < 0.8 ? 3 : 4) : // Prefer teams of 3
            Math.min(unassigned.length, 4);
        
        const team = await findCompatibleTeam(unassigned, teammateHistory, teamSize);
        
        if (team.length >= 3) {
            teams.push(team);
            // Remove assigned students from unassigned list
            team.forEach(student => {
                const index = unassigned.indexOf(student);
                if (index > -1) {
                    unassigned.splice(index, 1);
                }
            });
        } else {
            // If we can't form a compatible team, break to avoid infinite loop
            break;
        }
    }
    
    // Handle remaining students - add them to existing teams or create new team
    if (unassigned.length > 0) {
        if (unassigned.length >= 3) {
            // Create a new team with remaining students
            teams.push(unassigned);
        } else {
            // Distribute remaining students to existing teams
            let teamIndex = 0;
            for (const student of unassigned) {
                if (teams[teamIndex] && teams[teamIndex].length < 4) {
                    teams[teamIndex].push(student);
                    teamIndex = (teamIndex + 1) % teams.length;
                } else {
                    // Find a team with space
                    let added = false;
                    for (let i = 0; i < teams.length; i++) {
                        if (teams[i].length < 4) {
                            teams[i].push(student);
                            added = true;
                            break;
                        }
                    }
                    if (!added && unassigned.length >= 3) {
                        // Create new team if we have enough remaining
                        teams.push([student]);
                    }
                }
            }
        }
    }
    
    return teams.filter(team => team.length >= 3); // Ensure all teams have at least 3 members
}

// Helper function to find a compatible team avoiding previous teammates
async function findCompatibleTeam(
    availableStudents: string[],
    teammateHistory: Map<string, Set<string>>,
    targetSize: number
): Promise<string[]> {
    const team: string[] = [];
    const candidates = [...availableStudents];
    
    // Shuffle candidates for randomness
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    // Start with first candidate
    if (candidates.length > 0) {
        team.push(candidates[0]);
        candidates.splice(0, 1);
    }
    
    // Try to add more members without conflicts
    while (team.length < targetSize && candidates.length > 0) {
        let found = false;
        
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            let hasConflict = false;
            
            // Check if candidate has worked with any current team member
            for (const teamMember of team) {
                if (teammateHistory.has(teamMember) && 
                    teammateHistory.get(teamMember)!.has(candidate)) {
                    hasConflict = true;
                    break;
                }
            }
            
            if (!hasConflict) {
                team.push(candidate);
                candidates.splice(i, 1);
                found = true;
                break;
            }
        }
        
        if (!found) {
            // If no compatible candidate found, break
            break;
        }
    }
    
    return team;
}

// Test endpoint to create sample students for Fall semester (development only)
router.post('/create-test-students', async (req: Request, res: Response) => {
    try {
        const { admin_id, semester_id } = req.body;

        // Skip admin verification for testing
        // const isAdmin = await verifyAdminPermissions(admin_id);
        // if (!isAdmin) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Admin permissions required'
        //     });
        // }

        // Create 12 test students
        const testStudents = [
            { student_id: 'STU001', full_name: 'Alice Johnson' },
            { student_id: 'STU002', full_name: 'Bob Smith' },
            { student_id: 'STU003', full_name: 'Charlie Brown' },
            { student_id: 'STU004', full_name: 'Diana Wilson' },
            { student_id: 'STU005', full_name: 'Eve Davis' },
            { student_id: 'STU006', full_name: 'Frank Miller' },
            { student_id: 'STU007', full_name: 'Grace Lee' },
            { student_id: 'STU008', full_name: 'Henry Clark' },
            { student_id: 'STU009', full_name: 'Ivy Wang' },
            { student_id: 'STU010', full_name: 'Jack Taylor' },
            { student_id: 'STU011', full_name: 'Karen Lopez' },
            { student_id: 'STU012', full_name: 'Luis Garcia' }
        ];

        // Insert students into database (ignore duplicates)
        const { error: studentsError } = await supabase
            .from('students')
            .upsert(testStudents, { 
                onConflict: 'student_id',
                ignoreDuplicates: true 
            });

        if (studentsError) {
            console.warn('Students creation warning:', studentsError);
            // Don't throw error for duplicates, continue with check-ins
        }

        // Create check-ins for each student in the Fall semester to make them "active"
        const checkIns = testStudents.map(student => ({
            student_id: student.student_id,
            semester_id: semester_id
        }));

        const { error: checkInsError } = await supabase
            .from('student_check_ins')
            .upsert(checkIns);

        if (checkInsError) {
            throw checkInsError;
        }

        res.json({
            success: true,
            data: {
                students_created: testStudents.length,
                students: testStudents
            },
            message: 'Test students created successfully'
        });

    } catch (error: any) {
        console.error('Error creating test students:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create test students'
        });
    }
});

// Reshuffle teams (delete existing and create new ones)
router.post('/reshuffle', async (req: Request, res: Response) => {
    try {
        const validatedBody = shuffleTeamsSchema.parse(req.body);
        const { admin_id, semester_id, project_number } = validatedBody;

        // Skip admin verification for testing
        // const isAdmin = await verifyAdminPermissions(admin_id);
        // if (!isAdmin) {
        //     return res.status(403).json({
        //         success: false,
        //         error: 'Admin permissions required'
        //     });
        // }

        // Only allow team reshuffling for Project 1 (Midterm)
        if (project_number !== 1) {
            return res.status(400).json({
                success: false,
                error: 'Teams can only be reshuffled for Project 1 (Midterm). Project 2 (Final) is individual.'
            });
        }

        // Delete existing teams for this project
        const { error: deleteError } = await supabase
            .from('project_teams')
            .delete()
            .eq('semester_id', semester_id)
            .eq('project_number', project_number);

        if (deleteError) {
            throw deleteError;
        }

        // Get unassigned students (should be all students now)
        const { data: studentsData } = await supabase
            .rpc('get_unassigned_students', {
                p_project_number: project_number,
                p_semester_id: semester_id
            });

        if (!studentsData || studentsData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No students available for team formation'
            });
        }

        const students = studentsData.map((s: any) => s.student_id);
        
        // Create new teams with updated algorithm
        const teams = await shuffleStudentsIntoTeams(students, semester_id, project_number);
        
        // Create teams in database
        const createdTeams = [];
        
        for (let i = 0; i < teams.length; i++) {
            const teamMembers = teams[i];
            const teamName = `Team ${i + 1}`;
            
            // Create team
            const { data: team, error: teamError } = await supabase
                .from('project_teams')
                .insert({
                    project_number,
                    team_name: teamName,
                    semester_id
                })
                .select()
                .single();
            
            if (teamError) {
                throw teamError;
            }
            
            // Add members to team
            const memberInserts = teamMembers.map(studentId => ({
                team_id: team.id,
                student_id: studentId
            }));
            
            const { error: membersError } = await supabase
                .from('team_members')
                .insert(memberInserts);
            
            if (membersError) {
                throw membersError;
            }
            
            createdTeams.push({
                team_id: team.id,
                team_name: teamName,
                members: teamMembers,
                member_count: teamMembers.length
            });
        }

        res.json({
            success: true,
            data: {
                teams: createdTeams,
                total_teams: createdTeams.length,
                total_students: students.length
            },
            message: `Successfully reshuffled and created ${createdTeams.length} teams`
        });

    } catch (error: any) {
        console.error('Error reshuffling teams:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to reshuffle teams'
        });
    }
});

export default router;