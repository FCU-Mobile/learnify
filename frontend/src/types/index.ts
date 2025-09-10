// Re-export all types from API for consistency
export * from '../lib/api';

// Additional type definitions that might be needed across components
export interface TeamFormationStatus {
  project_number: number;
  teams_formed: boolean;
  total_teams: number;
  total_students: number;
  unassigned_students: number;
}

export interface TeamConstraintViolation {
  student_ids: string[];
  violation_type: 'same_team_before' | 'team_size_invalid';
  message: string;
}