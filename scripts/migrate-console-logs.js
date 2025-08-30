#!/usr/bin/env node

/**
 * Script to help migrate console.log statements to the new logger utility
 * Usage: node scripts/migrate-console-logs.js [--dry-run] [--file=path/to/file.ts]
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const DRY_RUN = process.argv.includes('--dry-run')
const SPECIFIC_FILE = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1]

// Patterns to find and replace
const patterns = [
  {
    // console.log("message", data)
    regex: /console\.log\((.*)\)/g,
    replacement: 'logger.info($1)'
  },
  {
    // console.error("message", error)
    regex: /console\.error\((.*)\)/g,
    replacement: 'logger.error($1)'
  },
  {
    // console.warn("message", data)
    regex: /console\.warn\((.*)\)/g,
    replacement: 'logger.warn($1)'
  },
  {
    // console.debug("message", data)
    regex: /console\.debug\((.*)\)/g,
    replacement: 'logger.debug($1)'
  }
]

// Specific patterns for common debug statements
const debugPatterns = [
  {
    // 🔍 DEBUG patterns
    regex: /console\.log\("🔍([^"]*)",\s*([^)]+)\)/g,
    replacement: 'logger.debug("$1", $2)'
  },
  {
    // ✅ Success patterns
    regex: /console\.log\("✅([^"]*)",\s*([^)]+)\)/g,
    replacement: 'logger.info("$1", $2)'
  },
  {
    // ❌ Error patterns
    regex: /console\.log\("❌([^"]*)",\s*([^)]+)\)/g,
    replacement: 'logger.error("$1", $2)'
  },
  {
    // 🗺️ Map-related patterns
    regex: /console\.log\("🗺️([^"]*)",\s*([^)]+)\)/g,
    replacement: 'logger.debug("$1", { ...context, type: "map", data: $2 })'
  },
  {
    // 👥 Team-related patterns
    regex: /console\.log\("👥([^"]*)",\s*([^)]+)\)/g,
    replacement: 'logger.debug("$1", { ...context, type: "team", data: $2 })'
  }
]

async function migrateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    let modifiedContent = content
    let hasChanges = false

    // Check if file already imports logger
    const hasLoggerImport = content.includes('from "@/lib/utils/logger"') || 
                           content.includes('from "../lib/utils/logger"') ||
                           content.includes('from "../../lib/utils/logger"')

    // Apply debug patterns first (more specific)
    debugPatterns.forEach(pattern => {
      if (pattern.regex.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(pattern.regex, pattern.replacement)
        hasChanges = true
      }
    })

    // Apply general patterns
    patterns.forEach(pattern => {
      if (pattern.regex.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(pattern.regex, pattern.replacement)
        hasChanges = true
      }
    })

    // Add import if changes were made and import doesn't exist
    if (hasChanges && !hasLoggerImport) {
      // Find the right import path based on file location
      const relativePath = path.relative(path.dirname(filePath), 'lib/utils/logger')
      const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`
      
      // Add import after existing imports or at the top
      const importStatement = `import { logger } from "@/lib/utils/logger";\n`
      
      if (modifiedContent.includes('import')) {
        // Find the last import and add after it
        const lastImportMatch = modifiedContent.match(/import.*from.*['""];?\n/g)
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1]
          modifiedContent = modifiedContent.replace(lastImport, lastImport + importStatement)
        }
      } else {
        // Add at the very top
        modifiedContent = importStatement + modifiedContent
      }
    }

    if (hasChanges) {
      console.log(`📝 Processing: ${filePath}`)
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, modifiedContent)
        console.log(`✅ Updated: ${filePath}`)
      } else {
        console.log(`🔍 Would update: ${filePath}`)
      }
    }

    return hasChanges
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting console.log migration...')
  
  const files = SPECIFIC_FILE 
    ? [SPECIFIC_FILE]
    : await glob([
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}'
      ], {
        ignore: [
          'node_modules/**',
          '.next/**',
          'dist/**',
          '**/*.d.ts',
          '**/logger.ts', // Don't modify the logger file itself
          '**/migrate-console-logs.js' // Don't modify this script
        ]
      })

  console.log(`📁 Found ${files.length} files to process`)
  
  if (DRY_RUN) {
    console.log('🔍 Running in dry-run mode (no files will be modified)')
  }

  let processedCount = 0
  let updatedCount = 0

  for (const file of files) {
    processedCount++
    const wasUpdated = await migrateFile(file)
    if (wasUpdated) {
      updatedCount++
    }
  }

  console.log(`\n📊 Migration Summary:`)
  console.log(`   Files processed: ${processedCount}`)
  console.log(`   Files updated: ${updatedCount}`)
  
  if (DRY_RUN) {
    console.log('\n💡 Run without --dry-run to apply changes')
  } else {
    console.log('\n✅ Migration completed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Review the changes')
    console.log('   2. Test your application')
    console.log('   3. Commit the changes')
  }
}

main().catch(console.error)