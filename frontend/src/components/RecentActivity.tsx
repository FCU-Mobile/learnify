import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getStudentCheckIns, getStudentReviews } from '../lib/api';

interface ActivityItem {
  id: string;
  type: 'check-in' | 'review' | 'quiz' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  points?: number;
}

const RecentActivity: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester } = useSemester();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isFallSemester = selectedSemester === 'fall_2025';

  useEffect(() => {
    const fetchActivities = async () => {
      if (!studentId) return;

      try {
        setIsLoading(true);
        const activityList: ActivityItem[] = [];

        // Fetch check-ins (hide for Fall semester)
        if (!isFallSemester) {
          const checkIns = await getStudentCheckIns(studentId);
          checkIns.slice(0, 3).forEach((checkIn, index) => {
            activityList.push({
              id: `checkin-${index}`,
              type: 'check-in',
              title: 'Daily check-in completed',
              description: '+10 points',
              timestamp: checkIn.created_at,
              points: 10
            });
          });
        }

        // Fetch reviews
        try {
          const reviewsData = await getStudentReviews(studentId);
          reviewsData.data.reviews.slice(0, 2).forEach((review, index) => {
            activityList.push({
              id: `review-${index}`,
              type: 'review',
              title: `App review submitted: ${review.mobile_app_name}`,
              description: '+10 points',
              timestamp: review.created_at,
              points: 10
            });
          });
        } catch (error) {
          console.log('No reviews found');
        }

        // Sort by timestamp (most recent first)
        activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setActivities(activityList.slice(0, 4)); // Show only the 4 most recent
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [studentId, selectedSemester]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return activityTime.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check-in':
        return { icon: 'fas fa-check', bgColor: 'bg-green-100', textColor: 'text-green-600' };
      case 'review':
        return { icon: 'fas fa-mobile-alt', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
      case 'quiz':
        return { icon: 'fas fa-question', bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
      case 'achievement':
        return { icon: 'fas fa-trophy', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' };
      default:
        return { icon: 'fas fa-circle', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const iconConfig = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`w-8 h-8 ${iconConfig.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <i className={`${iconConfig.icon} ${iconConfig.textColor} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.title}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.description} • {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-clock text-gray-400 text-xl"></i>
            </div>
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">Start by checking in or submitting a review!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity; 