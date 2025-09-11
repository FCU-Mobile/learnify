-- Combined team management fixes
-- Migration: 20251211_team_fixes_merged.sql
-- Description: Fix team member count issues and disable recursive trigger
-- This merges: 20251211_fix_team_member_count.sql and 20251211_disable_recursive_trigger.sql

-- =====================================================
-- PART 1: FIX TEAM MEMBER COUNT ISSUES
-- =====================================================
-- Add diagnostic tools to detect duplicate team memberships

-- Create a diagnostic view to see potential duplicate memberships
CREATE OR REPLACE VIEW team_membership_debug AS
SELECT 
    tm.student_id,
    tm.team_id,
    pt.project_number,
    pt.semester_id,
    pt.team_name,
    tm.created_at as joined_at,
    COUNT(*) OVER (PARTITION BY tm.student_id, pt.project_number, pt.semester_id) as team_count_per_project
FROM team_members tm
JOIN project_teams pt ON tm.team_id = pt.id
ORDER BY tm.student_id, pt.project_number, pt.semester_id;

-- Grant permissions
GRANT SELECT ON team_membership_debug TO authenticated;

-- Create a function to check for duplicate team memberships
CREATE OR REPLACE FUNCTION check_duplicate_team_memberships(
    p_semester_id uuid DEFAULT NULL,
    p_project_number integer DEFAULT NULL
)
RETURNS TABLE(
    student_id text,
    project_number integer,
    semester_id uuid,
    team_count bigint,
    team_details jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.student_id,
        pt.project_number,
        pt.semester_id,
        COUNT(DISTINCT tm.team_id) as team_count,
        jsonb_agg(
            jsonb_build_object(
                'team_id', tm.team_id,
                'team_name', pt.team_name,
                'joined_at', tm.created_at
            ) ORDER BY tm.created_at
        ) as team_details
    FROM team_members tm
    JOIN project_teams pt ON tm.team_id = pt.id
    WHERE (p_semester_id IS NULL OR pt.semester_id = p_semester_id)
    AND (p_project_number IS NULL OR pt.project_number = p_project_number)
    GROUP BY tm.student_id, pt.project_number, pt.semester_id
    HAVING COUNT(DISTINCT tm.team_id) > 1
    ORDER BY tm.student_id, pt.project_number;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_duplicate_team_memberships(uuid, integer) TO authenticated;

-- =====================================================
-- PART 2: DISABLE RECURSIVE TRIGGER
-- =====================================================
-- Fix stack depth limit exceeded error caused by infinite recursion

-- Drop the problematic trigger that's causing infinite recursion
DROP TRIGGER IF EXISTS propagate_team_project_score ON submissions;

-- Keep the function but don't auto-trigger it for now
-- TODO: Implement a non-recursive version of team score propagation

-- =====================================================
-- SUMMARY
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== Migration 20251211_team_fixes_merged Complete ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '1. Created diagnostic tools for team membership issues:';
    RAISE NOTICE '   - View: team_membership_debug - shows all memberships with team counts';
    RAISE NOTICE '   - Function: check_duplicate_team_memberships() - finds students in multiple teams';
    RAISE NOTICE '';
    RAISE NOTICE '2. Disabled propagate_team_project_score trigger to fix stack depth errors';
    RAISE NOTICE '   - Team score propagation is now disabled';
    RAISE NOTICE '   - This needs to be re-implemented with a non-recursive approach';
    RAISE NOTICE '';
    RAISE NOTICE 'To check for duplicate team memberships:';
    RAISE NOTICE '  SELECT * FROM team_membership_debug WHERE team_count_per_project > 1;';
    RAISE NOTICE '  SELECT * FROM check_duplicate_team_memberships();';
END $$;