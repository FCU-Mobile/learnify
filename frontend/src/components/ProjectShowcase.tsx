import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Calendar, User, Users, BookOpen, GraduationCap, Image as ImageIcon, ExternalLink, X, ZoomIn, Heart, Layers, Star, CheckCircle, Clock } from 'lucide-react';
import { getPublicProjectsForSemester, getProjectVotesForSemester, type Submission, type ProjectWithVotes } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';
import ImageGallery from './ImageGallery';

interface ProjectShowcaseProps {
  filterType?: 'midterm' | 'final' | 'all';
}

const ProjectShowcase: React.FC<ProjectShowcaseProps> = ({ filterType = 'all' }) => {
  const { selectedSemester } = useSemester();
  const [projects, setProjects] = useState<Submission[]>([]);
  const [midtermVotes, setMidtermVotes] = useState<ProjectWithVotes[]>([]);
  const [finalVotes, setFinalVotes] = useState<ProjectWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'midterm' | 'final'>(filterType);
  const [starRatingsData, setStarRatingsData] = useState<{[key: string]: any[]}>({});
  const [teacherRatingsData, setTeacherRatingsData] = useState<{[key: string]: any[]}>({});
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [studentOnlyCount, setStudentOnlyCount] = useState<number>(0);

  useEffect(() => {
    fetchProjects();
  }, [selectedSemester]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const promises: Promise<any>[] = [
        getPublicProjectsForSemester(selectedSemester || undefined),
        getProjectVotesForSemester('midterm', selectedSemester || undefined).catch(() => []),
        getProjectVotesForSemester('final', selectedSemester || undefined).catch(() => [])
      ];

      // For fall semester, also fetch rating data and total students
      if (selectedSemester === 'fall_2025') {
        // First get the actual semester UUID
        const semesterUuidPromise = fetch('/api/semesters').then(async res => {
          const data = await res.json();
          const fallSemester = data.data?.semesters?.find((s: any) => s.code === 'fall_2025');
          console.log('Semester lookup:', { data, fallSemester, uuid: fallSemester?.id });
          return fallSemester?.id || 'fall_2025'; // fallback to code if UUID not found
        }).catch(() => 'fall_2025');
        
        promises.push(
          semesterUuidPromise.then(semesterId => 
            fetch(`/api/ratings/results?project_number=1&semester_id=${semesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
          ),
          semesterUuidPromise.then(semesterId => 
            fetch(`/api/ratings/results?project_number=2&semester_id=${semesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
          ),
          semesterUuidPromise.then(semesterId => 
            fetch(`/api/ratings/results?project_number=3&semester_id=${semesterId}`).then(res => res.json()).catch(() => ({ success: false, data: {} }))
          ),
          // Fetch total students
          fetch(`/api/leaderboard?semester=fall_2025`).then(res => res.json()).catch(() => ({ success: false, data: { leaderboard: [] } }))
        );
      }

      const results = await Promise.all(promises);
      const [projectsData, midtermVotesData, finalVotesData, ...ratingResults] = results;
      
      // projectsData, midtermVotesData, finalVotesData are arrays from API functions
      setProjects(projectsData as Submission[]);
      setMidtermVotes(midtermVotesData as ProjectWithVotes[]);
      setFinalVotes(finalVotesData as ProjectWithVotes[]);

      if (selectedSemester === 'fall_2025' && ratingResults.length >= 3) {
        const [project1Ratings, project2Ratings, leaderboardData] = ratingResults;

        // Process star ratings (2-project system)
        const starRatings: {[key: string]: any[]} = {};
        if (project1Ratings.success && project1Ratings.data.star_ratings) {
          starRatings['midterm'] = project1Ratings.data.star_ratings;
        }
        if (project2Ratings.success && project2Ratings.data.star_ratings) {
          starRatings['final'] = project2Ratings.data.star_ratings;
        }
        setStarRatingsData(starRatings);

        // Process teacher ratings (2-project system)
        const teacherRatings: {[key: string]: any[]} = {};
        if (project1Ratings.success && project1Ratings.data.teacher_ratings) {
          teacherRatings['midterm'] = project1Ratings.data.teacher_ratings;
        }
        if (project2Ratings.success && project2Ratings.data.teacher_ratings) {
          teacherRatings['final'] = project2Ratings.data.teacher_ratings;
        }
        console.log('Teacher ratings data loaded:', teacherRatings);
        setTeacherRatingsData(teacherRatings);

        // Set total students and filter out teachers/admins
        if (leaderboardData.success && leaderboardData.data.leaderboard) {
          const allStudents = leaderboardData.data.leaderboard;
          setTotalStudents(allStudents.length);
          // Filter out teachers (assuming teachers have specific roles or identifiers)
          // For now, only filter out teachers with student_id starting with 'T'
          const studentsOnly = allStudents.filter((student: any) => 
            !student.student_id?.startsWith('T')
          );
          setStudentOnlyCount(studentsOnly.length);
        }
      }
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (activeFilter === 'all') return true;
    return project.project_type === activeFilter;
  });

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'midterm':
        return <BookOpen className="w-4 h-4" />;
      case 'final':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'midterm':
        return 'bg-blue-100 text-blue-800';
      case 'final':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVoteCount = (projectId: number, projectType: string): number => {
    const votes = projectType === 'midterm' ? midtermVotes : finalVotes;
    const project = votes.find(v => v.submission_id === projectId);
    return project?.vote_count || 0;
  };

  const getEligibleVoters = (project: Submission): number => {
    // For team projects, we need to get the actual team size
    // If members array is empty but we have a team, we need to determine the team size differently
    let teamMemberCount = 1; // default for solo projects
    
    if (project.team && project.team.members && project.team.members.length > 0) {
      // Use actual member count if available
      teamMemberCount = project.team.members.length;
    } else if (project.team) {
      // If we have a team but no members data, assume it's a 3-person team for fall semester
      teamMemberCount = 3;
    }
    
    const eligibleVoters = studentOnlyCount - teamMemberCount;
    
    
    return eligibleVoters;
  };

  const getStarRatingCount = (projectId: number, projectType: string, starRatings: {[key: string]: any[]}, projectsData: Submission[]): number => {
    if (selectedSemester !== 'fall_2025' || !starRatings[projectType]) {
      return 0;
    }

    const project = projectsData.find(p => p.id === projectId);
    const projectRatings = starRatings[projectType].filter((rating: any) => {
      // For team projects (Project 1/Midterm), match by team_id
      if (project?.team?.team_id) {
        return rating.team_id === project.team.team_id;
      }
      // For individual projects (Project 2/Final), match by submission_id
      return rating.submission_id === projectId;
    });

    return projectRatings.length;
  };

  const hasTeacherRating = (projectId: number, projectType: string, teacherRatings: {[key: string]: any[]}, projectsData: Submission[]): boolean => {
    if (selectedSemester !== 'fall_2025' || !teacherRatings[projectType]) {
      return false;
    }

    const project = projectsData.find(p => p.id === projectId);

    return teacherRatings[projectType].some((rating: any) => {
      // For team projects (Project 1/Midterm), match by team_id
      if (project?.team?.team_id) {
        return rating.team_id === project.team.team_id;
      }
      // For individual projects (Project 2/Final), match by submission_id
      return rating.submission_id === projectId;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load projects</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['all', 'midterm', 'final']).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as typeof activeFilter)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeFilter === filter
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {filter === 'midterm' && <BookOpen className="w-4 h-4" />}
                {filter === 'final' && <GraduationCap className="w-4 h-4" />}
                <span>
                  {filter === 'all'
                    ? 'All Projects'
                    : filter === 'midterm'
                    ? selectedSemester === 'fall_2025' ? 'Project 1 (Team)' : 'Midterm Projects'
                    : selectedSemester === 'fall_2025' ? 'Project 2 (Individual)' : 'Final Projects'}
                </span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {filter === 'all' ? projects.length : projects.filter(p => p.project_type === filter).length}
                </span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600">
            {activeFilter === 'all' 
              ? 'No projects have been submitted yet.'
              : activeFilter === 'midterm'
              ? selectedSemester === 'fall_2025' ? 'No Project 1 submissions yet.' : 'No midterm projects have been submitted yet.'
              : activeFilter === 'final'
              ? selectedSemester === 'fall_2025' ? 'No Project 2 submissions yet.' : 'No final projects have been submitted yet.'
              : `No ${activeFilter} projects have been submitted yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Project Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-2">
                        {project.team ? (
                          <>
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-gray-600">
                              Team: {project.team.team_name}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{project.student_id}</span>
                          </>
                        )}
                      </div>
                      {selectedSemester === 'fall_2025' ? (
                        <div className="flex items-center space-x-3">
                          {/* Student Rating Count */}
                          <div className="flex items-center space-x-1 text-blue-500">
                            <Star className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {getStarRatingCount(project.id, project.project_type || 'midterm', starRatingsData, projects)}/{getEligibleVoters(project)}
                            </span>
                          </div>
                          
                          {/* Teacher Rating Status */}
                          <div className="flex items-center">
                            {hasTeacherRating(project.id, project.project_type || 'midterm', teacherRatingsData, projects) ? (
                              <span className="text-sm">✅</span>
                            ) : (
                              <Clock className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-500">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm font-medium">{getVoteCount(project.id, project.project_type || 'midterm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.project_type || 'midterm')}`}>
                    {getProjectTypeIcon(project.project_type || 'midterm')}
                    <span>
                      {project.project_type === 'midterm'
                        ? selectedSemester === 'fall_2025' ? 'Project 1 (Team)' : 'Midterm'
                        : selectedSemester === 'fall_2025' ? 'Project 2 (Individual)' : 'Final'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                )}

                {/* Team Members */}
                {project.team && project.team.members && project.team.members.length > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        Team Members ({project.team.members.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.team.members.map((member, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                        >
                          {typeof member === 'string' ? member : `${member.full_name} (${member.student_id})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* GitHub Link */}
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mb-4"
                  >
                    <Github className="w-4 h-4" />
                    <span>View Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Screenshots Preview */}
                {((project.files && project.files.length > 0) || project.file_url) && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Screenshots
                        {project.files && project.files.length > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({project.files.length})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* Multiple Screenshots or Single Screenshot */}
                    {project.files && project.files.length > 0 ? (
                      <div className="max-w-xs">
                        <ImageGallery files={project.files} projectTitle={project.title} />
                      </div>
                    ) : project.file_url ? (
                      /* Fallback for backward compatibility */
                      <div className="relative group">
                        <img
                          src={project.file_url}
                          alt={`${project.title} screenshot`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => window.open(project.file_url, '_blank')}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        
                        {/* Fallback for non-image files or load errors */}
                        <div className="hidden w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <ImageIcon className="w-4 h-4 mx-auto" />
                          </div>
                        </div>
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white bg-opacity-90 rounded-full p-1">
                            <ExternalLink className="w-3 h-3 text-gray-700" />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                  
                  <Link
                    to={`/projects/${project.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default ProjectShowcase;