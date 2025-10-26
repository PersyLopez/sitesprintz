#!/bin/bash

# Fix&Go Mobile Tire Service - Gmail Test Setup
echo "🔧 Setting up Gmail testing for Fix&Go Mobile Tire Service"
echo ""

# Check if credentials are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Usage: ./setup-gmail-test.sh your-email@company.com your-app-password"
    echo ""
    echo "📋 Steps to get your App Password:"
    echo "1. Go to: https://myaccount.google.com/security"
    echo "2. Enable 2-Step Verification"
    echo "3. Click 'App passwords'"
    echo "4. Generate password for 'Fix&Go Server'"
    echo "5. Copy the 16-character password"
    echo ""
    exit 1
fi

EMAIL_USER="$1"
EMAIL_PASS="$2"
ADMIN_EMAIL="${3:-$EMAIL_USER}"

echo "📧 Setting up Gmail credentials..."
export EMAIL_USER="$EMAIL_USER"
export EMAIL_PASS="$EMAIL_PASS"
export ADMIN_EMAIL="$ADMIN_EMAIL"

echo "✅ Environment variables set:"
echo "   EMAIL_USER: $EMAIL_USER"
echo "   EMAIL_PASS: ${EMAIL_PASS:0:4}****${EMAIL_PASS: -4}"
echo "   ADMIN_EMAIL: $ADMIN_EMAIL"
echo ""

echo "🧪 Testing Gmail connection..."
node test-email.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Gmail setup successful!"
    echo "🚀 You can now run the local development server:"
    echo "   npm run dev"
    echo ""
    echo "📱 Or test the API directly:"
    echo "   curl -X POST http://localhost:3000/api/service-requests \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"name\":\"Test User\",\"phone\":\"555-123-4567\",\"service\":\"emergency\"}'"
else
    echo ""
    echo "❌ Gmail test failed. Please check your credentials."
    echo "💡 Common issues:"
    echo "   - 2-Factor Authentication not enabled"
    echo "   - Using regular password instead of App Password"
    echo "   - Wrong email format"
fi
