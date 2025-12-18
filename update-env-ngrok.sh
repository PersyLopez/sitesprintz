#!/bin/bash

# Script to update .env with ngrok URL
# Run this script after starting ngrok

NGROK_URL="https://tenurial-subemarginate-fay.ngrok-free.dev"

echo "🔧 Updating .env file with ngrok URL..."
echo ""
echo "Ngrok URL: $NGROK_URL"
echo ""

# Backup current .env
cp .env .env.backup
echo "✅ Backed up current .env to .env.backup"

# Check if APP_URL exists, if not add it
if grep -q "^APP_URL=" .env; then
    # Update existing APP_URL
    sed -i '' "s|^APP_URL=.*|APP_URL=$NGROK_URL|" .env
    echo "✅ Updated APP_URL=$NGROK_URL"
else
    # Add APP_URL
    echo "" >> .env
    echo "# Application URL (use ngrok for webhooks/OAuth)" >> .env
    echo "APP_URL=$NGROK_URL" >> .env
    echo "✅ Added APP_URL=$NGROK_URL"
fi

# Check if GOOGLE_CALLBACK_URL exists
if grep -q "^GOOGLE_CALLBACK_URL=" .env; then
    sed -i '' "s|^GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback|" .env
    echo "✅ Updated GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback"
else
    if grep -q "^GOOGLE_CLIENT_ID=" .env; then
        # Add after Google OAuth config
        sed -i '' "/^GOOGLE_CLIENT_SECRET=/a\\
GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback
" .env
        echo "✅ Added GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback"
    fi
fi

# Update ALLOWED_ORIGINS to include ngrok URL
if grep -q "^ALLOWED_ORIGINS=" .env; then
    # Check if it's empty
    if grep -q "^ALLOWED_ORIGINS=$" .env; then
        sed -i '' "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:3000,$NGROK_URL|" .env
        echo "✅ Updated ALLOWED_ORIGINS to include ngrok URL"
    else
        # Append to existing
        CURRENT_ORIGINS=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2)
        if [[ ! "$CURRENT_ORIGINS" =~ "$NGROK_URL" ]]; then
            sed -i '' "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$CURRENT_ORIGINS,$NGROK_URL|" .env
            echo "✅ Added ngrok URL to ALLOWED_ORIGINS"
        else
            echo "ℹ️  Ngrok URL already in ALLOWED_ORIGINS"
        fi
    fi
fi

echo ""
echo "✅ .env file updated successfully!"
echo ""
echo "📋 Updated values:"
echo "  - APP_URL=$NGROK_URL"
echo "  - GOOGLE_CALLBACK_URL=$NGROK_URL/auth/google/callback"
echo "  - ALLOWED_ORIGINS includes ngrok URL"
echo ""
echo "🔄 Next steps:"
echo "  1. Restart your backend server for changes to take effect"
echo "  2. Update Google OAuth callback URL in Google Console:"
echo "     → https://console.cloud.google.com"
echo "     → Authorized redirect URIs: $NGROK_URL/auth/google/callback"
echo "  3. Update Stripe webhook URL in Stripe Dashboard:"
echo "     → https://dashboard.stripe.com/webhooks"
echo "     → Endpoint URL: $NGROK_URL/api/webhooks/stripe"
echo ""

