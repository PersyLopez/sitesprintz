#!/bin/bash
cd /Users/persylopez/sitesprintz

# Try to find npm
if command -v npm >/dev/null 2>&1; then
    NPM_CMD=npm
elif [ -f ~/.nvm/nvm.sh ]; then
    source ~/.nvm/nvm.sh
    NPM_CMD=npm
elif [ -f /usr/local/bin/npm ]; then
    NPM_CMD=/usr/local/bin/npm
elif [ -f /opt/homebrew/bin/npm ]; then
    NPM_CMD=/opt/homebrew/bin/npm
else
    echo "❌ npm not found. Please install Node.js first:"
    echo "   brew install node"
    echo "   or visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Found npm: $NPM_CMD"
echo "📦 Installing dependencies..."
$NPM_CMD install

echo ""
echo "🧪 Running tests..."
$NPM_CMD run test:unit 2>&1 | head -50
