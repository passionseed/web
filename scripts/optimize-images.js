#!/usr/bin/env node

/**
 * Script to optimize static images in the public directory
 * Converts PNG images to WebP format for better performance
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { glob } from 'glob'

const PUBLIC_DIR = 'public'
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg']

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...')
  
  // Check if Sharp is available
  try {
    execSync('npm list sharp', { stdio: 'pipe' })
  } catch {
    console.log('📦 Installing Sharp for image optimization...')
    execSync('pnpm add -D sharp', { stdio: 'inherit' })
  }

  // Find all images in public directory
  const imagePatterns = SUPPORTED_FORMATS.map(ext => `${PUBLIC_DIR}/**/*${ext}`)
  const images = await glob(imagePatterns)
  
  console.log(`🔍 Found ${images.length} images to optimize`)
  
  let optimizedCount = 0
  
  for (const imagePath of images) {
    try {
      const ext = path.extname(imagePath).toLowerCase()
      const baseName = path.basename(imagePath, ext)
      const dir = path.dirname(imagePath)
      const webpPath = path.join(dir, `${baseName}.webp`)
      
      // Skip if WebP version already exists
      if (fs.existsSync(webpPath)) {
        console.log(`⏭️  Skipping ${imagePath} (WebP version exists)`)
        continue
      }

      // Get file stats
      const stats = fs.statSync(imagePath)
      const originalSize = stats.size
      
      console.log(`🔄 Optimizing: ${imagePath}`)
      
      // Convert to WebP using Sharp
      const sharp = (await import('sharp')).default
      
      await sharp(imagePath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath)
      
      const webpStats = fs.statSync(webpPath)
      const webpSize = webpStats.size
      const savings = ((originalSize - webpSize) / originalSize * 100).toFixed(1)
      
      console.log(`✅ Created: ${webpPath}`)
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`)
      console.log(`   WebP: ${(webpSize / 1024).toFixed(1)}KB`)
      console.log(`   Saved: ${savings}%`)
      
      optimizedCount++
      
    } catch (error) {
      console.error(`❌ Failed to optimize ${imagePath}:`, error.message)
    }
  }
  
  console.log(`\n📊 Optimization Summary:`)
  console.log(`   Images processed: ${optimizedCount}`)
  console.log(`   Images optimized: ${optimizedCount}`)
  
  if (optimizedCount > 0) {
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Update your components to use next/image with WebP support`)
    console.log(`   2. The original images are preserved as fallbacks`)
    console.log(`   3. Consider updating image references in your code`)
  }
}

optimizeImages().catch(console.error)