import React, { useState, useEffect } from 'react';
import { Upload, X, Github, FileText, Image, AlertCircle, BookOpen, GraduationCap, Layers, Users, CheckCircle } from 'lucide-react';
import { uploadSubmission, getStudentTeam, getTeamSubmissionStatus, type Submission, type ProjectTeam, type TeamSubmissionStatus } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';

interface ProjectSubmissionFormProps {
  studentId: string;
  onUploadSuccess?: (submission: Submission) => void;
}

const ProjectSubmissionForm: React.FC<ProjectSubmissionFormProps> = ({
  studentId,
  onUploadSuccess
}) => {
  const { selectedSemester, availableSemesters } = useSemester();
  const isFallSemester = selectedSemester === 'fall_2025';
  
  // For Fall semester, support 3 projects; for Summer, support 2 projects
  const [projectType, setProjectType] = useState<'midterm' | 'final' | 'project3'>(
    isFallSemester ? 'midterm' : 'midterm'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [studentTeam, setStudentTeam] = useState<ProjectTeam | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSubmissionStatus, setTeamSubmissionStatus] = useState<TeamSubmissionStatus | null>(null);
  const [loadingSubmissionStatus, setLoadingSubmissionStatus] = useState(false);

  // Load team information and submission status when project type changes
  useEffect(() => {
    const loadTeamAndSubmissionInfo = async () => {
      if (selectedSemester && availableSemesters.length > 0) {
        setLoadingTeam(true);
        setLoadingSubmissionStatus(true);
        
        try {
          // Get the actual semester ID from availableSemesters
          const currentSemester = availableSemesters.find(s => s.code === selectedSemester);
          if (!currentSemester) {
            console.error('Current semester not found in available semesters');
            return;
          }
          
          const semesterId = currentSemester.id;
          
          // Load team submission status (works for both team and individual students)
          const submissionStatus = await getTeamSubmissionStatus(studentId, projectType, semesterId);
          setTeamSubmissionStatus(submissionStatus);
          
          // For Fall semester, also load team information
          if (isFallSemester) {
            const projectNumberMap: { [key: string]: number } = {
              'midterm': 1,
              'final': 2,
              'project3': 3
            };
            
            const projectNumber = projectNumberMap[projectType];
            if (projectNumber) {
              const team = await getStudentTeam(studentId, semesterId, projectNumber);
              setStudentTeam(team);
            }
          }
        } catch (error) {
          console.error('Failed to load team and submission info:', error);
          setStudentTeam(null);
          setTeamSubmissionStatus(null);
        } finally {
          setLoadingTeam(false);
          setLoadingSubmissionStatus(false);
        }
      }
    };

    loadTeamAndSubmissionInfo();
  }, [projectType, studentId, isFallSemester, selectedSemester, availableSemesters]);

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: File[] = [];
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please upload images or documents only.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles) {
      handleFileSelect(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      handleFileSelect(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    if (!githubUrl.trim()) {
      setError('GitHub repository URL is required');
      return;
    }

    // Validate GitHub URL
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubRegex.test(githubUrl.trim())) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('submission_type', 'project');
      formData.append('project_type', projectType);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('github_url', githubUrl.trim());
      formData.append('is_public', 'true'); // Projects are always public
      
      // Add all files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      formData.append('file_count', files.length.toString());

      const submission = await uploadSubmission(formData, selectedSemester || undefined);

      // Reset form
      setTitle('');
      setDescription('');
      setGithubUrl('');
      setFiles([]);
      setProjectType('midterm');
      
      if (onUploadSuccess) {
        onUploadSuccess(submission);
      }
    } catch (err) {
      setError('Failed to submit project. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getProjectTypeIcon = (type: 'midterm' | 'final' | 'project3') => {
    switch (type) {
      case 'midterm':
        return <BookOpen className="w-5 h-5" />;
      case 'final':
        return <GraduationCap className="w-5 h-5" />;
      case 'project3':
        return <Layers className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // Check if the current project type has been submitted
  const isProjectSubmitted = () => {
    return teamSubmissionStatus && (teamSubmissionStatus.hasTeamSubmitted || teamSubmissionStatus.hasIndividualSubmitted);
  };

  // Get existing submission details
  const getExistingSubmission = () => {
    return teamSubmissionStatus?.submission;
  };

  // Check if form should be disabled (Fall semester without team assignment)
  const isFormDisabled = () => {
    return isFallSemester && !loadingTeam && !studentTeam;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Submit Project</h3>
        <p className="text-gray-600 mt-1">
          {isFallSemester 
            ? 'Submit your project to share with the class (Fall semester: 3 projects total)'
            : 'Submit your midterm or final project to share with the class'
          }
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Project Type
          </label>
          <div className={`grid gap-3 ${isFallSemester ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {(isFallSemester 
              ? ['midterm', 'final', 'project3'] as const
              : ['midterm', 'final'] as const
            ).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setProjectType(type)}
                className={`p-4 border rounded-lg flex items-center justify-center space-x-3 transition-all ${
                  projectType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {getProjectTypeIcon(type)}
                <span className="font-medium">
                  {type === 'midterm' 
                    ? isFallSemester ? 'Project 1' : 'Midterm Project'
                    : type === 'final'
                    ? isFallSemester ? 'Project 2' : 'Final Project'
                    : 'Project 3'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Team Information (Fall semester only for team projects) */}
        {isFallSemester && (projectType === 'midterm' || projectType === 'final' || projectType === 'project3') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Team Project</h4>
            </div>
            
            {loadingTeam ? (
              <p className="text-sm text-blue-600">Loading team information...</p>
            ) : studentTeam ? (
              <div className="space-y-2">
                <p className="text-sm text-blue-700">
                  <strong>Team:</strong> {studentTeam.team_name}
                </p>
                <div className="text-sm text-blue-700">
                  <strong>Team Members:</strong> {studentTeam.member_count} members
                  <ul className="mt-1 ml-4 list-disc">
                    {studentTeam.members?.map((member) => (
                      <li key={member.student_id}>
                        {member.full_name} ({member.student_id})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-100 border border-blue-300 rounded p-3 mt-2">
                  <p className="text-xs font-medium text-blue-800">
                    Team Submission Rules:
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Only one submission per team is required</li>
                    <li>• Any team member can submit the project</li>
                    <li>• All team members will receive the same score</li>
                    <li>• Any team member can modify the submission</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-2">
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ Team Assignment Required
                </p>
                <p className="text-sm text-orange-700">
                  You are not currently assigned to a team for this project.
                </p>
                <p className="text-xs text-orange-600">
                  The submission form is disabled until you are assigned to a team. Contact your instructor for team assignment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submission Status - Show if project has already been submitted */}
        {isProjectSubmitted() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">
                {teamSubmissionStatus?.hasTeamSubmitted ? 'Team Project Already Submitted' : 'Project Already Submitted'}
              </h4>
            </div>
            
            {loadingSubmissionStatus ? (
              <p className="text-sm text-green-600">Loading submission status...</p>
            ) : (
              <div className="space-y-2">
                {teamSubmissionStatus?.submission && (
                  <div>
                    <p className="text-sm text-green-700">
                      <strong>Title:</strong> {teamSubmissionStatus.submission.title}
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Submitted by:</strong> {teamSubmissionStatus.submission.student_name}
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Submitted on:</strong> {new Date(teamSubmissionStatus.submission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {teamSubmissionStatus?.hasTeamSubmitted && teamSubmissionStatus.team && (
                  <div className="bg-green-100 border border-green-300 rounded p-3 mt-2">
                    <p className="text-xs font-medium text-green-800">
                      Team: {teamSubmissionStatus.team.team_name}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Any team member can still edit this submission if needed.
                    </p>
                  </div>
                )}
                
                <div className="bg-green-100 border border-green-300 rounded p-3 mt-2">
                  <p className="text-xs font-medium text-green-800">
                    {teamSubmissionStatus?.hasTeamSubmitted ? 'Team Submission Complete' : 'Submission Complete'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    You cannot submit a new project for this category, but you can edit the existing submission.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show form fields only if project hasn't been submitted yet */}
        {!isProjectSubmitted() && (
          <div className={`${isFormDisabled() ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your project title"
                required
              />
            </div>

        {/* Project Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your project, technologies used, features implemented, etc."
          />
        </div>

        {/* GitHub Repository URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository URL *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Github className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://github.com/username/project-name"
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Make sure your repository is public so others can view your project
          </p>
        </div>

        {/* Screenshots Upload (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screenshots (Optional)
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Add screenshots to showcase your project
          </p>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <div className="space-y-2">
              <p className="text-gray-600">
                Drag and drop screenshots here, or{' '}
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                  browse files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500">
                Supports images, PDFs, and documents (max 10MB each)
              </p>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

            {/* Public Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Public Submission
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Your project will be visible to all students in the class to encourage learning and collaboration.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || isFormDisabled()}
              className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
                uploading || isFormDisabled()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading 
                ? 'Submitting Project...' 
                : isFormDisabled()
                  ? 'Team Assignment Required'
                : studentTeam 
                  ? `Submit Team Project (${studentTeam.team_name})`
                  : 'Submit Project'
              }
            </button>
          </div>
        )}

        {/* Show detailed submission info when project is already submitted */}
        {isProjectSubmitted() && teamSubmissionStatus?.submission && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-gray-900">Submission Complete</h4>
              </div>
              
              {/* Submission Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Project Title:</label>
                  <p className="text-sm text-gray-900 mt-1">{teamSubmissionStatus.submission.title}</p>
                </div>
                
                {teamSubmissionStatus.submission.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description:</label>
                    <p className="text-sm text-gray-900 mt-1">{teamSubmissionStatus.submission.description}</p>
                  </div>
                )}

                {teamSubmissionStatus.submission.github_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">GitHub Repository:</label>
                    <a 
                      href={teamSubmissionStatus.submission.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm mt-1 block"
                    >
                      {teamSubmissionStatus.submission.github_url}
                    </a>
                  </div>
                )}

                {/* Team Information for Fall Semester */}
                {isFallSemester && teamSubmissionStatus.team && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Team Information:</label>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-900">
                        <strong>Team:</strong> {teamSubmissionStatus.team.team_name}
                      </p>
                      {studentTeam?.members && (
                        <div className="text-sm text-gray-900">
                          <strong>Members:</strong>
                          <ul className="ml-4 list-disc mt-1">
                            {studentTeam.members.map((member) => (
                              <li key={member.student_id}>
                                {member.full_name} ({member.student_id})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted:</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(teamSubmissionStatus.submission.created_at).toLocaleDateString()} at{' '}
                    {new Date(teamSubmissionStatus.submission.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="text-center pt-4">
                <button
                  type="button"
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    // TODO: Navigate to edit page or show edit form
                    alert(`Edit submission: ${teamSubmissionStatus.submission?.title}`);
                  }}
                >
                  Edit Submission
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProjectSubmissionForm;