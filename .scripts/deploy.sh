#!/bin/bash

set -e

echo "Deployment started..."

# Pull the latest version of the app
GIT_SSH_COMMAND="ssh -i ~/.ssh/digital_dojo_ed25519 -o StrictHostKeyChecking=no" git pull origin main
echo "New changes copied to server !"

echo "Installing Dependencies..."
npm install --yes

echo "🧬 Running Prisma migrations..."
cd src/
npx prisma db push

echo "🚦 Restarting app with PM2..."
pm2 restart 0 --update-env

echo "✅ Deployment complete!"