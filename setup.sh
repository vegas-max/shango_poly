#!/bin/bash

echo "Setting up Shango Poly Arbitrage Bot..."
echo

echo "[STEP 1/3] Installing Node.js dependencies..."
npm install
echo

echo "[STEP 2/3] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[INFO] Created .env file from template"
    echo "[IMPORTANT] Please edit .env file with your configuration!"
fi
echo

echo "[STEP 3/3] Setup complete!"
echo

echo "Architecture Overview:"
echo "  Layer 7: EXECUTION         → FlashLoanExecutor"
echo "  Layer 6: TRANSACTION       → Transaction builder"
echo "  Layer 5: VALIDATION        → Opportunity validator"
echo "  Layer 4: CALCULATION       → FlashLoanCalculator"
echo "  Layer 3: ROUTING           → DexInterface"
echo "  Layer 2: PRICE AGGREGATION → PriceOracle"
echo "  Layer 1: DATA FETCH        → OpportunityScanner"
echo

echo "Next steps:"
echo "1. Edit .env file with your RPC URLs and private key"
echo "2. Deploy contracts/FlashLoanArbitrage.sol to Polygon"
echo "3. Update CONTRACT_ADDRESS in .env"
echo "4. Run: node index.js"
echo
