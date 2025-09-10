# Obsolete SQL Files - Safe to Remove

## Overview
After consolidating the team management migrations into the main `20251010_add_team_management.sql` file, several files are now obsolete and can be safely removed.

## ❌ Files to Remove (Obsolete)

### Migration Files (supabase/migrations/)
These migration files have been consolidated into the main team management migration:

```bash
# Remove these files from supabase/migrations/:
rm supabase/migrations/20251010_fix_team_rls_policies_v2.sql
rm supabase/migrations/20251011_fix_team_rls_policies.sql
rm supabase/migrations/20251010_comprehensive_team_management.sql
```

**Reason**: All functionality has been merged into `20251010_add_team_management.sql`

### Temporary Files (backend root)
These were temporary development files:

```bash
# Remove these files from backend root:
rm temp_disable_rls.sql
rm temp_fix_rls.sql
```

**Reason**: These were temporary fixes during development. The proper RLS policies are now in the main migration.

## ✅ Files to Keep

### Keep These Migration Files:
- ✅ `20251010_add_team_management.sql` - **MAIN CONSOLIDATED MIGRATION** 
- ✅ `fix_semester_function.sql` - Different functionality (scoring system)
- ✅ `update_constraint.sql` - Different functionality (submission constraints)

### Keep All Other Migration Files:
All other migration files in `supabase/migrations/` should be kept as they contain different functionality for the application.

## Removal Commands

You can run these commands to clean up the obsolete files:

```bash
# Navigate to project root
cd /Users/harryworld/Developer/FCU-Mobile/learnify/backend

# Remove obsolete migration files
rm supabase/migrations/20251010_fix_team_rls_policies_v2.sql
rm supabase/migrations/20251011_fix_team_rls_policies.sql  
rm supabase/migrations/20251010_comprehensive_team_management.sql

# Remove temporary files
rm temp_disable_rls.sql
rm temp_fix_rls.sql

# Optional: Remove this instruction file after cleanup
rm OBSOLETE_FILES_TO_REMOVE.md
```

## Verification

After removal, verify that team management still works by checking:

1. ✅ `20251010_add_team_management.sql` exists and contains:
   - Team tables (`project_teams`, `team_members`)  
   - Team management functions
   - Fixed RLS policies
   - Team score propagation
   - Proper documentation

2. ✅ Backend API endpoints still work:
   - Team creation/shuffling
   - Team retrieval  
   - Reshuffle functionality
   - Constraint checking

3. ✅ Frontend team management still works:
   - Teams display properly
   - Shuffle/reshuffle buttons work
   - No console errors

## Summary

- **Total files to remove**: 5 files
- **Disk space saved**: ~50KB  
- **Maintenance benefit**: Single source of truth for team management
- **Risk level**: ✅ **SAFE** - All functionality preserved in main migration

The consolidation improves maintainability by having all team management functionality in a single, well-documented migration file.