@echo off
echo Starting Shango Poly Arbitrage Bot...
echo.

if not exist .env (
    echo [ERROR] .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Installing dependencies...
    npm install
)

echo [INFO] Starting bot...
node index.js

pause
