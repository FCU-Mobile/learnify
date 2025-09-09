import React, { useState, useEffect } from 'react';
import { Clock, FileText, Github, Image, Download, Eye, Trash2, Filter } from 'lucide-react';
import { getSubmissionsForSemester, deleteSubmission, getAllStudents, type Submission } from '../lib/api';
import { useSemester } from '../contexts/SemesterContext';

interface SubmissionsListProps {
  studentId?: string;
  lessonId?: string;
  showFilters?: boolean;
}

const SubmissionsList: React.FC<SubmissionsListProps> = ({
  studentId,
  lessonId,
  showFilters = true
}) => {
  const { selectedSemester } = useSemester();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [students, setStudents] = useState<{student_id: string, full_name: string}[]>([]);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params: { student_id?: string; lesson_id?: string; submission_type?: string } = {};
      
      // For specific student view, always filter by studentId
      // For admin "all submissions" view, use selectedStudent filter instead
      if (studentId && selectedStudent === 'all') {
        params.student_id = studentId;
      } else if (selectedStudent !== 'all') {
        params.student_id = selectedStudent;
      }
      
      if (lessonId) params.lesson_id = lessonId;
      if (selectedType !== 'all') params.submission_type = selectedType;

      const data = await getSubmissionsForSemester(selectedSemester || undefined, params);
      setSubmissions(data.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while fetching submissions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch students list for admin filter (only when no studentId is provided)
  const fetchStudents = async () => {
    if (studentId) return; // Only fetch for admin view
    
    try {
      const students = await getAllStudents();
      setStudents(students.map(s => ({
        student_id: s.student_id,
        full_name: s.full_name
      })));
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchStudents();
  }, [selectedSemester, studentId, lessonId, selectedType, selectedStudent]);

  const getSubmissionIcon = (type: string) => {
    switch (type) {
      case 'screenshot':
        return <Image className="w-5 h-5" />;
      case 'github_repo':
        return <Github className="w-5 h-5" />;
      default:
        return <Image className="w-5 h-5" />;
    }
  };

  const getSubmissionTypeColor = (type: string) => {
    switch (type) {
      case 'screenshot':
        return 'bg-blue-100 text-blue-800';
      case 'github_repo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isImageSubmission = (submission: Submission) => {
    return submission.mime_type?.startsWith('image/') || 
           submission.submission_type === 'screenshot';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (submissionId: number) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      await deleteSubmission(submissionId);
      setSubmissions(submissions.filter(s => s.id !== submissionId));
    } catch (err) {
      alert('Error deleting submission');
    }
  };

  const openFile = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={fetchSubmissions}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Submissions ({submissions.length})
          </h3>
          {showFilters && (
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-500" />
              {!studentId && students.length > 0 && (
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Students</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.full_name} ({student.student_id})
                    </option>
                  ))}
                </select>
              )}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="screenshot">Screenshots</option>
                <option value="github_repo">GitHub Repos</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No submissions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {isImageSubmission(submission) && submission.file_url && !failedImages.has(submission.id) ? (
                        <img
                          src={submission.file_url}
                          alt={submission.title}
                          className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openFile(submission.file_url!)}
                          onError={() => {
                            setFailedImages(prev => new Set([...prev, submission.id]));
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5">
                          {getSubmissionIcon(submission.submission_type)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {submission.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSubmissionTypeColor(submission.submission_type)}`}>
                          {submission.submission_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span className="font-medium">{submission.student_name}</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(submission.created_at)}</span>
                        </span>
                      </div>
                      
                      {submission.description && (
                        <p className="text-sm text-gray-600 mb-2">{submission.description}</p>
                      )}
                      
                      {submission.file_name && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{submission.file_name}</span>
                          {submission.file_size && (
                            <span>({formatFileSize(submission.file_size)})</span>
                          )}
                        </div>
                      )}
                      
                      {submission.github_url && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Github className="w-4 h-4" />
                          <a
                            href={submission.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 truncate"
                          >
                            {submission.github_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {submission.file_url && (
                      <button
                        onClick={() => openFile(submission.file_url!)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="View file"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    
                    {submission.file_url && (
                      <a
                        href={submission.file_url}
                        download={submission.file_name}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    
                    <button
                      onClick={() => handleDelete(submission.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete submission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionsList;