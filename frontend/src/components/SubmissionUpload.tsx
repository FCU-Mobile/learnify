import React, { useState } from 'react';
import { Upload, X, Github, FileText, Image, AlertCircle } from 'lucide-react';
import { uploadSubmission, type Submission } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';

interface SubmissionUploadProps {
  studentId: string;
  lessonId?: string;
  onUploadSuccess?: (submission: Submission) => void;
}

const SubmissionUpload: React.FC<SubmissionUploadProps> = ({
  studentId,
  lessonId,
  onUploadSuccess
}) => {
  const { selectedSemester } = useSemester();
  const [submissionType, setSubmissionType] = useState<'screenshot' | 'github_repo'>('screenshot');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
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

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload images or documents only.');
      return;
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    
    // Auto-set title if not provided
    if (!title) {
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExtension);
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

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (submissionType === 'github_repo' && !githubUrl.trim()) {
      setError('GitHub URL is required for repository submissions');
      return;
    }

    if (submissionType === 'screenshot' && !file) {
      setError('File is required for this submission type');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('student_id', studentId);
      formData.append('submission_type', submissionType);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (githubUrl.trim()) formData.append('github_url', githubUrl.trim());
      if (lessonId) formData.append('lesson_id', lessonId);
      if (file) formData.append('file', file);

      const submission = await uploadSubmission(formData, selectedSemester || undefined);

      // Reset form
      setTitle('');
      setDescription('');
      setGithubUrl('');
      setFile(null);
      setSubmissionType('screenshot');
      
      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(submission);
      }
    } catch (err) {
      setError('Network error while uploading submission');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  const getSubmissionTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <Image className="w-5 h-5" />;
      case 'github_repo':
        return <Github className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Submission</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Submission Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Submission Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['screenshot', 'github_repo'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSubmissionType(type)}
                className={`p-3 border rounded-lg flex items-center justify-center space-x-2 transition-all ${
                  submissionType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {getSubmissionTypeIcon(type)}
                <span className="text-sm font-medium capitalize">
                  {type.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter submission title"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description"
          />
        </div>

        {/* GitHub URL (for github_repo type) */}
        {submissionType === 'github_repo' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://github.com/username/repository"
              required
            />
          </div>
        )}

        {/* File Upload (for screenshot type) */}
        {submissionType === 'screenshot' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File *
            </label>
            
            {!file ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your file here, or{' '}
                  <label className="text-blue-600 hover:text-blue-800 cursor-pointer">
                    browse
                    <input
                      type="file"
                      onChange={handleFileInputChange}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-sm text-gray-500">
                  Supports images, PDFs, and documents (max 10MB)
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        <Image className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload Submission'}
        </button>
      </form>
    </div>
  );
};

export default SubmissionUpload;