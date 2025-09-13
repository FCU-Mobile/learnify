import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, CheckCircle, Users, User, ExternalLink, Github, Calendar, Calculator, AlertCircle, Eye, Vote } from 'lucide-react';
import { getPublicProjectsForSemester, voteOnBehalfOfStudents, getAllStudentsAsAdmin, type Submission, type BulkVoteResult } from '../lib/api';

interface AdminProjectsViewProps {
  semesterId: string;
}

interface ProjectWithRatingInfo extends Submission {
  studentRatingCount: number;
  eligibleVoters: number;
  hasTeacherRating: boolean;
}

const AdminProjectsView: React.FC<AdminProjectsViewProps> = ({ semesterId }) => {
  const [projects, setProjects] = useState<ProjectWithRatingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'midterm' | 'final' | 'project3'>('all');
  
  const [starRatingsData, setStarRatingsData] = useState<{[key: string]: any[]}>({});
  const [teacherRatingsData, setTeacherRatingsData] = useState<{[key: string]: any[]}>({});
  const [totalStudents, setTotalStudents] = useState<number>(31);
  
  // State for marks calculation
  const [calculatingProject, setCalculatingProject] = useState<string | null>(null);
  const [calculationResults, setCalculationResults] = useState<{[key: string]: any}>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  
  // State for mass voting
  const [votingProject, setVotingProject] = useState<number | null>(null);
  const [voteResults, setVoteResults] = useState<{[key: string]: BulkVoteResult}>({});
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectsData();
  }, [semesterId]);

  const fetchProjectsData = async () => {
    if (!semesterId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // First get the actual semester UUID
      const semesterUuidPromise = fetch('/api/semesters').then(async res => {
        const data = await res.json();
        const fallSemester = data.data?.semesters?.find((s: any) => s.code === 'fall_2025');
        return fallSemester?.id || semesterId; // fallback to passed semesterId if UUID not found
      }).catch(() => semesterId);

      const promises = [
        getPublicProjectsForSemester('fall_2025'),
        // Fetch star ratings for all project types
        semesterUuidPromise.then(actualSemesterId => 
          fetch(`/api/ratings/results?project_number=1&semester_id=${actualSemesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
        ),
        semesterUuidPromise.then(actualSemesterId => 
          fetch(`/api/ratings/results?project_number=2&semester_id=${actualSemesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
        ),
        semesterUuidPromise.then(actualSemesterId => 
          fetch(`/api/ratings/results?project_number=3&semester_id=${actualSemesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
        ),
        // Fetch total students (excluding teachers)
        fetch(`/api/leaderboard?semester=fall_2025`).then(res => res.json()).catch(() => ({ success: false, data: { leaderboard: [] } }))
      ];

      const [projectsData, project1Ratings, project2Ratings, project3Ratings, leaderboardData] = await Promise.all(promises);
      
      // Process star ratings
      const starRatings: {[key: string]: any[]} = {};
      if (project1Ratings.success && project1Ratings.data.star_ratings) {
        starRatings['midterm'] = project1Ratings.data.star_ratings;
      }
      if (project2Ratings.success && project2Ratings.data.star_ratings) {
        starRatings['final'] = project2Ratings.data.star_ratings;
      }
      if (project3Ratings.success && project3Ratings.data.star_ratings) {
        starRatings['project3'] = project3Ratings.data.star_ratings;
      }
      setStarRatingsData(starRatings);

      // Process teacher ratings
      const teacherRatings: {[key: string]: any[]} = {};
      if (project1Ratings.success && project1Ratings.data.teacher_ratings) {
        teacherRatings['midterm'] = project1Ratings.data.teacher_ratings;
      }
      if (project2Ratings.success && project2Ratings.data.teacher_ratings) {
        teacherRatings['final'] = project2Ratings.data.teacher_ratings;
      }
      if (project3Ratings.success && project3Ratings.data.teacher_ratings) {
        teacherRatings['project3'] = project3Ratings.data.teacher_ratings;
      }
      setTeacherRatingsData(teacherRatings);

      // Set student count from leaderboard (excluding teachers)
      if (leaderboardData.success && leaderboardData.data.leaderboard) {
        const studentsOnly = leaderboardData.data.leaderboard.filter((student: any) => 
          !student.student_id?.startsWith('T')
        );
        setTotalStudents(studentsOnly.length);
      }
      
      // Combine projects with rating info
      const projectsWithRatingInfo: ProjectWithRatingInfo[] = projectsData.map((project: Submission) => {
        // Calculate eligible voters (total students minus team members who cannot vote for themselves)
        let teamMemberCount = 1; // default for solo projects
        
        if (project.team && project.team.members && project.team.members.length > 0) {
          // Use actual member count if available
          teamMemberCount = project.team.members.length;
        } else if (project.team) {
          // If we have a team but no members data, assume it's a 3-person team for fall semester
          teamMemberCount = 3;
        }
        
        const eligibleVoters = totalStudents - teamMemberCount;
        
        
        return {
          ...project,
          studentRatingCount: getStarRatingCount(project.id, project.project_type || 'midterm', starRatings, projectsData),
          eligibleVoters: eligibleVoters,
          hasTeacherRating: hasTeacherRating(project.id, project.project_type || 'midterm', teacherRatings, projectsData)
        };
      });
      
      setProjects(projectsWithRatingInfo);
    } catch (err) {
      console.error('Error fetching projects data:', err);
      setError('Failed to load projects data');
    } finally {
      setLoading(false);
    }
  };

  const getStarRatingCount = (projectId: number, projectType: string, starRatings: {[key: string]: any[]}, projectsData: Submission[]): number => {
    if (!starRatings[projectType]) return 0;
    
    // Find the team ID for this project
    const project = projectsData.find(p => p.id === projectId);
    const targetTeamId = project?.team?.team_id || projectId;
    
    
    const projectRatings = starRatings[projectType].filter((rating: any) => 
      rating.team_id === targetTeamId
    );
    
    return projectRatings.length;
  };

  const hasTeacherRating = (projectId: number, projectType: string, teacherRatings: {[key: string]: any[]}, projectsData: Submission[]): boolean => {
    if (!teacherRatings[projectType]) return false;
    
    // Find the team ID for this project
    const project = projectsData.find(p => p.id === projectId);
    const targetTeamId = project?.team?.team_id || projectId;
    
    return teacherRatings[projectType].some((rating: any) => 
      rating.team_id === targetTeamId
    );
  };

  const filteredProjects = projects.filter(project => {
    if (activeFilter === 'all') return true;
    return project.project_type === activeFilter;
  });

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'midterm':
        return 'bg-blue-100 text-blue-800';
      case 'final':
        return 'bg-purple-100 text-purple-800';
      case 'project3':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProjectTypeName = (type: string) => {
    switch (type) {
      case 'midterm':
        return 'Project 1';
      case 'final':
        return 'Project 2';
      case 'project3':
        return 'Project 3';
      default:
        return 'Project';
    }
  };

  // Check if all teams for a project type have both student ratings and teacher ratings
  const areAllTeamsRated = (projectType: string): boolean => {
    const projectsOfType = projects.filter(p => p.project_type === projectType);
    
    if (projectsOfType.length === 0) {
      console.log(`areAllTeamsRated(${projectType}): No projects found`);
      return false;
    }

    // Get unique teams for this project type (teams that actually submitted projects)
    const uniqueTeams = new Set();
    projectsOfType.forEach(project => {
      const teamId = project.team?.team_id || project.id;
      uniqueTeams.add(teamId);
    });

    // Get all rated teams (teams that have received any ratings)
    const teacherRatings = teacherRatingsData[projectType] || [];
    const studentRatings = starRatingsData[projectType] || [];
    const allRatedTeams = new Set([
      ...teacherRatings.map(r => r.team_id),
      ...studentRatings.map(r => r.team_id)
    ]);

    // Only check teams that have both submitted projects AND received ratings
    const teamsToCheck = new Set();
    for (const teamId of uniqueTeams) {
      if (allRatedTeams.has(teamId)) {
        teamsToCheck.add(teamId);
      }
    }

    // Also check teams that have been rated but maybe haven't submitted
    for (const teamId of allRatedTeams) {
      teamsToCheck.add(teamId);
    }

    console.log(`areAllTeamsRated(${projectType}) debug:`, {
      projectsOfType: projectsOfType.length,
      uniqueTeams: Array.from(uniqueTeams),
      teamsToCheck: Array.from(teamsToCheck),
      allRatedTeams: Array.from(allRatedTeams)
    });

    // Check if all teams that should be rated have both teacher and student ratings
    const teacherRatedTeams = new Set(teacherRatings.map(r => r.team_id));
    const studentRatedTeams = new Set(studentRatings.map(r => r.team_id));
    
    for (const teamId of teamsToCheck) {
      if (!teacherRatedTeams.has(teamId)) {
        console.log(`Team ${teamId} missing teacher rating`);
        return false;
      }
      if (!studentRatedTeams.has(teamId)) {
        console.log(`Team ${teamId} missing student rating`);
        return false;
      }
    }

    console.log(`areAllTeamsRated(${projectType}): All teams rated!`);
    return true;
  };

  // Calculate marks for a specific project type
  const calculateMarks = async (projectType: string) => {
    if (!semesterId || calculatingProject) return;

    const projectNumber = getProjectNumber(projectType);
    const calculationKey = `${projectType}_${semesterId}`;
    
    try {
      setCalculatingProject(calculationKey);
      setCalculationError(null);

      const response = await fetch('/api/ratings/calculate-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_number: projectNumber,
          semester_id: semesterId,
          admin_id: 'ADMIN_USER' // You might want to pass actual admin ID
        })
      });

      const data = await response.json();

      if (data.success) {
        setCalculationResults(prev => ({
          ...prev,
          [calculationKey]: data.data
        }));
        
        // Show success message
        alert(`✅ Marks calculated successfully for ${getProjectTypeName(projectType)}!\n${data.message}`);
      } else {
        throw new Error(data.message || 'Failed to calculate marks');
      }
    } catch (error: any) {
      console.error('Calculation error:', error);
      setCalculationError(error.message);
      alert(`❌ Failed to calculate marks: ${error.message}`);
    } finally {
      setCalculatingProject(null);
    }
  };

  const voteForProject = async (project: ProjectWithRatingInfo) => {
    if (!project || votingProject) return;

    const voteCount = parseInt(prompt(`How many votes would you like to add for "${project.title}"?`, '5') || '0');
    
    if (!voteCount || voteCount < 1 || voteCount > 50) {
      alert('Please enter a valid number of votes (1-50)');
      return;
    }

    try {
      setVotingProject(project.id);
      setVoteError(null);

      // Get all students
      const adminStudentId = 'T001'; // Assuming admin student ID
      const allStudents = await getAllStudentsAsAdmin(adminStudentId);
      
      // Filter eligible voters (exclude teachers and team members)
      const eligibleStudents = allStudents.filter(student => {
        // Exclude teachers
        if (student.student_id.startsWith('T')) return false;
        
        // Exclude team members (if project has team)
        if (project.team?.members) {
          const teamMemberIds = project.team.members.map((m: any) => m.student_id);
          if (teamMemberIds.includes(student.student_id)) return false;
        }
        
        // Exclude project author
        if (student.student_id === project.student_id) return false;
        
        return true;
      });

      if (eligibleStudents.length === 0) {
        alert('No eligible students found to vote for this project');
        return;
      }

      if (voteCount > eligibleStudents.length) {
        alert(`Cannot create ${voteCount} votes. Only ${eligibleStudents.length} eligible students available.`);
        return;
      }

      // Randomly select students
      const selectedStudents = eligibleStudents
        .sort(() => Math.random() - 0.5)
        .slice(0, voteCount)
        .map(s => s.student_id);

      // Use the bulk voting function
      const result = await voteOnBehalfOfStudents(
        project.id,
        project.project_type as 'midterm' | 'final',
        selectedStudents
      );

      setVoteResults(prev => ({
        ...prev,
        [project.id]: result
      }));

      if (result.success > 0) {
        alert(`✅ Successfully created ${result.success} votes for "${project.title}"!${result.failed > 0 ? `\n⚠️ ${result.failed} votes failed.` : ''}`);
        // Refresh data
        fetchProjectsData();
      } else {
        alert(`❌ Failed to create votes: ${result.errors.join(', ')}`);
      }

    } catch (error: any) {
      console.error('Mass voting error:', error);
      setVoteError(error.message);
      alert(`❌ Failed to create votes: ${error.message}`);
    } finally {
      setVotingProject(null);
    }
  };

  const getProjectNumber = (projectType: string): number => {
    const projectNumberMap = { midterm: 1, final: 2, project3: 3 };
    return projectNumberMap[projectType as keyof typeof projectNumberMap] || 1;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-gray-200 rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Projects</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchProjectsData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Projects Rating Progress</h2>
        <div className="text-sm text-gray-600">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} • {totalStudents} students
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['all', 'midterm', 'final', 'project3'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as typeof activeFilter)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeFilter === filter
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>
                {filter === 'all' 
                  ? 'All Projects'
                  : getProjectTypeName(filter)}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-2">
                {filter === 'all' ? projects.length : projects.filter(p => p.project_type === filter).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Calculate Marks Summary */}
      {activeFilter !== 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">{getProjectTypeName(activeFilter)} - Calculate Final Marks</h3>
                <p className="text-sm text-blue-700">
                  Calculate voting scores and marks for all teams in this project type
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!areAllTeamsRated(activeFilter) && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Not all teams rated yet</span>
                </div>
              )}
              <button
                onClick={() => calculateMarks(activeFilter)}
                disabled={!areAllTeamsRated(activeFilter) || calculatingProject === `${activeFilter}_${semesterId}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  areAllTeamsRated(activeFilter) && calculatingProject !== `${activeFilter}_${semesterId}`
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {calculatingProject === `${activeFilter}_${semesterId}` ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Calculating...</span>
                  </div>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 inline mr-1" />
                    Calculate Marks
                  </>
                )}
              </button>
            </div>
          </div>
          {calculationResults[`${activeFilter}_${semesterId}`] && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 text-sm">
                ✅ Marks calculated successfully! 
                {calculationResults[`${activeFilter}_${semesterId}`].rankings && 
                  ` ${calculationResults[`${activeFilter}_${semesterId}`].rankings.length} teams processed.`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600">
            No projects have been submitted for the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Project Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.project_type || 'midterm')}`}>
                      {getProjectTypeName(project.project_type || 'midterm')}
                    </span>
                  </div>

                  {/* Team/Student Info */}
                  <div className="flex items-center space-x-4 mb-3">
                    {project.team ? (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-600">Team: {project.team.team_name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{project.student_id}</span>
                      </div>
                    )}
                    
                    {/* Submission Date */}
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* GitHub Link */}
                    {project.github_url && (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Github className="w-4 h-4" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {/* View Details Link */}
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Link>

                    {/* Vote Button */}
                    <button
                      onClick={() => voteForProject(project)}
                      disabled={votingProject === project.id}
                      className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Vote className="w-4 h-4" />
                      <span>{votingProject === project.id ? 'Voting...' : 'Add Votes'}</span>
                    </button>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Vote Results */}
                  {voteResults[project.id] && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-green-800 text-sm">
                        ✅ Votes added successfully! 
                        {voteResults[project.id].success > 0 && 
                          ` ${voteResults[project.id].success} votes created.`}
                        {voteResults[project.id].failed > 0 && 
                          ` ${voteResults[project.id].failed} failed.`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rating Progress */}
                <div className="flex items-center space-x-6 ml-6">
                  {/* Student Rating Progress */}
                  <div className="text-center">
                    <div className="flex items-center space-x-1 text-blue-600 mb-1">
                      <Star className="w-4 h-4" />
                      <span className="font-semibold">
                        {project.studentRatingCount}/{project.eligibleVoters}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Students</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (project.studentRatingCount / project.eligibleVoters) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Teacher Rating Status */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {project.hasTeacherRating ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Teacher</div>
                    <div className={`text-xs font-medium mt-1 ${
                      project.hasTeacherRating ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {project.hasTeacherRating ? 'Rated' : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProjectsView;