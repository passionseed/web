#!/bin/bash

# Cleanup Script for Old Classroom Migration Files
# This script safely removes the old, problematic classroom migration files
# after the new consolidated migrations have been successfully applied.

echo "🧹 Cleaning up old classroom migration files..."

# Array of old migration files to remove
OLD_MIGRATIONS=(
    "20250805000000_create_classroom_system.sql"
    "20250805000001_add_classroom_rls_policies.sql" 
    "20250805000002_fix_rls_recursion.sql"
    "20250805000003_fix_assignment_policy_recursion.sql"
    "20250805000004_complete_rls_fix.sql"
    "20250806000001_fix_classroom_join_rls.sql"
    "20250807000001_fix_uuid_generation.sql"
)

# Migration directory
MIGRATION_DIR="/Users/bunyasit/dev/pseed/supabase/migrations"

echo "📂 Migration directory: $MIGRATION_DIR"

# Check if running from correct directory
if [ ! -d "$MIGRATION_DIR" ]; then
    echo "❌ Error: Migration directory not found at $MIGRATION_DIR"
    echo "   Please run this script from the project root directory."
    exit 1
fi

# Create backup directory
BACKUP_DIR="$MIGRATION_DIR/old_classroom_migrations_backup"
mkdir -p "$BACKUP_DIR"

echo "💾 Creating backup at: $BACKUP_DIR"

# Process each old migration file
for migration in "${OLD_MIGRATIONS[@]}"; do
    file_path="$MIGRATION_DIR/$migration"
    
    if [ -f "$file_path" ]; then
        echo "📦 Backing up: $migration"
        cp "$file_path" "$BACKUP_DIR/"
        
        echo "🗑️  Removing: $migration"
        rm "$file_path"
        
        echo "✅ Cleaned: $migration"
    else
        echo "⚠️  Not found: $migration (already removed or never existed)"
    fi
done

echo ""
echo "🎉 Cleanup completed!"
echo ""
echo "📋 Summary:"
echo "   - Old migration files moved to: $BACKUP_DIR"
echo "   - New consolidated migrations remain:"
echo "     • 20250807120000_create_classroom_system_complete.sql"
echo "     • 20250807120001_classroom_system_enhancements.sql"
echo ""
echo "⚠️  Important Notes:"
echo "   1. The backup files are preserved in case you need to reference them"
echo "   2. Only apply the new migrations to fresh databases"
echo "   3. For existing databases with old migrations, consider:"
echo "      - Running a database reset: supabase db reset"
echo "      - Or manually cleaning up the schema before applying new migrations"
echo ""
echo "🚀 Next steps:"
echo "   1. Verify database schema: supabase db push --local"
echo "   2. Test classroom functionality"
echo "   3. Remove backup directory when confident: rm -rf $BACKUP_DIR"
echo ""
