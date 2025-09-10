import React from 'react';
import type { ProjectTeam } from '../lib/api';

interface TeamCardProps {
  team: ProjectTeam;
  onEdit?: (team: ProjectTeam) => void;
  onDelete?: (teamId: number) => void;
  isLoading?: boolean;
  showActions?: boolean;
}

const TeamCard: React.FC<TeamCardProps> = ({
  team,
  onEdit,
  onDelete,
  isLoading = false,
  showActions = true
}) => {
  const handleEdit = () => {
    if (onEdit) {
      onEdit(team);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(`Are you sure you want to delete ${team.team_name}? This action cannot be undone.`)) {
      onDelete(team.team_id);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${isLoading ? 'opacity-50' : ''}`}>
      {/* Team Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-users text-white text-sm"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{team.team_name}</h3>
            <p className="text-sm text-gray-500">{team.member_count} members</p>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={handleEdit}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit team"
              >
                <i className="fas fa-edit"></i>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete team"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Team Members */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Team Members:</h4>
        <div className="space-y-1">
          {team.members.map((member, index) => (
            <div key={member.student_id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {member.student_id.substring(0, 2)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">{member.student_id}</span>
              </div>
              <span className="text-xs text-gray-500">
                #{index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Stats */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Created: {new Date(team.created_at).toLocaleDateString()}</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              team.member_count >= 3 && team.member_count <= 4 
                ? 'bg-green-500' 
                : 'bg-yellow-500'
            }`}></div>
            <span className={
              team.member_count >= 3 && team.member_count <= 4 
                ? 'text-green-600' 
                : 'text-yellow-600'
            }>
              {team.member_count >= 3 && team.member_count <= 4 ? 'Valid Size' : 'Invalid Size'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCard;