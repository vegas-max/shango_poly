# Shango Poly - Setup Guide

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- An Ethereum wallet with MATIC tokens for gas
- A Polygon RPC endpoint (e.g., from Alchemy, Infura, or QuickNode)

## Installation Steps

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd shango_poly

# Run the setup script
# On Linux/Mac:
chmod +x setup.sh
./setup.sh

# On Windows:
install.bat
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key_here
MIN_PROFIT_BPS=50
MAX_GAS_PRICE_GWEI=150
```

### 3. Deploy Smart Contract

Before running the bot, deploy the flash loan arbitrage contract:

```bash
# Install Hardhat if not already installed
npm install --save-dev hardhat

# Deploy to Polygon (requires MATIC for gas)
npx hardhat run scripts/deploy.js --network polygon
```

Update `CONTRACT_ADDRESS` in `.env` with the deployed address.

### 4. Start the Bot

```bash
# On Linux/Mac:
node index.js

# On Windows:
start.bat
```

## Architecture

The system is built **BACKWARDS** from execution to data fetch:

```
Layer 7: EXECUTION         → FlashLoanExecutor (executes trades)
Layer 6: TRANSACTION       → Transaction builder & gas manager
Layer 5: VALIDATION        → Opportunity validator
Layer 4: CALCULATION       → FlashLoanCalculator (optimal sizing)
Layer 3: ROUTING           → DexInterface (route finding)
Layer 2: PRICE AGGREGATION → PriceOracle (price aggregation)
Layer 1: DATA FETCH        → OpportunityScanner (price scanning)
```

Each layer is optimized for the needs of the layer above it.

## Testing

Start with testnet (Polygon Mumbai) first:

1. Get Mumbai MATIC from faucet
2. Update `POLYGON_RPC_URL` to Mumbai RPC
3. Deploy contract to Mumbai
4. Test with small amounts

## Security

- Never commit your `.env` file
- Use a dedicated wallet for trading
- Start with small amounts
- Monitor gas prices carefully
- Set reasonable `MIN_PROFIT_BPS` and `MAX_GAS_PRICE_GWEI`

## Next Steps

See:
- [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
