#!/bin/bash

# Employee Report System - Setup and Testing Guide

echo "=========================================="
echo "Employee Report System - Setup Guide"
echo "=========================================="
echo ""

# 1. Check if .env files exist
echo "1. Checking environment configuration..."
if [ -f "server/.env" ]; then
    echo "✓ Server .env exists"
else
    echo "✗ Server .env missing - Create from server/.env.example"
    echo "  Required variables:"
    echo "    - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo "    - JWT_SECRET"
    echo "    - NODE_ENV (development or production)"
fi

if [ -f "client/.env.local" ]; then
    echo "✓ Client .env.local exists"
else
    echo "✗ Client .env.local missing - Create with:"
    echo "  REACT_APP_API_URL=http://localhost:5000/api"
    echo "  REACT_APP_SOCKET_URL=http://localhost:5000"
fi

echo ""
echo "2. Installing dependencies..."
echo ""

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
echo "✓ Server dependencies installed"

cd ../client
echo "Installing client dependencies..."
npm install
echo "✓ Client dependencies installed"

cd ..
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Database Setup:"
echo "   cd server"
echo "   npm run migrate"
echo ""
echo "2. Start the servers:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   cd server"
echo "   npm run dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   cd client"
echo "   npm start"
echo ""
echo "3. Access the application:"
echo "   - Admin: http://localhost:3000 (login: admin@example.com / Admin@123)"
echo "   - Employee: Create an account or use existing employee account"
echo ""
echo "4. Test the Reports Feature:"
echo "   - Employee: Click 'Reports' → 'New Report' → Fill form → Submit"
echo "   - Admin: Click 'Reports' → View reports → Click 'View' → Update status"
echo ""
echo "=========================================="
