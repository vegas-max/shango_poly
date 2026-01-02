#!/bin/bash

echo "Setting up Shango Poly Arbitrage Bot (using Yarn)..."
echo

echo "[STEP 1/4] Installing Node.js dependencies with Yarn..."
if ! command -v yarn &> /dev/null; then
    echo "[ERROR] Yarn is not installed. Please install Yarn first:"
    echo "        npm install -g yarn"
    echo "        OR visit: https://yarnpkg.com/getting-started/install"
    exit 1
fi
yarn install
echo

echo "[STEP 2/4] Building Rust Twin Turbo Engines..."
echo "[INFO] This step requires Rust >= 1.70.0 (install from https://rustup.rs)"
if command -v cargo &> /dev/null; then
    yarn build:rust
    echo "[SUCCESS] Rust engines built successfully"
else
    echo "[WARNING] Rust not found. Install Rust to enable twin turbo engines."
    echo "[WARNING] Without Rust engines, performance will be degraded."
fi
echo

echo "[STEP 3/4] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[INFO] Created .env file from template"
    echo "[IMPORTANT] Please edit .env file with your configuration!"
fi
echo

echo "[STEP 4/4] Setup complete!"
echo

echo "Architecture Overview:"
echo "  Layer 7: EXECUTION         → FlashLoanExecutor"
echo "  Layer 6: TRANSACTION       → Transaction builder"
echo "  Layer 5: VALIDATION        → Opportunity validator"
echo "  Layer 4: CALCULATION       → FlashLoanCalculator"
echo "  Layer 3: ROUTING           → DexInterface"
echo "  Layer 2: PRICE AGGREGATION → PriceOracle + 🦀 TurboAggregator"
echo "  Layer 1: DATA FETCH        → OpportunityScanner + 🦀 TurboScanner"
echo

echo "Next steps:"
echo "1. Edit .env file with your RPC URLs and private key"
echo "2. Deploy contracts/FlashLoanArbitrage.sol to Polygon"
echo "3. Update CONTRACT_ADDRESS in .env"
echo "4. Run: yarn start"
echo
