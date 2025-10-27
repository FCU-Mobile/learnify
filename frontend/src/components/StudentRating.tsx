import React, { useState, useEffect } from 'react';
import { Star, Users, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { submitStudentRating, getProjectRatings } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { StudentStarRating } from '../lib/api';

interface StudentRatingProps {
  submissionId: number;
  projectType: 'midterm' | 'final';
  semesterId: string;
  teamId?: number | null;
  isOwnProject?: boolean; // Prevent students from rating their own projects
  projectTitle: string;
}

const StudentRating: React.FC<StudentRatingProps> = ({
  submissionId,
  projectType,
  semesterId,
  teamId,
  isOwnProject = false,
  projectTitle
}) => {
  const { studentId } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [existingRating, setExistingRating] = useState<StudentStarRating | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (studentId && !isOwnProject) {
      fetchExistingRating();
    }
  }, [submissionId, studentId, isOwnProject]);

  const fetchExistingRating = async () => {
    try {
      setLoading(true);
      // Get star ratings and find if current student has already rated this project
      const response = await fetch(`/api/ratings/results?project_number=${getProjectNumber()}&semester_id=${semesterId}`);
      const data = await response.json();

      if (data.success && data.data.star_ratings) {
        const userRating = data.data.star_ratings.find((r: any) => {
          // Check voter_id matches
          if (r.voter_id !== studentId) return false;

          // For team projects, match by team_id
          if (teamId) {
            return r.team_id === teamId;
          }
          // For individual projects, match by submission_id
          return r.submission_id === submissionId;
        });

        if (userRating) {
          setExistingRating(userRating);
          setRating(userRating.stars);
        }
      }
    } catch (err) {
      console.error('Failed to fetch existing rating:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProjectNumber = () => {
    const projectNumberMap = { midterm: 1, final: 2 };
    return projectNumberMap[projectType];
  };

  const handleSubmit = async () => {
    if (!studentId || rating < 1 || rating > 5) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const payload: any = {
        project_number: getProjectNumber(),
        stars: rating,
        voter_id: studentId,
        semester_id: semesterId
      };

      console.log('StudentRating: Submitting with semesterId:', semesterId);
      console.log('StudentRating: Full payload:', payload);

      // For Project 1 (Midterm), use teamId. For Project 2 (Final), use submissionId
      if (teamId) {
        payload.team_id = teamId;
      } else {
        payload.submission_id = submissionId;
      }

      const response = await fetch('/api/ratings/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setExistingRating(data.data);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to submit rating');
      }
    } catch (err: any) {
      if (err.message.includes('ALREADY_VOTED')) {
        setError('You have already rated this project');
      } else {
        setError(err.message || 'Failed to submit rating');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarClick = (starValue: number) => {
    if (isOwnProject || existingRating) return;
    setRating(starValue);
  };

  const handleStarHover = (starValue: number) => {
    if (isOwnProject || existingRating) return;
    setHoveredRating(starValue);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  if (isOwnProject) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700">Peer Rating</h3>
        </div>
        <div className="text-center py-6">
          <div className="text-gray-500 mb-2">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>You cannot rate your own team's project</p>
          </div>
        </div>
      </div>
    );
  }

  if (!studentId) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
      <div className="flex items-center space-x-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Peer Rating</h3>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Rate "{projectTitle}" from 1 to 5 stars
          </p>
          
          <div className="flex items-center space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((starValue) => {
              const isActive = starValue <= (hoveredRating || rating);
              const isClickable = !existingRating && !isOwnProject;
              
              return (
                <button
                  key={starValue}
                  onClick={() => handleStarClick(starValue)}
                  onMouseEnter={() => handleStarHover(starValue)}
                  onMouseLeave={handleStarLeave}
                  disabled={!isClickable || loading || submitting}
                  className={`p-1 transition-all duration-200 ${
                    isClickable && !loading && !submitting 
                      ? 'cursor-pointer hover:scale-110' 
                      : 'cursor-default'
                  }`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors duration-200 ${
                      isActive
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200 hover:fill-yellow-200 hover:text-yellow-200'
                    }`}
                  />
                </button>
              );
            })}
            
            <div className="ml-4 text-sm text-gray-600">
              {rating > 0 && (
                <span className="font-medium text-blue-600">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Rating quality indicators */}
          <div className="grid grid-cols-5 gap-1 text-center text-xs mb-4">
            <div className={`p-2 rounded ${rating === 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
              Poor
            </div>
            <div className={`p-2 rounded ${rating === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
              Fair
            </div>
            <div className={`p-2 rounded ${rating === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
              Good
            </div>
            <div className={`p-2 rounded ${rating === 4 ? 'bg-lime-100 text-lime-700' : 'bg-gray-100 text-gray-400'}`}>
              Great
            </div>
            <div className={`p-2 rounded ${rating === 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              Excellent
            </div>
          </div>
        </div>

        {existingRating && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-700">
              You rated this project <span className="font-semibold">{existingRating.star_rating} stars</span>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-700">Rating submitted successfully!</p>
          </div>
        )}

        {!existingRating && (
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || rating === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
              submitting || loading || rating === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Rating'}</span>
          </button>
        )}

        <div className="text-xs text-gray-500 text-center">
          <p>Your rating helps determine voting scores for this project</p>
        </div>
      </div>
    </div>
  );
};

export default StudentRating;