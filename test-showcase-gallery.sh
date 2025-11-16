#!/bin/bash
# Showcase Gallery Integration Test
# Tests all endpoints and functionality

echo "🧪 Testing Showcase Gallery Integration"
echo "========================================"
echo ""

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BASE_URL="http://localhost:3000"
SUCCESS=0
FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local data="$5"
  
  echo -n "Testing: $name... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer test-token" \
      -d "$data")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [[ "$status_code" == "$expected_status" ]]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
    FAILED=$((FAILED + 1))
  fi
}

echo "📊 Database Verification"
echo "------------------------"
echo -n "Checking database columns... "
result=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sites' AND column_name IN ('is_public', 'is_featured', 'view_count');" 2>&1)
if [[ "$result" =~ "3" ]]; then
  echo -e "${GREEN}✓ All columns present${NC}"
  SUCCESS=$((SUCCESS + 1))
else
  echo -e "${RED}✗ Columns missing${NC}"
  FAILED=$((FAILED + 1))
fi

echo -n "Checking indexes... "
result=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'sites' AND indexname LIKE 'idx_sites_%public%';" 2>&1)
if [[ "$result" =~ [3-9] ]]; then
  echo -e "${GREEN}✓ Indexes created${NC}"
  SUCCESS=$((SUCCESS + 1))
else
  echo -e "${YELLOW}⚠ Some indexes may be missing${NC}"
fi

echo ""
echo "🌐 API Endpoint Tests"
echo "---------------------"

# Test API endpoints
test_endpoint "Public Gallery List" "GET" "/showcases" "200"
test_endpoint "Gallery with Category Filter" "GET" "/showcases?category=restaurant" "200"
test_endpoint "Gallery with Search" "GET" "/showcases?search=test" "200"
test_endpoint "Gallery with Pagination" "GET" "/showcases?page=1&limit=12" "200"
test_endpoint "Category List" "GET" "/showcases/categories" "200"
test_endpoint "Featured Showcases" "GET" "/showcases/featured?limit=6" "200"
test_endpoint "Sitemap XML" "GET" "/showcases/sitemap.xml" "200"

echo ""
echo "🔒 Authentication Tests"
echo "-----------------------"

# Test authenticated endpoints (expect 401/403 without proper auth)
test_endpoint "Toggle Visibility (no auth)" "PUT" "/api/showcase/testsite/visibility" "401" '{"is_public": true}'

echo ""
echo "📱 Frontend Route Test"
echo "----------------------"
echo -n "Checking React route... "
if grep -q "ShowcaseGallery" src/App.jsx; then
  echo -e "${GREEN}✓ Route configured${NC}"
  SUCCESS=$((SUCCESS + 1))
else
  echo -e "${RED}✗ Route not found${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "📄 File Verification"
echo "--------------------"
files=(
  "src/pages/ShowcaseGallery.jsx"
  "src/pages/ShowcaseGallery.css"
  "server/routes/showcase.routes.js"
  "migrations/add-showcase-gallery-columns.sql"
  "tests/integration/showcase-gallery.test.js"
)

for file in "${files[@]}"; do
  echo -n "Checking $file... "
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    SUCCESS=$((SUCCESS + 1))
  else
    echo -e "${RED}✗ MISSING${NC}"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "Total Tests: $((SUCCESS + FAILED))"
echo -e "${GREEN}Passed: $SUCCESS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Gallery is ready!${NC}"
  echo ""
  echo "🚀 Next steps:"
  echo "  1. Visit http://localhost:5173/showcases to see the gallery"
  echo "  2. Use the API endpoints to manage showcases"
  echo "  3. Deploy to production!"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
  exit 1
fi

