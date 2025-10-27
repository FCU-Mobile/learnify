import React, { useState } from 'react';
import ProjectTeams from './ProjectTeams';

interface TeamManagementProps {
  semesterId: string;
  adminId: string;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ semesterId, adminId }) => {
  const [activeProject, setActiveProject] = useState(1);

  return (
    <div className="space-y-6">
      {/* Project Navigation - 2 Project System */}
      <div className="flex space-x-4">
        {[1, 2].map(projectNum => (
          <button
            key={projectNum}
            onClick={() => setActiveProject(projectNum)}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeProject === projectNum
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Project {projectNum} {projectNum === 1 ? '(Midterm - Team)' : '(Final - Individual)'}
          </button>
        ))}
      </div>

      {/* Project Teams */}
      <ProjectTeams
        projectNumber={activeProject}
        semesterId={semesterId}
        adminId={adminId}
      />
    </div>
  );
};

export default TeamManagement;