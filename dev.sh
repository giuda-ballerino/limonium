#!/bin/bash
# Quick script to start Hugo development server

echo "🚀 Starting Hugo development server..."
echo "📍 Site: http://localhost:1313"
echo "📍 CMS: http://localhost:1313/admin/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

hugo server --buildDrafts --navigateToChanged
