#!/bin/bash

# Setup script for VPS
# Run this once on the VPS to install all dependencies

echo "🔧 Setting up VPS environment..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js (if not installed)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Docker (if not installed)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed: $(docker --version)"
else
    echo "✅ Docker already installed: $(docker --version)"
fi

# Install Docker Compose (if not installed)
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed: $(docker-compose --version)"
else
    echo "✅ Docker Compose already installed: $(docker-compose --version)"
fi

# Install PM2 (if not installed)
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 installed: $(pm2 --version)"
else
    echo "✅ PM2 already installed: $(pm2 --version)"
fi

echo ""
echo "✅ Setup completed!"
echo ""
echo "⚠️  IMPORTANT: If Docker was just installed, you may need to logout and login again"
echo "   for the docker group to take effect. Then run:"
echo "   cd ~/temp-message && npm install && docker-compose up -d && pm2 start ecosystem.config.js"
echo ""
echo "Installed versions:"
node --version
npm --version
docker --version
docker-compose --version
pm2 --version

