import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import ProjectSubmissionForm from '../components/ProjectSubmissionForm';
import ProjectShowcase from '../components/ProjectShowcase';
import { Upload, Grid3X3, Plus } from 'lucide-react';

const ProjectsPage: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const isSummerSemester = selectedSemester === 'summer_2025';
  const [activeTab, setActiveTab] = useState<'showcase' | 'submit'>('showcase');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmissionSuccess = () => {
    // Refresh the showcase and switch to it
    setRefreshKey(prev => prev + 1);
    setActiveTab('showcase');
  };

  if (!studentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to view projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">
            Showcase your midterm and final projects, and explore what your classmates have built
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('showcase')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'showcase'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Grid3X3 className="w-4 h-4" />
                  <span>Project Showcase</span>
                </div>
              </button>
              {!isSummerSemester && (
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'submit'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Submit Project</span>
                  </div>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'showcase' ? (
            <div>
              {/* Showcase Header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Class Projects</h2>
                <p className="text-gray-600">
                  Explore projects submitted by your classmates. Get inspired and learn from their implementations!
                </p>
              </div>
              
              <ProjectShowcase key={refreshKey} />
            </div>
          ) : (
            <div>
              {/* Submit Header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Submit Your Project</h2>
                <p className="text-gray-600">
                  Share your midterm or final project with the class. Include your GitHub repository and optional screenshots.
                </p>
              </div>
              
              <div className="max-w-2xl">
                <ProjectSubmissionForm
                  studentId={studentId}
                  onUploadSuccess={handleSubmissionSuccess}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        {activeTab === 'submit' && (
          <div className="mt-8 max-w-2xl">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-3">📚 Submission Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Make sure your GitHub repository is public so everyone can view your code</li>
                <li>• Include a detailed README.md with setup instructions and project description</li>
                <li>• Add screenshots to showcase your app's UI and functionality</li>
                <li>• Consider adding a demo video or GIF to show your app in action</li>
                <li>• Tag your repository with relevant topics (swift, swiftui, ios, etc.)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;