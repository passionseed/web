#!/bin/bash

# Production Build Script
# Optimizes the application for production deployment

set -e

echo "🚀 Starting production build process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the project root?"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf dist
rm -rf out

# Install dependencies with production optimizations
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Run linting
echo "🔍 Running linter..."
pnpm lint

# Run tests
echo "🧪 Running tests..."
pnpm test --passWithNoTests

# Optimize images (if not already done)
echo "🖼️  Optimizing images..."
node scripts/optimize-images.js

# Analyze bundle if requested
if [ "$1" = "--analyze" ]; then
    echo "📊 Analyzing bundle size..."
    pnpm build:analyze
else
    # Regular production build
    echo "🏗️  Building for production..."
    NODE_ENV=production pnpm build
fi

# Check build output
if [ -d ".next" ]; then
    echo "✅ Build completed successfully!"
    
    # Show build stats
    echo "📈 Build Statistics:"
    echo "   Build directory size: $(du -sh .next 2>/dev/null || echo 'N/A')"
    echo "   Static files: $(find .next/static -type f 2>/dev/null | wc -l || echo 'N/A')"
    
    # Show largest bundles
    echo "📦 Largest bundles:"
    find .next -name "*.js" -type f -exec ls -la {} + 2>/dev/null | sort -k5 -n | tail -5 || echo "No JS bundles found"
    
    # Production deployment tips
    echo ""
    echo "🚀 Production Deployment Tips:"
    echo "   1. Set up proper environment variables in your deployment platform"
    echo "   2. Enable gzip/brotli compression at the server level"
    echo "   3. Configure CDN for static assets"
    echo "   4. Set up monitoring and error tracking"
    echo "   5. Test the production build locally with 'pnpm start'"
    
else
    echo "❌ Build failed!"
    exit 1
fi

echo "✨ Production build process completed!"