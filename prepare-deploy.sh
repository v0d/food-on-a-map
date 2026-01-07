#!/bin/bash
# Prepares deployment folder for PHP hosting

set -e

DEPLOY_DIR="deploy"

echo "Preparing deployment..."

# Clean and create deploy folder
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/api/data"
mkdir -p "$DEPLOY_DIR/uploads"

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Copy frontend dist
echo "Copying frontend..."
cp -r frontend/dist/* "$DEPLOY_DIR/"

# Copy uploads (if any exist)
if [ -d "frontend/public/uploads" ] && [ "$(ls -A frontend/public/uploads 2>/dev/null)" ]; then
    echo "Copying uploads..."
    cp -r frontend/public/uploads/* "$DEPLOY_DIR/uploads/"
fi

# Copy PHP backend
echo "Copying PHP backend..."
cp backend-php/index.php "$DEPLOY_DIR/api/"
cp backend-php/db.php "$DEPLOY_DIR/api/"
cp backend-php/auth.php "$DEPLOY_DIR/api/"
cp backend-php/.htaccess "$DEPLOY_DIR/api/"

# Copy database (checkpoint WAL first to ensure all data is in main file)
echo "Copying database..."
sqlite3 backend/data/restaurants.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp backend/data/restaurants.db "$DEPLOY_DIR/api/data/"

# Set permissions info
echo ""
echo "================================"
echo "Deployment folder ready: $DEPLOY_DIR/"
echo ""
echo "Structure:"
find "$DEPLOY_DIR" -type f | head -20
echo ""
echo "Upload the contents of '$DEPLOY_DIR/' to your web host root."
echo ""
echo "IMPORTANT: On your host, ensure these are writable:"
echo "  - api/data/          (for database + tokens)"
echo "  - uploads/           (for image uploads)"
echo ""
echo "You may need to run: chmod 755 api/data uploads"
echo "================================"
