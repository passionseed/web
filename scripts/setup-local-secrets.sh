#!/bin/bash

# Setup script for local development secrets
# This script helps developers configure their environment safely

echo "🔧 Setting up local development secrets..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📄 Creating .env.local from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ .env.local created from .env.example"
        echo "⚠️  Please edit .env.local and add your actual API keys"
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
else
    echo "✅ .env.local already exists"
fi

# Check if kilocode mcp.json exists
if [ ! -f ".kilocode/mcp.json" ]; then
    if [ -f ".kilocode/mcp.json.template" ]; then
        echo "📄 Creating .kilocode/mcp.json from template..."
        cp .kilocode/mcp.json.template .kilocode/mcp.json
        echo "✅ .kilocode/mcp.json created from template"
    else
        echo "❌ .kilocode/mcp.json.template not found!"
    fi
else
    echo "✅ .kilocode/mcp.json already exists"
fi

# Check if Supabase is running locally
if command -v supabase &> /dev/null; then
    echo "🚀 Starting Supabase locally to get keys..."
    supabase start
    
    echo ""
    echo "🔑 Supabase keys from local instance:"
    echo "Copy these into your .env.local file:"
    echo ""
    supabase status | grep -E "(API URL|anon key|service_role key)"
    echo ""
    echo "💡 Add SUPABASE_SERVICE_ROLE_KEY to your .env.local with the service_role key above"
else
    echo "⚠️  Supabase CLI not found. Please install it and run 'supabase start' manually"
fi

echo ""
echo "✅ Setup complete! Remember to:"
echo "   - Edit .env.local with your actual API keys"
echo "   - Never commit .env.local or .kilocode/mcp.json to git"
echo "   - Use 'git status' to check what files are staged before committing"