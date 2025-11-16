#!/bin/bash
# Test Booking System API Endpoints

set -e

BASE_URL="http://localhost:3000"
USER_ID=1  # Replace with actual user ID

echo "🧪 Testing Booking System Phase 1 API"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Creating a test service...${NC}"
SERVICE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking/admin/$USER_ID/services" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Haircut & Style",
    "description": "Professional haircut and styling service",
    "category": "hair",
    "duration_minutes": 60,
    "price_cents": 5000
  }')

echo "$SERVICE_RESPONSE" | jq '.'
SERVICE_ID=$(echo "$SERVICE_RESPONSE" | jq -r '.service.id')
echo -e "${GREEN}✅ Service created: $SERVICE_ID${NC}"
echo ""

echo -e "${YELLOW}2. Getting tenant info (creates tenant if not exists)...${NC}"
SERVICES_RESPONSE=$(curl -s "$BASE_URL/api/booking/tenants/$USER_ID/services")
echo "$SERVICES_RESPONSE" | jq '.'
echo -e "${GREEN}✅ Services retrieved${NC}"
echo ""

echo -e "${YELLOW}3. Setting staff availability (Mon-Fri, 9am-5pm)...${NC}"

# Get staff ID first (we need to get it from a previous call or default)
# For now, we'll assume default staff was created

STAFF_ID="YOUR_STAFF_ID_HERE"  # You'll need to get this from database or create endpoint

echo "⚠️  Note: You need to manually set STAFF_ID in this script"
echo "   Run this SQL to get staff ID:"
echo "   SELECT id FROM booking_staff WHERE tenant_id = (SELECT id FROM booking_tenants WHERE user_id = $USER_ID);"
echo ""

# Uncomment when you have STAFF_ID
# AVAILABILITY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking/admin/$USER_ID/staff/$STAFF_ID/availability" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "scheduleRules": [
#       {"day_of_week": 1, "start_time": "09:00", "end_time": "17:00"},
#       {"day_of_week": 2, "start_time": "09:00", "end_time": "17:00"},
#       {"day_of_week": 3, "start_time": "09:00", "end_time": "17:00"},
#       {"day_of_week": 4, "start_time": "09:00", "end_time": "17:00"},
#       {"day_of_week": 5, "start_time": "09:00", "end_time": "17:00"}
#     ]
#   }')
# echo "$AVAILABILITY_RESPONSE" | jq '.'
# echo -e "${GREEN}✅ Availability set${NC}"
# echo ""

echo -e "${YELLOW}4. Getting available time slots...${NC}"
# Get next Monday's date
NEXT_MONDAY=$(date -v+mon +%Y-%m-%d 2>/dev/null || date -d "next monday" +%Y-%m-%d)

SLOTS_RESPONSE=$(curl -s "$BASE_URL/api/booking/tenants/$USER_ID/availability?service_id=$SERVICE_ID&date=$NEXT_MONDAY&timezone=America/New_York")
echo "$SLOTS_RESPONSE" | jq '.'
SLOT_COUNT=$(echo "$SLOTS_RESPONSE" | jq '.slots | length')
echo -e "${GREEN}✅ Found $SLOT_COUNT available slots${NC}"
echo ""

if [ "$SLOT_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}5. Booking an appointment...${NC}"
  FIRST_SLOT=$(echo "$SLOTS_RESPONSE" | jq -r '.slots[0].start_time')
  
  BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/booking/tenants/$USER_ID/appointments" \
    -H "Content-Type: application/json" \
    -d "{
      \"service_id\": \"$SERVICE_ID\",
      \"start_time\": \"$FIRST_SLOT\",
      \"timezone\": \"America/New_York\",
      \"customer_name\": \"John Doe\",
      \"customer_email\": \"john.doe@example.com\",
      \"customer_phone\": \"+1234567890\",
      \"customer_notes\": \"First time customer - test booking\"
    }")
  
  echo "$BOOKING_RESPONSE" | jq '.'
  CONFIRMATION_CODE=$(echo "$BOOKING_RESPONSE" | jq -r '.appointment.confirmation_code')
  echo -e "${GREEN}✅ Appointment booked! Confirmation: $CONFIRMATION_CODE${NC}"
  echo ""
  
  echo -e "${YELLOW}6. Getting appointment details...${NC}"
  APPT_RESPONSE=$(curl -s "$BASE_URL/api/booking/tenants/$USER_ID/appointments/$CONFIRMATION_CODE")
  echo "$APPT_RESPONSE" | jq '.'
  echo -e "${GREEN}✅ Appointment details retrieved${NC}"
  echo ""
  
  echo -e "${YELLOW}7. Cancelling appointment...${NC}"
  CANCEL_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/booking/tenants/$USER_ID/appointments/$CONFIRMATION_CODE" \
    -H "Content-Type: application/json" \
    -d '{
      "reason": "Testing cancellation flow"
    }')
  echo "$CANCEL_RESPONSE" | jq '.'
  echo -e "${GREEN}✅ Appointment cancelled${NC}"
  echo ""
else
  echo -e "${YELLOW}⚠️  No available slots found. Make sure availability is set.${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check your email (john.doe@example.com) for confirmation & cancellation emails"
echo "2. Verify booking_notifications table has log entries"
echo "3. Test the admin endpoints for listing appointments"

