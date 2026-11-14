#!/bin/bash
set -e

echo "=========================================="
echo "KIT GuardianListen — EC2 Setup & Deploy"
echo "Target Host: 3.107.19.180"
echo "=========================================="

# 1. Update and install Node.js 20, Nginx, PM2, Unzip
echo "==> Installing Node.js, Nginx & PM2..."
sudo apt update
sudo apt install -y curl unzip nginx

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

sudo npm install -g pm2

# 2. Setup Backend
echo "==> Setting up Backend dependencies..."
cd Backend
npm install

# Start or restart Backend in PM2
pm2 stop kit-guardian || true
pm2 start src/app.js --name "kit-guardian"
pm2 save
pm2 startup || true
cd ..

# 3. Setup Nginx
echo "==> Configuring Nginx reverse proxy..."
CURRENT_DIR=$(pwd)

cat <<EOF | sudo tee /etc/nginx/sites-available/kit-guardian
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name 3.107.19.180 _;

    # Serve built React frontend
    root ${CURRENT_DIR}/Frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API calls to backend Express server on port 5000
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 25M;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/kit-guardian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "=========================================="
echo "DEPLOYMENT COMPLETE!"
echo "Open in your browser: http://3.107.19.180"
echo "=========================================="

