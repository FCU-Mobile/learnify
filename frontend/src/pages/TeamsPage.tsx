import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSemester } from '../contexts/SemesterContext';
import { getStudentTeam, getTeams } from '../lib/api';
import type { ProjectTeam } from '../lib/api';

const TeamsPage: React.FC = () => {
  const { studentId } = useAuth();
  const { selectedSemester, availableSemesters } = useSemester();
  const [selectedProject, setSelectedProject] = useState(1);
  const [myTeam, setMyTeam] = useState<ProjectTeam | null>(null);
  const [allTeams, setAllTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current semester data
  const currentSemester = availableSemesters.find(s => s.code === selectedSemester);

  const loadTeamData = async () => {
    if (!studentId || !currentSemester) {
      setError('Unable to load semester information');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load student's team and all teams in parallel
      const [studentTeamData, allTeamsData] = await Promise.all([
        getStudentTeam(studentId, currentSemester.id, selectedProject),
        getTeams(currentSemester.id, selectedProject)
      ]);

      setMyTeam(studentTeamData);
      setAllTeams(allTeamsData);
    } catch (err: any) {
      console.error('Error loading team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [studentId, currentSemester, selectedProject]);

  const MyTeamSection = () => {
    if (!myTeam) {
      return null; // Skip showing anything when not assigned
    }

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-900">My Team</h3>
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {myTeam.member_count} members
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">{myTeam.team_name}</h4>
          <div className="space-y-2">
            {myTeam.members.map((member) => (
              <div
                key={member.student_id}
                className={`flex items-center space-x-3 p-2 rounded-lg ${
                  member.student_id === studentId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  member.student_id === studentId
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
                }`}>
                  {member.student_id.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{member.full_name}</p>
                  <p className="text-sm text-gray-600">{member.student_id}</p>
                </div>
                {member.student_id === studentId && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    You
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AllTeamsSection = () => {
    if (allTeams.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Created</h3>
            <p className="text-gray-600">
              Teams for Project {selectedProject} haven't been created yet.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">All Teams - Project {selectedProject}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {allTeams.length} teams • {allTeams.reduce((sum, team) => sum + team.member_count, 0)} students
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTeams.map((team) => (
              <div
                key={team.team_id}
                className={`border rounded-lg p-4 transition-colors ${
                  team.team_id === myTeam?.team_id
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{team.team_name}</h4>
                  <div className="text-sm text-gray-500">
                    {team.member_count} members
                  </div>
                </div>

                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div key={member.student_id} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${
                        member.student_id === studentId ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${
                          member.student_id === studentId
                            ? 'text-blue-900'
                            : 'text-gray-900'
                        }`}>
                          {member.full_name}
                        </span>
                        <div className={`text-xs ${
                          member.student_id === studentId
                            ? 'text-blue-700'
                            : 'text-gray-600'
                        }`}>
                          {member.student_id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {team.team_id === myTeam?.team_id && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <i className="fas fa-check mr-1"></i>
                      Your Team
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading teams...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <i className="fas fa-exclamation-triangle text-red-400 mt-1"></i>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Error Loading Teams</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">View your team assignments and all project teams</p>
          </div>

          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Project:</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>Project 1</option>
              <option value={2}>Project 2</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* My Team Section */}
          <div>
            <MyTeamSection />
          </div>

          {/* All Teams Section */}
          <div>
            <AllTeamsSection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;