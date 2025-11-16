#!/bin/bash

# Starter Templates Image Fix Script
# Replaces all invalid local image paths with valid URLs

echo "🔧 Fixing Starter Template Images..."
echo "===================================="

# Count total files to fix
TOTAL_FILES=$(find public/data/templates -name "*.json" -type f | wc -l | tr -d ' ')
echo "📊 Found $TOTAL_FILES template files"
echo ""

# Fix 1: Replace assets/logo.svg with placeholder
echo "1️⃣  Fixing logo references..."
find public/data/templates -name "*.json" -type f -exec sed -i '' 's|"assets/logo.svg"|"https://via.placeholder.com/180x60/3b82f6/ffffff?text=YOUR+LOGO"|g' {} \;
LOGO_FIXED=$(grep -l "via.placeholder.com/180x60" public/data/templates/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "   ✅ Fixed $LOGO_FIXED files"

# Fix 2: Replace assets/hero-placeholder.svg with Unsplash
echo "2️⃣  Fixing hero image references..."
find public/data/templates -name "*.json" -type f -exec sed -i '' 's|"assets/hero-placeholder.svg"|"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200\&q=80"|g' {} \;
HERO_FIXED=$(grep -l "images.unsplash.com" public/data/templates/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "   ✅ Fixed $HERO_FIXED files"

# Fix 3: Check for any remaining assets/ references
echo "3️⃣  Checking for remaining local paths..."
REMAINING=$(grep -l "\"assets/" public/data/templates/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAINING" -gt 0 ]; then
    echo "   ⚠️  Found $REMAINING files with remaining assets/ references"
    grep -l "\"assets/" public/data/templates/*.json 2>/dev/null | head -5
else
    echo "   ✅ No remaining local paths found"
fi

echo ""
echo "===================================="
echo "✅ Image fix complete!"
echo "📊 Summary:"
echo "   - Logo references fixed: $LOGO_FIXED"
echo "   - Hero image references fixed: $HERO_FIXED"
echo "   - Remaining issues: $REMAINING"
echo ""

# Validation
echo "🧪 Running validation..."
echo "Checking if all templates are valid JSON..."

INVALID_JSON=0
for file in public/data/templates/*.json; do
    if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
        echo "   ❌ Invalid JSON: $file"
        INVALID_JSON=$((INVALID_JSON + 1))
    fi
done

if [ $INVALID_JSON -eq 0 ]; then
    echo "   ✅ All templates are valid JSON"
else
    echo "   ⚠️  Found $INVALID_JSON invalid JSON files"
fi

echo ""
echo "🎉 Done! Starter templates are ready to go!"

