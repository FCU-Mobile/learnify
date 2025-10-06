import React, { useState, useEffect } from 'react';
import { Star, Award, Save, AlertCircle } from 'lucide-react';
import { submitTeacherRating, getProjectRatings } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { TeacherRating as TeacherRatingType } from '../lib/api';

interface TeacherRatingProps {
  submissionId: number;
  projectType: 'midterm' | 'final';
  semesterId: string;
  teamId?: number | null;
}

const TeacherRating: React.FC<TeacherRatingProps> = ({
  submissionId,
  projectType,
  semesterId,
  teamId
}) => {
  const { studentId, isAdmin } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [existingRating, setExistingRating] = useState<TeacherRatingType | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchExistingRating();
    }
  }, [submissionId, isAdmin, projectType, semesterId, teamId]);

  const fetchExistingRating = async () => {
    try {
      setLoading(true);
      const ratings = await getProjectRatings(projectType, semesterId);
      // Find rating for this team/submission
      const teacherRating = teamId
        ? ratings.find(r => r.team_id === teamId)
        : ratings.find(r => r.submission_id === submissionId); // For individual Project 2
      if (teacherRating) {
        setExistingRating(teacherRating);
        setRating(teacherRating.teacher_rating);
      } else {
        // Reset rating if no existing rating found
        setExistingRating(null);
        setRating(0);
      }
    } catch (err) {
      console.error('Failed to fetch existing rating:', err);
      // Reset on error
      setExistingRating(null);
      setRating(0);
    } finally {
      setLoading(false);
    }
  };

  // Get max score based on project type
  const getMaxScore = () => {
    return projectType === 'midterm' ? 40 : 50; // Project 1: 40%, Project 2: 50%
  };

  const maxScore = getMaxScore();

  const handleSubmit = async () => {
    if (!studentId || rating < 0 || rating > maxScore) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Map project type to project number
      const projectNumberMap = { midterm: 1, final: 2 };
      const projectNumber = projectNumberMap[projectType];

      // For Project 1 (Midterm), use teamId. For Project 2 (Final), use submissionId
      const newRating = await submitTeacherRating(
        teamId || null,
        submissionId,
        projectNumber,
        rating,
        studentId,
        semesterId
      );

      setSuccess(true);
      setExistingRating(newRating);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
      <div className="flex items-center space-x-2 mb-4">
        <Award className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Teacher Rating</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {projectType === 'midterm' ? 'Project 1 Score (0-40)' : 'Project 2 Score (0-50)'}
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max={maxScore}
              step="0.5"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(rating / maxScore) * 100}%, #e5e7eb ${(rating / maxScore) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="w-20 text-center">
              <span className="text-2xl font-bold text-purple-600">{rating}</span>
            </div>
          </div>
        </div>

        {/* Visual indicator */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{(maxScore * 0.25).toFixed(0)}</span>
          <span>{(maxScore * 0.5).toFixed(0)}</span>
          <span>{(maxScore * 0.75).toFixed(0)}</span>
          <span>{maxScore}</span>
        </div>

        {/* Quality indicators */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className={`p-2 rounded ${rating <= maxScore * 0.25 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
            <div className="text-xs font-medium">Poor</div>
            <div className="text-xs">0-{(maxScore * 0.25).toFixed(0)}</div>
          </div>
          <div className={`p-2 rounded ${rating > maxScore * 0.25 && rating <= maxScore * 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
            <div className="text-xs font-medium">Fair</div>
            <div className="text-xs">{(maxScore * 0.25).toFixed(0)}-{(maxScore * 0.5).toFixed(0)}</div>
          </div>
          <div className={`p-2 rounded ${rating > maxScore * 0.5 && rating <= maxScore * 0.75 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            <div className="text-xs font-medium">Good</div>
            <div className="text-xs">{(maxScore * 0.5).toFixed(0)}-{(maxScore * 0.75).toFixed(0)}</div>
          </div>
          <div className={`p-2 rounded ${rating > maxScore * 0.75 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            <div className="text-xs font-medium">Excellent</div>
            <div className="text-xs">{(maxScore * 0.75).toFixed(0)}-{maxScore}</div>
          </div>
        </div>

        {existingRating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              Previous rating: <span className="font-semibold">{existingRating.teacher_rating}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">Rating saved successfully!</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            saving || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : existingRating ? 'Update Rating' : 'Save Rating'}</span>
        </button>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default TeacherRating;