#!/bin/bash

# Script to combine all SQL migration files into one markdown file
# Usage: ./combine_migrations.sh

MIGRATIONS_DIR="supabase/migrations"
OUTPUT_FILE="all_migrations.md"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: $MIGRATIONS_DIR directory not found"
    exit 1
fi

# Start the markdown file
echo "# All Database Migrations" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "This file contains all SQL migration files combined for easy reference and manual execution if needed." >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Generated on:** $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "🔄 Combining migration files from $MIGRATIONS_DIR..."

# Counter for migrations
count=0

# Loop through all .sql files in migrations directory, sorted by filename
for sql_file in $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort); do
    # Get just the filename without path
    filename=$(basename "$sql_file")
    
    # Skip if it's not a proper migration format (timestamp_name.sql)
    if [[ ! "$filename" =~ ^[0-9]{14}_.*\.sql$ ]]; then
        echo "⚠️  Skipping $filename (doesn't match migration pattern)"
        continue
    fi
    
    echo "📄 Adding $filename..."
    
    # Add the file header
    cat >> "$OUTPUT_FILE" << EOF

## Migration: $filename

\`\`\`sql
EOF
    
    # Add the SQL content
    cat "$sql_file" >> "$OUTPUT_FILE"
    
    # Close the code block
    cat >> "$OUTPUT_FILE" << 'EOF'
```

---

EOF
    
    ((count++))
done

# Add summary at the end
cat >> "$OUTPUT_FILE" << EOF

## Summary

- **Total migrations processed:** $count
- **Generated on:** $(date)
- **Source directory:** $MIGRATIONS_DIR

### Manual Execution Notes

If you need to manually run these migrations:

1. Connect to your database
2. Copy and paste each migration SQL block individually
3. Run them in chronological order (by timestamp in filename)
4. Check for any errors before proceeding to the next migration

### Important
- Always backup your database before running migrations manually
- These migrations may have already been applied to your database
- Check your \`supabase_migrations.schema_migrations\` table to see which migrations have been applied
EOF

echo "✅ Successfully combined $count migration files into $OUTPUT_FILE"
echo "📁 Output file: $OUTPUT_FILE"
