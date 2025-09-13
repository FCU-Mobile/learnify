import React, { useState, useEffect } from 'react';
import { Star, Users, Eye } from 'lucide-react';

interface StarRatingSummaryProps {
  submissionId: number;
  projectType: 'midterm' | 'final' | 'project3';
  semesterId: string;
  teamId?: number | null;
  projectTitle: string;
}

interface StarData {
  team_id: number;
  stars: number;
  voter_id: string;
}

const StarRatingSummary: React.FC<StarRatingSummaryProps> = ({
  submissionId,
  projectType,
  semesterId,
  teamId,
  projectTitle
}) => {
  const [totalStars, setTotalStars] = useState<number>(0);
  const [starCount, setStarCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [starRatings, setStarRatings] = useState<StarData[]>([]);

  useEffect(() => {
    fetchStarRatings();
  }, [submissionId, projectType, semesterId, teamId]);

  const getProjectNumber = () => {
    const projectNumberMap = { midterm: 1, final: 2, project3: 3 };
    return projectNumberMap[projectType];
  };

  const fetchStarRatings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/ratings/results?project_number=${getProjectNumber()}&semester_id=${semesterId}`);
      const data = await response.json();
      
      if (data.success && data.data.star_ratings) {
        const targetTeamId = teamId || submissionId;
        const projectStarRatings = data.data.star_ratings.filter((rating: StarData) => 
          rating.team_id === targetTeamId
        );
        
        setStarRatings(projectStarRatings);
        
        if (projectStarRatings.length > 0) {
          const total = projectStarRatings.reduce((sum: number, rating: StarData) => sum + rating.stars, 0);
          const count = projectStarRatings.length;
          const average = total / count;
          
          setTotalStars(total);
          setStarCount(count);
          setAverageRating(Math.round(average * 10) / 10); // Round to 1 decimal place
        } else {
          setTotalStars(0);
          setStarCount(0);
          setAverageRating(0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch star ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
        <div className="flex items-center space-x-2">
          <Star className="w-5 h-5 text-yellow-500 animate-pulse" />
          <span className="text-sm text-gray-600">Loading ratings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
      <div className="flex items-center space-x-2 mb-3">
        <Star className="w-5 h-5 text-yellow-500" />
        <h3 className="text-sm font-semibold text-gray-900">Peer Rating Summary</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Stars */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-lg font-bold text-yellow-600">{totalStars}</span>
          </div>
          <p className="text-xs text-gray-600">Total Stars</p>
        </div>

        {/* Number of Votes */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-lg font-bold text-blue-600">{starCount}</span>
          </div>
          <p className="text-xs text-gray-600">Votes</p>
        </div>

        {/* Average Rating */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Eye className="w-4 h-4 text-green-500" />
            <span className="text-lg font-bold text-green-600">
              {starCount > 0 ? averageRating : '--'}
            </span>
          </div>
          <p className="text-xs text-gray-600">Average</p>
        </div>
      </div>

      {starCount > 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>"{projectTitle}"</span>
            <span>{starCount} student{starCount !== 1 ? 's' : ''} rated this project</span>
          </div>
        </div>
      )}

      {starCount === 0 && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <p className="text-xs text-gray-500 text-center">No peer ratings yet</p>
        </div>
      )}

      {/* Visual star representation */}
      {starCount > 0 && (
        <div className="mt-3 flex items-center justify-center space-x-1">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isActive = starValue <= Math.round(averageRating);
            return (
              <Star
                key={starValue}
                className={`w-4 h-4 ${
                  isActive
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            );
          })}
          <span className="ml-2 text-xs text-gray-600">({averageRating}/5)</span>
        </div>
      )}
    </div>
  );
};

export default StarRatingSummary;