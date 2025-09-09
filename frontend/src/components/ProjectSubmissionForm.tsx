import React, { useState } from 'react';
import { Upload, X, Github, FileText, Image, AlertCircle, BookOpen, GraduationCap, Layers } from 'lucide-react';
import { uploadSubmission, type Submission } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';

interface ProjectSubmissionFormProps {
  studentId: string;
  onUploadSuccess?: (submission: Submission) => void;
}

const ProjectSubmissionForm: React.FC<ProjectSubmissionFormProps> = ({
  studentId,
  onUploadSuccess
}) => {
  const { selectedSemester } = useSemester();
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

      const submission = await uploadSubmission(formData);

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
          disabled={uploading}
          className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {uploading ? 'Submitting Project...' : 'Submit Project'}
        </button>
      </form>
    </div>
  );
};

export default ProjectSubmissionForm;