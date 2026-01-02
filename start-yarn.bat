@echo off
echo Starting Shango Poly Arbitrage Bot (Yarn version)...
echo.

echo Checking Rust engines...
if exist rust-engine\rust-engine.win32-x64-msvc.node (
    echo [OK] Rust engines found
) else (
    echo [WARNING] Rust engines not found. Performance may be degraded.
    echo [INFO] Run: yarn build:rust
)
echo.

echo Starting bot...
yarn start
