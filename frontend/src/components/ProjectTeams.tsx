import React, { useState, useEffect, useCallback } from 'react';
import type { ProjectTeam, UnassignedStudent } from '../lib/api';
import { getTeams, getUnassignedStudents, shuffleTeams, reshuffleTeams, deleteTeam } from '../lib/api';
import TeamCard from './TeamCard';

interface ProjectTeamsProps {
  projectNumber: number;
  semesterId: string;
  adminId: string;
  onTeamChange?: () => void;
  onShuffleRef?: (shuffleFn: () => void) => void;
}

const ProjectTeams: React.FC<ProjectTeamsProps> = ({
  projectNumber,
  semesterId,
  adminId,
  onTeamChange,
  onShuffleRef
}) => {
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams and unassigned students
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsData, studentsData] = await Promise.all([
        getTeams(semesterId, projectNumber),
        getUnassignedStudents(semesterId, projectNumber)
      ]);

      setTeams(teamsData);
      setUnassignedStudents(studentsData);
    } catch (err: any) {
      console.error('Error loading project teams data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [semesterId, projectNumber]);

  // Handle team shuffling
  const handleShuffle = useCallback(async () => {
    const hasExistingTeams = teams.length > 0;
    const totalStudents = teams.reduce((sum, team) => sum + team.member_count, 0) + unassignedStudents.length;

    // Check minimum student requirement
    const minStudentsNeeded = 3;
    if (totalStudents < minStudentsNeeded) {
      alert(`Need at least ${minStudentsNeeded} students to form teams. Currently have ${totalStudents} students.`);
      return;
    }

    // Different confirmation messages for shuffle vs reshuffle
    let confirmMessage;
    let actionType;
    
    if (hasExistingTeams) {
      actionType = 'reshuffle';
      confirmMessage = `Reshuffle teams for Project ${projectNumber}?\n\n` +
        `⚠️ This will DELETE existing teams and create new ones\n\n` +
        `Current: ${teams.length} teams with ${totalStudents} students\n` +
        `• Each new team will have 3-4 members\n` +
        `• Prioritizes 3-member teams over 4-member teams\n` +
        `• Students won't be paired with previous teammates\n\n` +
        `Continue with reshuffle?`;
    } else {
      actionType = 'shuffle';
      if (unassignedStudents.length === 0) {
        alert('No unassigned students to shuffle');
        return;
      }
      
      confirmMessage = `Create teams for Project ${projectNumber}?\n\n` +
        `• ${unassignedStudents.length} unassigned students\n` +
        `• Each team will have 3-4 members\n` +
        `• Prioritizes 3-member teams over 4-member teams\n` +
        `• Students won't be paired with previous teammates\n\n` +
        `Continue?`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setShuffling(true);
      setError(null);

      const response = hasExistingTeams 
        ? await reshuffleTeams({
            admin_id: adminId,
            semester_id: semesterId,
            project_number: projectNumber
          })
        : await shuffleTeams({
            admin_id: adminId,
            semester_id: semesterId,
            project_number: projectNumber
          });

      // Show success message with details
      const successMessage = hasExistingTeams
        ? `✅ Teams reshuffled successfully!\n\n` +
          `📊 Results:\n` +
          `• ${response.data.total_teams} new teams formed\n` +
          `• ${response.data.total_students} students reassigned\n` +
          `• No repeat teammates from previous projects`
        : `✅ Teams created successfully!\n\n` +
          `📊 Results:\n` +
          `• ${response.data.total_teams} teams formed\n` +
          `• ${response.data.total_students} students assigned\n` +
          `• No repeat teammates from previous projects`;
      
      alert(successMessage);
      await loadData();
      if (onTeamChange) {
        onTeamChange();
      }
    } catch (err: any) {
      console.error(`Error ${actionType}ing teams:`, err);
      const errorMessage = err.message.includes('worked together') 
        ? 'Some students have limited pairing options due to previous teams. Try manually adjusting teams or contact admin.'
        : err.message || `Failed to ${actionType} teams`;
      setError(errorMessage);
    } finally {
      setShuffling(false);
    }
  }, [teams, unassignedStudents, semesterId, projectNumber, adminId, onTeamChange]);

  // Expose shuffle function to parent
  useEffect(() => {
    if (onShuffleRef) {
      onShuffleRef(handleShuffle);
    }
  }, [onShuffleRef, handleShuffle]);

  // Handle team deletion
  const handleDeleteTeam = async (teamId: number) => {
    try {
      setError(null);
      await deleteTeam(teamId, adminId);
      alert('Team deleted successfully');
      await loadData();
      if (onTeamChange) {
        onTeamChange();
      }
    } catch (err: any) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading teams...</span>
      </div>
    );
  }

  const totalStudents = teams.reduce((sum, team) => sum + team.member_count, 0) + unassignedStudents.length;
  const hasTeams = teams.length > 0;
  const hasUnassignedStudents = unassignedStudents.length > 0;

  return (
    <div className="space-y-6" data-project={projectNumber}>
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-blue-900">Project {projectNumber} Teams</h3>
            <p className="text-sm text-blue-700 mt-1">
              {teams.length} teams • {totalStudents} total students • {unassignedStudents.length} unassigned
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Team Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              hasTeams 
                ? 'bg-green-100 text-green-800' 
                : hasUnassignedStudents 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {hasTeams ? '✓ Teams Formed' : hasUnassignedStudents ? '⏳ Ready to Form' : '🚫 No Students'}
            </div>

            {/* Secondary Shuffle Button - show when unassigned OR when teams exist for reshuffling */}
            {(hasUnassignedStudents || hasTeams) && (
              <button
                onClick={handleShuffle}
                disabled={shuffling}
                className={`text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm shadow-sm ${
                  hasTeams 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {shuffling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{hasTeams ? 'Reshuffling...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <i className={`fas ${hasTeams ? 'fa-sync-alt' : 'fa-shuffle'}`}></i>
                    <span>{hasTeams ? 'Reshuffle' : 'Shuffle'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Constraint Information */}
        {hasUnassignedStudents && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              Smart Team Formation Rules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                3-4 members per team
              </div>
              <div className="flex items-center text-blue-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                No repeat teammates
              </div>
              <div className="flex items-center text-blue-700">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                Balanced distribution
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <i className="fas fa-exclamation-triangle text-red-400 mt-0.5"></i>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {hasTeams ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.team_id}
              team={team}
              onDelete={handleDeleteTeam}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Teams Formed Yet</h3>
          <p className="text-sm text-gray-600">
            {hasUnassignedStudents 
              ? `${unassignedStudents.length} students are ready to be organized into teams.` 
              : 'No students available for team formation.'
            }
          </p>
        </div>
      )}

      {/* Unassigned Students */}
      {hasUnassignedStudents && (
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="text-md font-semibold text-yellow-900 mb-3">
            Unassigned Students ({unassignedStudents.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {unassignedStudents.map((student) => (
              <div key={student.student_id} className="bg-white rounded-md p-2 border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {student.student_id.substring(0, 1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{student.student_id}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
          <div className="text-sm text-gray-600">Teams</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {teams.reduce((sum, team) => sum + team.member_count, 0)}
          </div>
          <div className="text-sm text-gray-600">Assigned</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{unassignedStudents.length}</div>
          <div className="text-sm text-gray-600">Unassigned</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{totalStudents}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTeams;