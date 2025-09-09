import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Github, Calendar, User, BookOpen, GraduationCap, Image as ImageIcon, ExternalLink, X, ZoomIn, Heart, Layers } from 'lucide-react';
import { getPublicProjectsForSemester, getProjectVotesForSemester, type Submission, type ProjectWithVotes } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';
import ImageGallery from './ImageGallery';

interface ProjectShowcaseProps {
  filterType?: 'midterm' | 'final' | 'project3' | 'all';
}

const ProjectShowcase: React.FC<ProjectShowcaseProps> = ({ filterType = 'all' }) => {
  const { selectedSemester } = useSemester();
  const [projects, setProjects] = useState<Submission[]>([]);
  const [midtermVotes, setMidtermVotes] = useState<ProjectWithVotes[]>([]);
  const [finalVotes, setFinalVotes] = useState<ProjectWithVotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'midterm' | 'final' | 'project3'>(filterType);

  useEffect(() => {
    fetchProjects();
  }, [selectedSemester]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [projectsData, midtermVotesData, finalVotesData] = await Promise.all([
        getPublicProjectsForSemester(selectedSemester || undefined),
        getProjectVotesForSemester('midterm', selectedSemester || undefined).catch(() => []),
        getProjectVotesForSemester('final', selectedSemester || undefined).catch(() => [])
      ]);
      
      setProjects(projectsData);
      setMidtermVotes(midtermVotesData);
      setFinalVotes(finalVotesData);
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
      case 'project3':
        return <BookOpen className="w-4 h-4" />;
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
      case 'project3':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVoteCount = (projectId: number, projectType: string): number => {
    const votes = projectType === 'midterm' ? midtermVotes : finalVotes;
    const project = votes.find(v => v.submission_id === projectId);
    return project?.vote_count || 0;
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
          {(selectedSemester === 'fall_2025' 
            ? ['all', 'midterm', 'final', 'project3']
            : ['all', 'midterm', 'final']
          ).map((filter) => (
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
                {filter === 'project3' && <Layers className="w-4 h-4" />}
                <span>
                  {filter === 'all' 
                    ? 'All Projects'
                    : filter === 'midterm'
                    ? selectedSemester === 'fall_2025' ? 'Project 1' : 'Midterm Projects'
                    : filter === 'final'
                    ? selectedSemester === 'fall_2025' ? 'Project 2' : 'Final Projects'
                    : filter === 'project3'
                    ? 'Project 3'
                    : `${filter} Projects`}
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
              : activeFilter === 'project3'
              ? 'No Project 3 submissions yet.'
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
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{project.student_id}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-red-500">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-medium">{getVoteCount(project.id, project.project_type || 'midterm')}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getProjectTypeColor(project.project_type || 'midterm')}`}>
                    {getProjectTypeIcon(project.project_type || 'midterm')}
                    <span>
                      {project.project_type === 'midterm' 
                        ? selectedSemester === 'fall_2025' ? 'Project 1' : 'Midterm'
                        : project.project_type === 'final'
                        ? selectedSemester === 'fall_2025' ? 'Project 2' : 'Final'
                        : project.project_type === 'project3'
                        ? 'Project 3'
                        : 'Midterm'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
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